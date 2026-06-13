import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import type {
  ActivationContract,
  GameToken,
  KeyCoin,
  Marketplace,
} from "../typechain-types";

// Marketplace — secondary market with automatic ERC-2981 royalty split.
// A license must be inactive to be listed; listing escrows the unit. Buying
// splits payment royalty→vendor, remainder→seller, and transfers the license.
describe("Marketplace", () => {
  const TOKEN_ID = 1n;
  const ROYALTY_BPS = 1000n; // 10%
  const KEY_RATE = 1n; // 1 KEY per wei keeps the arithmetic in tests simple

  // Helper: derive a deterministic machineHash from a label.
  function buildMachineHash(value: string): `0x${string}` {
    return ethers.keccak256(ethers.toUtf8Bytes(value)) as `0x${string}`;
  }

  async function deployMarketplaceFixture() {
    const [deployer, vendor, seller, buyer, otherUser] =
      await ethers.getSigners();

    const KeyCoinFactory = await ethers.getContractFactory("KeyCoin");
    const keyCoin = (await KeyCoinFactory.connect(deployer).deploy(
      KEY_RATE
    )) as unknown as KeyCoin;
    await keyCoin.waitForDeployment();

    const GameTokenFactory = await ethers.getContractFactory("GameToken");
    const gameToken = (await GameTokenFactory.connect(
      deployer
    ).deploy()) as unknown as GameToken;
    await gameToken.waitForDeployment();

    const ActivationFactory = await ethers.getContractFactory("ActivationContract");
    const activation = (await ActivationFactory.connect(deployer).deploy(
      await gameToken.getAddress()
    )) as unknown as ActivationContract;
    await activation.waitForDeployment();

    const MarketplaceFactory = await ethers.getContractFactory("Marketplace");
    const marketplace = (await MarketplaceFactory.connect(deployer).deploy(
      await keyCoin.getAddress(),
      await gameToken.getAddress(),
      await activation.getAddress()
    )) as unknown as Marketplace;
    await marketplace.waitForDeployment();

    // Grant MINTER_ROLE to deployer so the fixture can create and mint directly.
    const MINTER_ROLE = await gameToken.MINTER_ROLE();
    await gameToken.connect(deployer).grantRole(MINTER_ROLE, deployer.address);

    // Create the game (10% royalty to vendor) and give the seller one license.
    await gameToken
      .connect(deployer)
      .createGame(TOKEN_ID, vendor.address, ROYALTY_BPS, "ipfs://game-1");
    await gameToken.connect(deployer).mint(seller.address, TOKEN_ID);

    // Fund the buyer with KEY (rate=1 → 10_000 wei buys 10_000 KEY) and approve.
    const BUYER_KEY = 10_000n;
    await keyCoin.connect(buyer).buyKeyCoin({ value: BUYER_KEY });
    await keyCoin
      .connect(buyer)
      .approve(await marketplace.getAddress(), ethers.MaxUint256);

    // Seller approves the marketplace to escrow the license unit.
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

  describe("deployment", () => {
    it("stores the KeyCoin address it was constructed with", async () => {
      const { marketplace, keyCoin } = await loadFixture(
        deployMarketplaceFixture
      );

      expect(await marketplace.keyCoin()).to.equal(await keyCoin.getAddress());
    });

    it("stores the GameToken address it was constructed with", async () => {
      const { marketplace, gameToken } = await loadFixture(
        deployMarketplaceFixture
      );

      expect(await marketplace.gameToken()).to.equal(
        await gameToken.getAddress()
      );
    });

    it("stores the ActivationContract address it was constructed with", async () => {
      const { marketplace, activation } = await loadFixture(
        deployMarketplaceFixture
      );

      expect(await marketplace.activation()).to.equal(
        await activation.getAddress()
      );
    });

    it("returns a zeroed listing for a non-existent id", async () => {
      const { marketplace } = await loadFixture(deployMarketplaceFixture);

      const listing = await marketplace.getListing(999n);
      expect(listing.isOpen).to.equal(false);
      expect(listing.seller).to.equal(ethers.ZeroAddress);
      expect(listing.price).to.equal(0n);
    });
  });

  describe("listLicense", () => {
    it("succeeds when the seller owns an inactive license", async () => {
      const { marketplace, seller } = await loadFixture(
        deployMarketplaceFixture
      );

      await expect(
        marketplace.connect(seller).listLicense(TOKEN_ID, 500n)
      ).to.not.be.reverted;
    });

    it("stores the listing with the right seller, tokenId, price and open flag", async () => {
      const { marketplace, seller } = await loadFixture(
        deployMarketplaceFixture
      );

      const PRICE = 500n;
      await marketplace.connect(seller).listLicense(TOKEN_ID, PRICE);

      const listing = await marketplace.getListing(1n);
      expect(listing.tokenId).to.equal(TOKEN_ID);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.price).to.equal(PRICE);
      expect(listing.isOpen).to.equal(true);
    });

    it("escrows the ERC-1155 unit into the marketplace", async () => {
      const { marketplace, gameToken, seller } = await loadFixture(
        deployMarketplaceFixture
      );

      await marketplace.connect(seller).listLicense(TOKEN_ID, 500n);

      expect(
        await gameToken.balanceOf(await marketplace.getAddress(), TOKEN_ID)
      ).to.equal(1n);
      expect(await gameToken.balanceOf(seller.address, TOKEN_ID)).to.equal(0n);
    });

    it("reverts when the license is active in the ActivationContract", async () => {
      const { marketplace, activation, seller } = await loadFixture(
        deployMarketplaceFixture
      );

      await activation
        .connect(seller)
        .activateLicense(TOKEN_ID, buildMachineHash("machine-001"));

      await expect(
        marketplace.connect(seller).listLicense(TOKEN_ID, 500n)
      ).to.be.revertedWith("Marketplace: license active");
    });

    it("reverts when the seller does not own the license", async () => {
      const { marketplace, otherUser } = await loadFixture(
        deployMarketplaceFixture
      );

      // otherUser has no balance, so the escrow transfer reverts in ERC-1155.
      await expect(
        marketplace.connect(otherUser).listLicense(TOKEN_ID, 500n)
      ).to.be.reverted;
    });

    it("reverts when the seller has not approved the marketplace for ERC-1155", async () => {
      const { marketplace, gameToken, deployer } = await loadFixture(
        deployMarketplaceFixture
      );

      // A fresh signer holds a license but never set approval.
      const [, , , , , noApprovalSeller] = await ethers.getSigners();
      await gameToken.connect(deployer).mint(noApprovalSeller.address, TOKEN_ID);

      await expect(
        marketplace.connect(noApprovalSeller).listLicense(TOKEN_ID, 500n)
      ).to.be.reverted;
    });

    it("increments the listingId for each new listing", async () => {
      const { marketplace, gameToken, deployer, seller } = await loadFixture(
        deployMarketplaceFixture
      );

      // Mint a second unit so the seller can list twice.
      await gameToken.connect(deployer).mint(seller.address, TOKEN_ID);

      await marketplace.connect(seller).listLicense(TOKEN_ID, 100n);
      await marketplace.connect(seller).listLicense(TOKEN_ID, 200n);

      expect((await marketplace.getListing(1n)).price).to.equal(100n);
      expect((await marketplace.getListing(2n)).price).to.equal(200n);
    });

    it("allows price = 0 because the contract has no price guard", async () => {
      const { marketplace, seller } = await loadFixture(
        deployMarketplaceFixture
      );

      await expect(
        marketplace.connect(seller).listLicense(TOKEN_ID, 0n)
      ).to.not.be.reverted;
    });
  });

  describe("cancelListing", () => {
    it("lets the seller cancel an open listing", async () => {
      const { marketplace, seller } = await loadFixture(
        deployMarketplaceFixture
      );

      await marketplace.connect(seller).listLicense(TOKEN_ID, 500n);

      await expect(
        marketplace.connect(seller).cancelListing(1n)
      ).to.not.be.reverted;
    });

    it("closes the listing after cancel", async () => {
      const { marketplace, seller } = await loadFixture(
        deployMarketplaceFixture
      );

      await marketplace.connect(seller).listLicense(TOKEN_ID, 500n);
      await marketplace.connect(seller).cancelListing(1n);

      expect((await marketplace.getListing(1n)).isOpen).to.equal(false);
    });

    it("returns the escrowed unit to the seller", async () => {
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

    it("reverts when a non-seller tries to cancel", async () => {
      const { marketplace, seller, otherUser } = await loadFixture(
        deployMarketplaceFixture
      );

      await marketplace.connect(seller).listLicense(TOKEN_ID, 500n);

      await expect(
        marketplace.connect(otherUser).cancelListing(1n)
      ).to.be.revertedWith("Marketplace: not seller");
    });

    it("reverts when the listing is already closed", async () => {
      const { marketplace, seller } = await loadFixture(
        deployMarketplaceFixture
      );

      await marketplace.connect(seller).listLicense(TOKEN_ID, 500n);
      await marketplace.connect(seller).cancelListing(1n);

      await expect(
        marketplace.connect(seller).cancelListing(1n)
      ).to.be.revertedWith("Marketplace: not open");
    });

    it("reverts when the listing was already bought", async () => {
      const { marketplace, seller, buyer } = await loadFixture(
        deployMarketplaceFixture
      );

      await marketplace.connect(seller).listLicense(TOKEN_ID, 500n);
      await marketplace.connect(buyer).buyLicense(1n);

      await expect(
        marketplace.connect(seller).cancelListing(1n)
      ).to.be.revertedWith("Marketplace: not open");
    });

    it("reverts on a non-existent listing id", async () => {
      const { marketplace, seller } = await loadFixture(
        deployMarketplaceFixture
      );

      await expect(
        marketplace.connect(seller).cancelListing(999n)
      ).to.be.revertedWith("Marketplace: not open");
    });
  });

  describe("buyLicense", () => {
    it("lets a buyer purchase an open listing", async () => {
      const { marketplace, seller, buyer } = await loadFixture(
        deployMarketplaceFixture
      );

      await marketplace.connect(seller).listLicense(TOKEN_ID, 500n);

      await expect(marketplace.connect(buyer).buyLicense(1n)).to.not.be.reverted;
    });

    it("closes the listing after purchase", async () => {
      const { marketplace, seller, buyer } = await loadFixture(
        deployMarketplaceFixture
      );

      await marketplace.connect(seller).listLicense(TOKEN_ID, 500n);
      await marketplace.connect(buyer).buyLicense(1n);

      expect((await marketplace.getListing(1n)).isOpen).to.equal(false);
    });

    it("transfers the license from escrow to the buyer", async () => {
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

    it("splits royalty to the vendor and the remainder to the seller", async () => {
      const { marketplace, keyCoin, seller, buyer, vendor } = await loadFixture(
        deployMarketplaceFixture
      );

      const PRICE = 1000n;
      const royalty = (PRICE * ROYALTY_BPS) / 10_000n; // 100
      const remainder = PRICE - royalty; // 900

      await marketplace.connect(seller).listLicense(TOKEN_ID, PRICE);

      const vendorBefore = await keyCoin.balanceOf(vendor.address);
      const sellerBefore = await keyCoin.balanceOf(seller.address);
      const buyerBefore = await keyCoin.balanceOf(buyer.address);

      await marketplace.connect(buyer).buyLicense(1n);

      expect(await keyCoin.balanceOf(vendor.address)).to.equal(
        vendorBefore + royalty
      );
      expect(await keyCoin.balanceOf(seller.address)).to.equal(
        sellerBefore + remainder
      );
      expect(await keyCoin.balanceOf(buyer.address)).to.equal(
        buyerBefore - PRICE
      );
    });

    it("emits RoyaltyPaid with the tokenId, vendor and royalty amount", async () => {
      const { marketplace, seller, buyer, vendor } = await loadFixture(
        deployMarketplaceFixture
      );

      const PRICE = 1000n;
      const royalty = (PRICE * ROYALTY_BPS) / 10_000n;

      await marketplace.connect(seller).listLicense(TOKEN_ID, PRICE);

      await expect(marketplace.connect(buyer).buyLicense(1n))
        .to.emit(marketplace, "RoyaltyPaid")
        .withArgs(TOKEN_ID, vendor.address, royalty);
    });

    it("reverts on a non-existent listing", async () => {
      const { marketplace, buyer } = await loadFixture(
        deployMarketplaceFixture
      );

      await expect(
        marketplace.connect(buyer).buyLicense(999n)
      ).to.be.revertedWith("Marketplace: not open");
    });

    it("reverts when the listing is already sold", async () => {
      const { marketplace, seller, buyer, otherUser, keyCoin } =
        await loadFixture(deployMarketplaceFixture);

      // Fund a second buyer so the failure is "not open", not lack of funds.
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

    it("reverts when the listing was cancelled", async () => {
      const { marketplace, seller, buyer } = await loadFixture(
        deployMarketplaceFixture
      );

      await marketplace.connect(seller).listLicense(TOKEN_ID, 500n);
      await marketplace.connect(seller).cancelListing(1n);

      await expect(
        marketplace.connect(buyer).buyLicense(1n)
      ).to.be.revertedWith("Marketplace: not open");
    });

    it("reverts when the buyer has insufficient KEY balance", async () => {
      const { marketplace, keyCoin, seller } = await loadFixture(
        deployMarketplaceFixture
      );

      // A broke buyer with 0 KEY but an approval set.
      const [, , , , , , brokeBuyer] = await ethers.getSigners();
      await keyCoin
        .connect(brokeBuyer)
        .approve(await marketplace.getAddress(), ethers.MaxUint256);

      await marketplace.connect(seller).listLicense(TOKEN_ID, 500n);

      await expect(
        marketplace.connect(brokeBuyer).buyLicense(1n)
      ).to.be.reverted; // ERC-20 transferFrom reverts on insufficient balance
    });

    it("reverts when the buyer has not approved the marketplace to spend KEY", async () => {
      const { marketplace, keyCoin, seller } = await loadFixture(
        deployMarketplaceFixture
      );

      // A buyer with KEY but no approval.
      const [, , , , , , , noApproveBuyer] = await ethers.getSigners();
      await keyCoin.connect(noApproveBuyer).buyKeyCoin({ value: 10_000n });

      await marketplace.connect(seller).listLicense(TOKEN_ID, 500n);

      await expect(
        marketplace.connect(noApproveBuyer).buyLicense(1n)
      ).to.be.reverted;
    });

    it("lets the new owner re-list after purchase once they approve the marketplace", async () => {
      const { marketplace, gameToken, seller, buyer } = await loadFixture(
        deployMarketplaceFixture
      );

      const PRICE = 1000n;
      await marketplace.connect(seller).listLicense(TOKEN_ID, PRICE);
      await marketplace.connect(buyer).buyLicense(1n);

      // Buyer is now the owner; approve and re-list.
      await gameToken
        .connect(buyer)
        .setApprovalForAll(await marketplace.getAddress(), true);

      await expect(
        marketplace.connect(buyer).listLicense(TOKEN_ID, 500n)
      ).to.not.be.reverted;

      const listing2 = await marketplace.getListing(2n);
      expect(listing2.seller).to.equal(buyer.address);
      expect(listing2.isOpen).to.equal(true);
    });
  });

  describe("activation and state transitions", () => {
    it("cannot list an active license — the seller must deactivate first", async () => {
      const { marketplace, activation, seller } = await loadFixture(
        deployMarketplaceFixture
      );

      await activation
        .connect(seller)
        .activateLicense(TOKEN_ID, buildMachineHash("machine-001"));

      await expect(
        marketplace.connect(seller).listLicense(TOKEN_ID, 500n)
      ).to.be.revertedWith("Marketplace: license active");
    });

    it("lets the seller list after deactivating an active license", async () => {
      const { marketplace, activation, seller } = await loadFixture(
        deployMarketplaceFixture
      );

      await activation
        .connect(seller)
        .activateLicense(TOKEN_ID, buildMachineHash("machine-001"));
      await activation.connect(seller).deactivateLicense(TOKEN_ID);

      await expect(
        marketplace.connect(seller).listLicense(TOKEN_ID, 500n)
      ).to.not.be.reverted;
    });

    it("runs the full flow: Inactive → Listed (escrow) → Bought → buyer owns inactive license", async () => {
      const { marketplace, gameToken, activation, seller, buyer } =
        await loadFixture(deployMarketplaceFixture);

      // Seller's license starts inactive.
      expect(await activation.isActive(seller.address, TOKEN_ID)).to.equal(false);

      // Listing escrows the unit.
      await marketplace.connect(seller).listLicense(TOKEN_ID, 500n);
      expect(
        await gameToken.balanceOf(await marketplace.getAddress(), TOKEN_ID)
      ).to.equal(1n);

      // Buying transfers the unit to the buyer.
      await marketplace.connect(buyer).buyLicense(1n);
      expect(await gameToken.balanceOf(buyer.address, TOKEN_ID)).to.equal(1n);

      // The marketplace never touches activation records: the buyer's
      // (buyer, tokenId) record is inactive because they never activated.
      expect(await activation.isActive(buyer.address, TOKEN_ID)).to.equal(false);
    });

    it("lets the buyer activate their license on a new machine after buying", async () => {
      const { marketplace, activation, seller, buyer } = await loadFixture(
        deployMarketplaceFixture
      );

      await marketplace.connect(seller).listLicense(TOKEN_ID, 500n);
      await marketplace.connect(buyer).buyLicense(1n);

      await expect(
        activation
          .connect(buyer)
          .activateLicense(TOKEN_ID, buildMachineHash("buyer-machine"))
      ).to.not.be.reverted;

      expect(await activation.isActive(buyer.address, TOKEN_ID)).to.equal(true);
    });

    it("runs the seller lifecycle activate → deactivate → list before resale", async () => {
      const { marketplace, activation, seller } = await loadFixture(
        deployMarketplaceFixture
      );

      const machineHash = buildMachineHash("machine-seller");

      // Activate on a device.
      await activation.connect(seller).activateLicense(TOKEN_ID, machineHash);
      expect(await activation.isActive(seller.address, TOKEN_ID)).to.equal(true);

      // Deactivate to prepare for resale.
      await activation.connect(seller).deactivateLicense(TOKEN_ID);
      expect(await activation.isActive(seller.address, TOKEN_ID)).to.equal(false);

      // List successfully.
      await expect(
        marketplace.connect(seller).listLicense(TOKEN_ID, 800n)
      ).to.not.be.reverted;

      expect((await marketplace.getListing(1n)).isOpen).to.equal(true);
    });
  });

  describe("getOpenListings", () => {
    it("returns empty arrays when there are no listings", async () => {
      const { marketplace } = await loadFixture(deployMarketplaceFixture);

      const [ids, listings] = await marketplace.getOpenListings();
      expect(ids.length).to.equal(0);
      expect(listings.length).to.equal(0);
    });

    it("returns a single open listing with its id alongside the struct", async () => {
      const { marketplace, seller } = await loadFixture(
        deployMarketplaceFixture
      );

      await marketplace.connect(seller).listLicense(TOKEN_ID, 500n);

      const [ids, listings] = await marketplace.getOpenListings();
      expect(ids).to.deep.equal([1n]);
      expect(listings.length).to.equal(1);
      expect(listings[0].tokenId).to.equal(TOKEN_ID);
      expect(listings[0].seller).to.equal(seller.address);
      expect(listings[0].price).to.equal(500n);
      expect(listings[0].isOpen).to.equal(true);
    });

    it("excludes a cancelled listing", async () => {
      const { marketplace, gameToken, deployer, seller } = await loadFixture(
        deployMarketplaceFixture
      );

      // Two units so the seller can hold one open listing after cancelling one.
      await gameToken.connect(deployer).mint(seller.address, TOKEN_ID);

      await marketplace.connect(seller).listLicense(TOKEN_ID, 100n);
      await marketplace.connect(seller).listLicense(TOKEN_ID, 200n);
      await marketplace.connect(seller).cancelListing(1n);

      const [ids, listings] = await marketplace.getOpenListings();
      expect(ids).to.deep.equal([2n]);
      expect(listings[0].price).to.equal(200n);
    });

    it("excludes a bought listing", async () => {
      const { marketplace, gameToken, deployer, seller, buyer } =
        await loadFixture(deployMarketplaceFixture);

      await gameToken.connect(deployer).mint(seller.address, TOKEN_ID);

      await marketplace.connect(seller).listLicense(TOKEN_ID, 100n);
      await marketplace.connect(seller).listLicense(TOKEN_ID, 200n);
      await marketplace.connect(buyer).buyLicense(1n);

      const [ids, listings] = await marketplace.getOpenListings();
      expect(ids).to.deep.equal([2n]);
      expect(listings[0].price).to.equal(200n);
    });

    it("returns every open listing with ids aligned to their structs", async () => {
      const { marketplace, gameToken, deployer, seller } = await loadFixture(
        deployMarketplaceFixture
      );

      // Three open listings, then cancel the middle one to leave a gap in ids.
      await gameToken.connect(deployer).mint(seller.address, TOKEN_ID);
      await gameToken.connect(deployer).mint(seller.address, TOKEN_ID);

      await marketplace.connect(seller).listLicense(TOKEN_ID, 100n);
      await marketplace.connect(seller).listLicense(TOKEN_ID, 200n);
      await marketplace.connect(seller).listLicense(TOKEN_ID, 300n);
      await marketplace.connect(seller).cancelListing(2n);

      const [ids, listings] = await marketplace.getOpenListings();
      expect(ids).to.deep.equal([1n, 3n]);
      expect(listings[0].price).to.equal(100n);
      expect(listings[1].price).to.equal(300n);
    });
  });

  describe("ERC-1155 receiver", () => {
    it("advertises IERC1155Receiver support and accepts batch receipts", async () => {
      const { marketplace, buyer } = await loadFixture(
        deployMarketplaceFixture
      );

      const IERC1155_RECEIVER_ID = "0x4e2312e0";
      const ERC165_ID = "0x01ffc9a7";
      const BATCH_SELECTOR = "0xbc197c81"; // onERC1155BatchReceived selector

      expect(await marketplace.supportsInterface(IERC1155_RECEIVER_ID)).to.equal(
        true
      );
      expect(await marketplace.supportsInterface(ERC165_ID)).to.equal(true);
      expect(await marketplace.supportsInterface("0xffffffff")).to.equal(false);
      expect(
        await marketplace.onERC1155BatchReceived(
          buyer.address,
          buyer.address,
          [],
          [],
          "0x"
        )
      ).to.equal(BATCH_SELECTOR);
    });
  });
});
