import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import type {
  ActivationContract,
  GameToken,
  KeyCoin,
  Marketplace,
} from "../typechain-types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOKEN_ID = 1n;
const ROYALTY_BPS = 1000n; // 10 %
const KEY_RATE = 1n; // 1 KEY per wei (simplifies arithmetic in tests)

function buildMachineHash(value: string): `0x${string}` {
  return ethers.keccak256(ethers.toUtf8Bytes(value)) as `0x${string}`;
}

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

async function deployMarketplaceFixture() {
  const [deployer, vendor, seller, buyer, otherUser] =
    await ethers.getSigners();

  // 1. KeyCoin 
  const KeyCoinFactory = await ethers.getContractFactory("KeyCoin");
  const keyCoin = (await KeyCoinFactory.connect(deployer).deploy(
    KEY_RATE
  )) as unknown as KeyCoin;
  await keyCoin.waitForDeployment();

  //  2. GameToken 
  const GameTokenFactory = await ethers.getContractFactory("GameToken");
  const gameToken = (await GameTokenFactory.connect(
    deployer
  ).deploy()) as unknown as GameToken;
  await gameToken.waitForDeployment();

  //  3. ActivationContract 
  const ActivationFactory = await ethers.getContractFactory("ActivationContract");
  const activation = (await ActivationFactory.connect(deployer).deploy(
    await gameToken.getAddress()
  )) as unknown as ActivationContract;
  await activation.waitForDeployment();

  //  4. Marketplace  
  const MarketplaceFactory = await ethers.getContractFactory("Marketplace");
  const marketplace = (await MarketplaceFactory.connect(deployer).deploy(
    await keyCoin.getAddress(),
    await gameToken.getAddress(),
    await activation.getAddress()
  )) as unknown as Marketplace;
  await marketplace.waitForDeployment();

  //  5. Grant MINTER_ROLE to deployer for direct mint in tests 
  const MINTER_ROLE = await gameToken.MINTER_ROLE();
  await gameToken.connect(deployer).grantRole(MINTER_ROLE, deployer.address);

  //  6. Create game (tokenId=1, vendor, 10% royalty) 
  await gameToken
    .connect(deployer)
    .createGame(TOKEN_ID, vendor.address, ROYALTY_BPS, "ipfs://game-1");

  //  7. Mint one license to seller 
  await gameToken.connect(deployer).mint(seller.address, TOKEN_ID);

  //  8. Fund buyer with KEY via buyKeyCoin() 
  //    rate=1 → send 10_000 wei → buyer receives 10_000 KEY units
  const BUYER_KEY = 10_000n;
  await keyCoin.connect(buyer).buyKeyCoin({ value: BUYER_KEY });

  //  9. Buyer approves Marketplace to spend KEY 
  await keyCoin
    .connect(buyer)
    .approve(await marketplace.getAddress(), ethers.MaxUint256);

  //  10. Seller approves Marketplace to transfer ERC-1155 
  await gameToken
    .connect(seller)
    .setApprovalForAll(await marketplace.getAddress(), true);

  return {
    deployer,
    vendor,
    seller,
    buyer,
    otherUser,
    keyCoin,
    gameToken,
    activation,
    marketplace,
    MINTER_ROLE,
    BUYER_KEY,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Marketplace", () => {
  // -------------------------------------------------------------------------
  // 1. Deployment
  // -------------------------------------------------------------------------
  describe("Deployment", () => {
    it("stores the correct KeyCoin address", async () => {
      const { marketplace, keyCoin } = await loadFixture(
        deployMarketplaceFixture
      );
      expect(await marketplace.keyCoin()).to.equal(
        await keyCoin.getAddress()
      );
    });

    it("stores the correct GameToken address", async () => {
      const { marketplace, gameToken } = await loadFixture(
        deployMarketplaceFixture
      );
      expect(await marketplace.gameToken()).to.equal(
        await gameToken.getAddress()
      );
    });

    it("stores the correct ActivationContract address", async () => {
      const { marketplace, activation } = await loadFixture(
        deployMarketplaceFixture
      );
      expect(await marketplace.activation()).to.equal(
        await activation.getAddress()
      );
    });

    it("getListing on a non-existent id returns zeroed struct", async () => {
      const { marketplace } = await loadFixture(deployMarketplaceFixture);
      const listing = await marketplace.getListing(999n);
      expect(listing.isOpen).to.be.false;
      expect(listing.seller).to.equal(ethers.ZeroAddress);
      expect(listing.price).to.equal(0n);
    });
  });

  // -------------------------------------------------------------------------
  // 2. listLicense()
  // -------------------------------------------------------------------------
  describe("listLicense()", () => {
    it("succeeds when seller owns an inactive license", async () => {
      const { marketplace, seller } = await loadFixture(
        deployMarketplaceFixture
      );
      await expect(
        marketplace.connect(seller).listLicense(TOKEN_ID, 500n)
      ).to.not.be.reverted;
    });

    it("stores listing with correct seller, tokenId, price and isOpen=true", async () => {
      const { marketplace, seller } = await loadFixture(
        deployMarketplaceFixture
      );
      const PRICE = 500n;
      await marketplace.connect(seller).listLicense(TOKEN_ID, PRICE);

      const listing = await marketplace.getListing(1n);
      expect(listing.tokenId).to.equal(TOKEN_ID);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.price).to.equal(PRICE);
      expect(listing.isOpen).to.be.true;
    });

    it("escrows the ERC-1155 unit into Marketplace", async () => {
      const { marketplace, gameToken, seller } = await loadFixture(
        deployMarketplaceFixture
      );
      await marketplace.connect(seller).listLicense(TOKEN_ID, 500n);

      expect(
        await gameToken.balanceOf(await marketplace.getAddress(), TOKEN_ID)
      ).to.equal(1n);
      expect(
        await gameToken.balanceOf(seller.address, TOKEN_ID)
      ).to.equal(0n);
    });

    it("reverts with 'Marketplace: license active' when license is active in ActivationContract", async () => {
      const { marketplace, activation, seller } = await loadFixture(
        deployMarketplaceFixture
      );
      const machineHash = buildMachineHash("machine-001");
      await activation
        .connect(seller)
        .activateLicense(TOKEN_ID, machineHash);

      await expect(
        marketplace.connect(seller).listLicense(TOKEN_ID, 500n)
      ).to.be.revertedWith("Marketplace: license active");
    });

    it("reverts when seller does not own the license (no ERC-1155 balance)", async () => {
      const { marketplace, otherUser } = await loadFixture(
        deployMarketplaceFixture
      );
      // otherUser has no license, safeTransferFrom will revert from ERC-1155
      await expect(
        marketplace.connect(otherUser).listLicense(TOKEN_ID, 500n)
      ).to.be.reverted;
    });

    it("reverts when seller has not approved Marketplace for ERC-1155", async () => {
      const { marketplace, gameToken, deployer } = await loadFixture(
        deployMarketplaceFixture
      );
      // Mint a license to a fresh signer who never set approval
      const [, , , , , noApprovalSeller] = await ethers.getSigners();
      await gameToken.connect(deployer).mint(noApprovalSeller.address, TOKEN_ID);

      await expect(
        marketplace.connect(noApprovalSeller).listLicense(TOKEN_ID, 500n)
      ).to.be.reverted;
    });

    it("increments listingId for each new listing", async () => {
      const { marketplace, gameToken, deployer, seller } = await loadFixture(
        deployMarketplaceFixture
      );

      // Mint a second license so seller can list twice
      await gameToken.connect(deployer).mint(seller.address, TOKEN_ID);

      await marketplace.connect(seller).listLicense(TOKEN_ID, 100n);
      await marketplace.connect(seller).listLicense(TOKEN_ID, 200n);

      const listing1 = await marketplace.getListing(1n);
      const listing2 = await marketplace.getListing(2n);
      expect(listing1.price).to.equal(100n);
      expect(listing2.price).to.equal(200n);
    });

    it("can list with price = 0 (no price > 0 guard in contract)", async () => {
      // NOTE: Marketplace.sol has no require(price > 0) check.
      // Listing with price=0 is therefore valid at the contract level.
      const { marketplace, seller } = await loadFixture(
        deployMarketplaceFixture
      );
      await expect(
        marketplace.connect(seller).listLicense(TOKEN_ID, 0n)
      ).to.not.be.reverted;
    });
  });

  // -------------------------------------------------------------------------
  // 3. cancelListing()
  // -------------------------------------------------------------------------
  describe("cancelListing()", () => {
    it("seller can cancel an open listing", async () => {
      const { marketplace, seller } = await loadFixture(
        deployMarketplaceFixture
      );
      await marketplace.connect(seller).listLicense(TOKEN_ID, 500n);

      await expect(
        marketplace.connect(seller).cancelListing(1n)
      ).to.not.be.reverted;
    });

    it("listing is closed after cancel (isOpen = false)", async () => {
      const { marketplace, seller } = await loadFixture(
        deployMarketplaceFixture
      );
      await marketplace.connect(seller).listLicense(TOKEN_ID, 500n);
      await marketplace.connect(seller).cancelListing(1n);

      const listing = await marketplace.getListing(1n);
      expect(listing.isOpen).to.be.false;
    });

    it("license is returned to seller after cancel", async () => {
      const { marketplace, gameToken, seller } = await loadFixture(
        deployMarketplaceFixture
      );
      await marketplace.connect(seller).listLicense(TOKEN_ID, 500n);
      await marketplace.connect(seller).cancelListing(1n);

      expect(await gameToken.balanceOf(seller.address, TOKEN_ID)).to.equal(1n);
      expect(
        await gameToken.balanceOf(await marketplace.getAddress(), TOKEN_ID)
      ).to.equal(0n);
    });

    it("reverts with 'Marketplace: not seller' when a non-seller tries to cancel", async () => {
      const { marketplace, seller, otherUser } = await loadFixture(
        deployMarketplaceFixture
      );
      await marketplace.connect(seller).listLicense(TOKEN_ID, 500n);

      await expect(
        marketplace.connect(otherUser).cancelListing(1n)
      ).to.be.revertedWith("Marketplace: not seller");
    });

    it("reverts with 'Marketplace: not open' when listing is already closed", async () => {
      const { marketplace, seller } = await loadFixture(
        deployMarketplaceFixture
      );
      await marketplace.connect(seller).listLicense(TOKEN_ID, 500n);
      await marketplace.connect(seller).cancelListing(1n);

      await expect(
        marketplace.connect(seller).cancelListing(1n)
      ).to.be.revertedWith("Marketplace: not open");
    });

    it("reverts with 'Marketplace: not open' when listing was already bought", async () => {
      const { marketplace, seller, buyer } = await loadFixture(
        deployMarketplaceFixture
      );
      await marketplace.connect(seller).listLicense(TOKEN_ID, 500n);
      await marketplace.connect(buyer).buyLicense(1n);

      await expect(
        marketplace.connect(seller).cancelListing(1n)
      ).to.be.revertedWith("Marketplace: not open");
    });

    it("reverts with 'Marketplace: not open' on a non-existent listing id", async () => {
      const { marketplace, seller } = await loadFixture(
        deployMarketplaceFixture
      );
      await expect(
        marketplace.connect(seller).cancelListing(999n)
      ).to.be.revertedWith("Marketplace: not open");
    });
  });

  // -------------------------------------------------------------------------
  // 4. buyLicense()
  // -------------------------------------------------------------------------
  describe("buyLicense()", () => {
    it("buyer can purchase an open listing", async () => {
      const { marketplace, seller, buyer } = await loadFixture(
        deployMarketplaceFixture
      );
      await marketplace.connect(seller).listLicense(TOKEN_ID, 500n);

      await expect(
        marketplace.connect(buyer).buyLicense(1n)
      ).to.not.be.reverted;
    });

    it("listing isOpen becomes false after purchase", async () => {
      const { marketplace, seller, buyer } = await loadFixture(
        deployMarketplaceFixture
      );
      await marketplace.connect(seller).listLicense(TOKEN_ID, 500n);
      await marketplace.connect(buyer).buyLicense(1n);

      const listing = await marketplace.getListing(1n);
      expect(listing.isOpen).to.be.false;
    });

    it("license is transferred from escrow to buyer", async () => {
      const { marketplace, gameToken, seller, buyer } = await loadFixture(
        deployMarketplaceFixture
      );
      await marketplace.connect(seller).listLicense(TOKEN_ID, 500n);
      await marketplace.connect(buyer).buyLicense(1n);

      expect(await gameToken.balanceOf(buyer.address, TOKEN_ID)).to.equal(1n);
      expect(
        await gameToken.balanceOf(await marketplace.getAddress(), TOKEN_ID)
      ).to.equal(0n);
    });

    it("royalty distribution: vendor receives royalty, seller receives remainder", async () => {
      const { marketplace, keyCoin, seller, buyer, vendor } =
        await loadFixture(deployMarketplaceFixture);

      // price = 1000 KEY units, royaltyBps = 1000 (10%) → royalty = 100
      const PRICE = 1000n;
      const EXPECTED_ROYALTY = (PRICE * ROYALTY_BPS) / 10_000n; // 100n
      const EXPECTED_SELLER = PRICE - EXPECTED_ROYALTY; // 900n

      await marketplace.connect(seller).listLicense(TOKEN_ID, PRICE);

      const vendorBefore = await keyCoin.balanceOf(vendor.address);
      const sellerBefore = await keyCoin.balanceOf(seller.address);
      const buyerBefore = await keyCoin.balanceOf(buyer.address);

      await marketplace.connect(buyer).buyLicense(1n);

      expect(await keyCoin.balanceOf(vendor.address)).to.equal(
        vendorBefore + EXPECTED_ROYALTY
      );
      expect(await keyCoin.balanceOf(seller.address)).to.equal(
        sellerBefore + EXPECTED_SELLER
      );
      expect(await keyCoin.balanceOf(buyer.address)).to.equal(
        buyerBefore - PRICE
      );
    });

    it("emits RoyaltyPaid with correct tokenId, vendor and royalty amount", async () => {
      const { marketplace, seller, buyer, vendor } = await loadFixture(
        deployMarketplaceFixture
      );
      const PRICE = 1000n;
      const EXPECTED_ROYALTY = (PRICE * ROYALTY_BPS) / 10_000n;

      await marketplace.connect(seller).listLicense(TOKEN_ID, PRICE);

      await expect(marketplace.connect(buyer).buyLicense(1n))
        .to.emit(marketplace, "RoyaltyPaid")
        .withArgs(TOKEN_ID, vendor.address, EXPECTED_ROYALTY);
    });

    it("reverts with 'Marketplace: not open' on a non-existent listing", async () => {
      const { marketplace, buyer } = await loadFixture(
        deployMarketplaceFixture
      );
      await expect(
        marketplace.connect(buyer).buyLicense(999n)
      ).to.be.revertedWith("Marketplace: not open");
    });

    it("reverts with 'Marketplace: not open' when listing is already sold", async () => {
      const { marketplace, seller, buyer, otherUser, keyCoin } =
        await loadFixture(deployMarketplaceFixture);

      // Fund otherUser with KEY
      await keyCoin.connect(otherUser).buyKeyCoin({ value: 10_000n });
      await keyCoin
        .connect(otherUser)
        .approve(await marketplace.getAddress(), ethers.MaxUint256);

      await marketplace.connect(seller).listLicense(TOKEN_ID, 500n);
      await marketplace.connect(buyer).buyLicense(1n);

      await expect(
        marketplace.connect(otherUser).buyLicense(1n)
      ).to.be.revertedWith("Marketplace: not open");
    });

    it("reverts with 'Marketplace: not open' when listing was cancelled", async () => {
      const { marketplace, seller, buyer } = await loadFixture(
        deployMarketplaceFixture
      );
      await marketplace.connect(seller).listLicense(TOKEN_ID, 500n);
      await marketplace.connect(seller).cancelListing(1n);

      await expect(
        marketplace.connect(buyer).buyLicense(1n)
      ).to.be.revertedWith("Marketplace: not open");
    });

    it("reverts when buyer has insufficient KEY balance", async () => {
      const { marketplace, keyCoin, seller } = await loadFixture(
        deployMarketplaceFixture
      );

      // Create a broke buyer with 0 KEY
      const [, , , , , , brokeBuyer] = await ethers.getSigners();
      await keyCoin
        .connect(brokeBuyer)
        .approve(await marketplace.getAddress(), ethers.MaxUint256);

      await marketplace.connect(seller).listLicense(TOKEN_ID, 500n);

      await expect(
        marketplace.connect(brokeBuyer).buyLicense(1n)
      ).to.be.reverted; // ERC-20 SafeTransferFrom will revert
    });

    it("reverts when buyer has not approved Marketplace to spend KEY", async () => {
      const { marketplace, keyCoin, seller } = await loadFixture(
        deployMarketplaceFixture
      );

      // New buyer with KEY but no approval
      const [, , , , , , , noApproveBuyer] = await ethers.getSigners();
      await keyCoin.connect(noApproveBuyer).buyKeyCoin({ value: 10_000n });
      // intentionally skip approve

      await marketplace.connect(seller).listLicense(TOKEN_ID, 500n);

      await expect(
        marketplace.connect(noApproveBuyer).buyLicense(1n)
      ).to.be.reverted;
    });

    it("new owner can re-list after purchase after approving Marketplace", async () => {
      const { marketplace, gameToken, seller, buyer } = await loadFixture(
        deployMarketplaceFixture
      );

      const PRICE = 1000n;
      await marketplace.connect(seller).listLicense(TOKEN_ID, PRICE);
      await marketplace.connect(buyer).buyLicense(1n);

      // buyer is now the new owner; approve and re-list
      await gameToken
        .connect(buyer)
        .setApprovalForAll(await marketplace.getAddress(), true);
      await expect(
        marketplace.connect(buyer).listLicense(TOKEN_ID, 500n)
      ).to.not.be.reverted;

      const listing2 = await marketplace.getListing(2n);
      expect(listing2.seller).to.equal(buyer.address);
      expect(listing2.isOpen).to.be.true;
    });
  });

  // -------------------------------------------------------------------------
  // 5. Activation / state transitions
  // -------------------------------------------------------------------------
  describe("Activation / state transitions", () => {
    it("cannot list an active license — seller must deactivate first", async () => {
      const { marketplace, activation, seller } = await loadFixture(
        deployMarketplaceFixture
      );
      const machineHash = buildMachineHash("machine-001");
      await activation
        .connect(seller)
        .activateLicense(TOKEN_ID, machineHash);

      await expect(
        marketplace.connect(seller).listLicense(TOKEN_ID, 500n)
      ).to.be.revertedWith("Marketplace: license active");
    });

    it("seller can list after deactivating an active license", async () => {
      const { marketplace, activation, seller } = await loadFixture(
        deployMarketplaceFixture
      );
      const machineHash = buildMachineHash("machine-001");
      await activation
        .connect(seller)
        .activateLicense(TOKEN_ID, machineHash);
      await activation.connect(seller).deactivateLicense(TOKEN_ID);

      await expect(
        marketplace.connect(seller).listLicense(TOKEN_ID, 500n)
      ).to.not.be.reverted;
    });

    it("full flow: Inactive → Listed (escrow) → Bought → Buyer owns inactive license", async () => {
      const { marketplace, gameToken, activation, seller, buyer } =
        await loadFixture(deployMarketplaceFixture);

      // Confirm seller's license starts inactive
      expect(await activation.isActive(seller.address, TOKEN_ID)).to.be.false;

      // Seller lists → license goes into escrow
      await marketplace.connect(seller).listLicense(TOKEN_ID, 500n);
      expect(
        await gameToken.balanceOf(await marketplace.getAddress(), TOKEN_ID)
      ).to.equal(1n);

      // Buyer purchases → license transferred to buyer
      await marketplace.connect(buyer).buyLicense(1n);
      expect(await gameToken.balanceOf(buyer.address, TOKEN_ID)).to.equal(1n);

      // NOTE: Marketplace does NOT call ActivationContract.deactivateLicense()
      // on behalf of anyone. The design guarantee is: a license can only be
      // listed when it is inactive in ActivationContract. The seller's own
      // activation record (seller, tokenId) remains as-is after the transfer,
      // but the buyer's activation record (buyer, tokenId) starts as inactive
      // because the buyer has never called activateLicense().
      expect(await activation.isActive(buyer.address, TOKEN_ID)).to.be.false;
    });

    it("after buying, buyer can activate their license on a new machine", async () => {
      const { marketplace, activation, seller, buyer } = await loadFixture(
        deployMarketplaceFixture
      );
      await marketplace.connect(seller).listLicense(TOKEN_ID, 500n);
      await marketplace.connect(buyer).buyLicense(1n);

      const machineHash = buildMachineHash("buyer-machine");
      await expect(
        activation
          .connect(buyer)
          .activateLicense(TOKEN_ID, machineHash)
      ).to.not.be.reverted;

      expect(await activation.isActive(buyer.address, TOKEN_ID)).to.be.true;
    });

    it("activate → deactivate → list: full seller lifecycle before resale", async () => {
      const { marketplace, activation, seller } = await loadFixture(
        deployMarketplaceFixture
      );
      const machineHash = buildMachineHash("machine-seller");

      // Activate on a device
      await activation
        .connect(seller)
        .activateLicense(TOKEN_ID, machineHash);
      expect(await activation.isActive(seller.address, TOKEN_ID)).to.be.true;

      // Deactivate to prepare for resale
      await activation.connect(seller).deactivateLicense(TOKEN_ID);
      expect(await activation.isActive(seller.address, TOKEN_ID)).to.be.false;

      // List successfully
      await expect(
        marketplace.connect(seller).listLicense(TOKEN_ID, 800n)
      ).to.not.be.reverted;

      const listing = await marketplace.getListing(1n);
      expect(listing.isOpen).to.be.true;
    });
  });
});
