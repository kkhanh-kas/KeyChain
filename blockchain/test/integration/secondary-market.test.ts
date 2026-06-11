import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import type {
  ActivationContract,
  GameStore,
  GameToken,
  KeyCoin,
  Marketplace,
} from "../../typechain-types";

// Secondary market — buy → activate → deactivate → list → resale → royalty.
// A license must be inactive to be listed; listing escrows the unit. Buying
// splits payment royalty→vendor (ERC-2981) and remainder→seller, then transfers
// the license. Activation never moves with the token: the buyer starts inactive.
describe("Integration: secondary market (list → resale → royalty)", () => {
  const INITIAL_RATE = 1000n; // KEY (base units) minted per wei of ETH
  const GAME_PRICE = ethers.parseEther("20"); // 20 KEY — primary market
  const LIST_PRICE = ethers.parseEther("15"); // 15 KEY — resale price
  const ROYALTY_BPS = 500n; // 5%
  const ROYALTY = (LIST_PRICE * ROYALTY_BPS) / 10_000n; // 0.75 KEY
  const SELLER_PROCEEDS = LIST_PRICE - ROYALTY; // 14.25 KEY
  const GAME_NAME = "BlockBrawl";
  const GAME_URI = "ipfs://QmSecondaryMarketTest";
  const MACHINE_HASH = buildMachineHash("seller-device-001");

  // Helper: derive a deterministic machineHash from a label.
  function buildMachineHash(value: string): `0x${string}` {
    return ethers.keccak256(ethers.toUtf8Bytes(value)) as `0x${string}`;
  }

  // Helper: fund an account with KEY by buying `keyAmount` worth at INITIAL_RATE.
  async function fundKey(keyCoin: KeyCoin, account: any, keyAmount: bigint) {
    await keyCoin.connect(account).buyKeyCoin({ value: keyAmount / INITIAL_RATE });
  }

  async function deployFixture() {
    const [deployer, vendor, seller, buyer] = await ethers.getSigners();

    const KeyCoinFactory = await ethers.getContractFactory("KeyCoin");
    const keyCoin = (await KeyCoinFactory.connect(deployer).deploy(
      INITIAL_RATE
    )) as unknown as KeyCoin;
    await keyCoin.waitForDeployment();

    const GameTokenFactory = await ethers.getContractFactory("GameToken");
    const gameToken = (await GameTokenFactory.connect(
      deployer
    ).deploy()) as unknown as GameToken;
    await gameToken.waitForDeployment();

    const GameStoreFactory = await ethers.getContractFactory("GameStore");
    const gameStore = (await GameStoreFactory.connect(deployer).deploy(
      await keyCoin.getAddress(),
      await gameToken.getAddress()
    )) as unknown as GameStore;
    await gameStore.waitForDeployment();

    const ActivationFactory = await ethers.getContractFactory(
      "ActivationContract"
    );
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

    // Wiring: GameStore mints licenses, vendor may register games.
    const MINTER_ROLE = await gameToken.MINTER_ROLE();
    const VENDOR_ROLE = await gameStore.VENDOR_ROLE();
    await gameToken
      .connect(deployer)
      .grantRole(MINTER_ROLE, await gameStore.getAddress());
    await gameStore.connect(deployer).grantRole(VENDOR_ROLE, vendor.address);

    return {
      keyCoin,
      gameToken,
      gameStore,
      activation,
      marketplace,
      deployer,
      vendor,
      seller,
      buyer,
    };
  }

  // Game registered; seller owns a license and approved the marketplace to
  // escrow it; buyer is funded with KEY and approved to spend at the marketplace.
  async function withLicenseFixture() {
    const ctx = await deployFixture();
    const { keyCoin, gameToken, gameStore, marketplace, vendor, seller, buyer } =
      ctx;

    await gameStore
      .connect(vendor)
      .registerGame(GAME_NAME, GAME_PRICE, ROYALTY_BPS, GAME_URI);

    await fundKey(keyCoin, seller, ethers.parseEther("1000"));
    await keyCoin
      .connect(seller)
      .approve(await gameStore.getAddress(), ethers.MaxUint256);
    await gameStore.connect(seller).purchaseLicense(1n);

    await gameToken
      .connect(seller)
      .setApprovalForAll(await marketplace.getAddress(), true);

    await fundKey(keyCoin, buyer, ethers.parseEther("1000"));
    await keyCoin
      .connect(buyer)
      .approve(await marketplace.getAddress(), ethers.MaxUint256);

    return ctx;
  }

  // Seller has activated then deactivated the license and listed it for resale.
  async function listedFixture() {
    const ctx = await withLicenseFixture();
    const { activation, marketplace, seller } = ctx;

    await activation.connect(seller).activateLicense(1n, MACHINE_HASH);
    await activation.connect(seller).deactivateLicense(1n);
    await marketplace.connect(seller).listLicense(1n, LIST_PRICE);

    return ctx;
  }

  describe("step 1 — seller buys and activates the license", () => {
    it("gives the seller the GameToken after purchase", async () => {
      const { gameToken, seller } = await loadFixture(withLicenseFixture);
      expect(await gameToken.balanceOf(seller.address, 1n)).to.equal(1n);
    });

    it("lets the seller activate the license", async () => {
      const { activation, seller } = await loadFixture(withLicenseFixture);

      await activation.connect(seller).activateLicense(1n, MACHINE_HASH);

      expect(await activation.isActive(seller.address, 1n)).to.equal(true);
    });

    it("blocks resale while the license is active", async () => {
      const { activation, marketplace, seller } = await loadFixture(
        withLicenseFixture
      );

      await activation.connect(seller).activateLicense(1n, MACHINE_HASH);

      await expect(
        marketplace.connect(seller).listLicense(1n, LIST_PRICE)
      ).to.be.revertedWith("Marketplace: license active");
    });
  });

  describe("step 2 — deactivate before listing", () => {
    it("sets isActive back to false", async () => {
      const { activation, seller } = await loadFixture(withLicenseFixture);

      await activation.connect(seller).activateLicense(1n, MACHINE_HASH);
      await activation.connect(seller).deactivateLicense(1n);

      expect(await activation.isActive(seller.address, 1n)).to.equal(false);
    });

    it("reverts when deactivating a license that was never active", async () => {
      const { activation, seller } = await loadFixture(withLicenseFixture);

      await expect(
        activation.connect(seller).deactivateLicense(1n)
      ).to.be.revertedWith("Activation: not active");
    });

    it("allows listing immediately after deactivation", async () => {
      const { activation, marketplace, seller } = await loadFixture(
        withLicenseFixture
      );

      await activation.connect(seller).activateLicense(1n, MACHINE_HASH);
      await activation.connect(seller).deactivateLicense(1n);

      await expect(
        marketplace.connect(seller).listLicense(1n, LIST_PRICE)
      ).to.not.be.reverted;
    });
  });

  describe("step 3 — list the license on the marketplace", () => {
    it("escrows the GameToken into the marketplace", async () => {
      const { gameToken, marketplace, seller } = await loadFixture(
        listedFixture
      );

      expect(
        await gameToken.balanceOf(await marketplace.getAddress(), 1n)
      ).to.equal(1n);
      expect(await gameToken.balanceOf(seller.address, 1n)).to.equal(0n);
    });

    it("stores the listing with the right info", async () => {
      const { marketplace, seller } = await loadFixture(listedFixture);

      const listing = await marketplace.getListing(1n);
      expect(listing.tokenId).to.equal(1n);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.price).to.equal(LIST_PRICE);
      expect(listing.isOpen).to.equal(true);
    });

    it("reverts when listing an active license", async () => {
      const { activation, marketplace, seller } = await loadFixture(
        withLicenseFixture
      );

      await activation.connect(seller).activateLicense(1n, MACHINE_HASH);

      await expect(
        marketplace.connect(seller).listLicense(1n, LIST_PRICE)
      ).to.be.revertedWith("Marketplace: license active");
    });

    it("reverts when the seller does not own a license", async () => {
      const { gameToken, marketplace, buyer } = await loadFixture(
        withLicenseFixture
      );

      // buyer holds no license, so the escrow transfer reverts in ERC-1155.
      await gameToken
        .connect(buyer)
        .setApprovalForAll(await marketplace.getAddress(), true);

      await expect(
        marketplace.connect(buyer).listLicense(1n, LIST_PRICE)
      ).to.be.reverted;
    });
  });

  describe("step 4 — resale splits payment and clears escrow", () => {
    it("transfers the GameToken to the buyer", async () => {
      const { gameToken, marketplace, buyer } = await loadFixture(listedFixture);

      await marketplace.connect(buyer).buyLicense(1n);

      expect(await gameToken.balanceOf(buyer.address, 1n)).to.equal(1n);
    });

    it("releases the escrowed token from the marketplace", async () => {
      const { gameToken, marketplace, buyer } = await loadFixture(listedFixture);

      await marketplace.connect(buyer).buyLicense(1n);

      expect(
        await gameToken.balanceOf(await marketplace.getAddress(), 1n)
      ).to.equal(0n);
    });

    it("pays the vendor the 5% royalty of the list price", async () => {
      const { keyCoin, marketplace, vendor, buyer } = await loadFixture(
        listedFixture
      );

      const vendorBefore = await keyCoin.balanceOf(vendor.address);
      await marketplace.connect(buyer).buyLicense(1n);
      const vendorAfter = await keyCoin.balanceOf(vendor.address);

      expect(vendorAfter - vendorBefore).to.equal(ROYALTY);
    });

    it("pays the seller the remaining 95% of the list price", async () => {
      const { keyCoin, marketplace, seller, buyer } = await loadFixture(
        listedFixture
      );

      const sellerBefore = await keyCoin.balanceOf(seller.address);
      await marketplace.connect(buyer).buyLicense(1n);
      const sellerAfter = await keyCoin.balanceOf(seller.address);

      expect(sellerAfter - sellerBefore).to.equal(SELLER_PROCEEDS);
    });

    it("conserves KEY: royalty + seller proceeds equals buyer spend", async () => {
      const { keyCoin, marketplace, vendor, seller, buyer } = await loadFixture(
        listedFixture
      );

      const vendorBefore = await keyCoin.balanceOf(vendor.address);
      const sellerBefore = await keyCoin.balanceOf(seller.address);
      const buyerBefore = await keyCoin.balanceOf(buyer.address);

      await marketplace.connect(buyer).buyLicense(1n);

      const vendorDiff = (await keyCoin.balanceOf(vendor.address)) - vendorBefore;
      const sellerDiff = (await keyCoin.balanceOf(seller.address)) - sellerBefore;
      const buyerDiff = buyerBefore - (await keyCoin.balanceOf(buyer.address));

      expect(vendorDiff + sellerDiff).to.equal(buyerDiff);
      expect(vendorDiff).to.equal(ROYALTY);
      expect(sellerDiff).to.equal(SELLER_PROCEEDS);
    });

    it("emits RoyaltyPaid with the tokenId, vendor and royalty amount", async () => {
      const { marketplace, vendor, buyer } = await loadFixture(listedFixture);

      await expect(marketplace.connect(buyer).buyLicense(1n))
        .to.emit(marketplace, "RoyaltyPaid")
        .withArgs(1n, vendor.address, ROYALTY);
    });

    it("closes the listing after the sale", async () => {
      const { marketplace, buyer } = await loadFixture(listedFixture);

      await marketplace.connect(buyer).buyLicense(1n);

      expect((await marketplace.getListing(1n)).isOpen).to.equal(false);
    });

    it("reverts when buying a listing that is already closed", async () => {
      const { marketplace, buyer } = await loadFixture(listedFixture);

      await marketplace.connect(buyer).buyLicense(1n);

      await expect(
        marketplace.connect(buyer).buyLicense(1n)
      ).to.be.revertedWith("Marketplace: not open");
    });
  });

  describe("step 5 — activation state after the sale", () => {
    async function afterSaleFixture() {
      const ctx = await listedFixture();
      await ctx.marketplace.connect(ctx.buyer).buyLicense(1n);
      return ctx;
    }

    it("leaves the seller inactive (deactivated before listing)", async () => {
      const { activation, seller } = await loadFixture(afterSaleFixture);
      expect(await activation.isActive(seller.address, 1n)).to.equal(false);
    });

    it("leaves the buyer inactive (never activated)", async () => {
      const { activation, buyer } = await loadFixture(afterSaleFixture);
      expect(await activation.isActive(buyer.address, 1n)).to.equal(false);
    });

    it("lets the buyer activate the license they just bought", async () => {
      const { activation, buyer } = await loadFixture(afterSaleFixture);

      const buyerHash = buildMachineHash("buyer-device-001");
      await activation.connect(buyer).activateLicense(1n, buyerHash);

      expect(await activation.isActive(buyer.address, 1n)).to.equal(true);
      const info = await activation.getLicense(buyer.address, 1n);
      expect(info.hardwareHash).to.equal(buyerHash);
    });

    it("stops the seller from activating: they no longer own the license", async () => {
      const { activation, gameToken, seller } = await loadFixture(
        afterSaleFixture
      );

      expect(await gameToken.balanceOf(seller.address, 1n)).to.equal(0n);

      await expect(
        activation.connect(seller).activateLicense(1n, MACHINE_HASH)
      ).to.be.revertedWith("Activation: not license owner");
    });
  });

  describe("cancel listing", () => {
    it("returns the escrowed token to the seller", async () => {
      const { gameToken, marketplace, seller } = await loadFixture(
        listedFixture
      );

      await marketplace.connect(seller).cancelListing(1n);

      expect(await gameToken.balanceOf(seller.address, 1n)).to.equal(1n);
      expect(
        await gameToken.balanceOf(await marketplace.getAddress(), 1n)
      ).to.equal(0n);
    });

    it("closes the listing after cancel", async () => {
      const { marketplace, seller } = await loadFixture(listedFixture);

      await marketplace.connect(seller).cancelListing(1n);

      expect((await marketplace.getListing(1n)).isOpen).to.equal(false);
    });

    it("reverts when a non-seller tries to cancel", async () => {
      const { marketplace, buyer } = await loadFixture(listedFixture);

      await expect(
        marketplace.connect(buyer).cancelListing(1n)
      ).to.be.revertedWith("Marketplace: not seller");
    });
  });
});
