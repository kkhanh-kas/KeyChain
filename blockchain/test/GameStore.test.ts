import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameStore", function () {
  const INITIAL_RATE = 100n;
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
  const VENDOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VENDOR_ROLE"));
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));

  async function deployGameStoreFixture() {
    const [admin, vendor, buyer, unauthorizedUser] = await ethers.getSigners();

    const KeyCoin = await ethers.getContractFactory("KeyCoin");
    const keyCoin = await KeyCoin.deploy(INITIAL_RATE);

    const GameToken = await ethers.getContractFactory("GameToken");
    const gameToken = await GameToken.deploy();

    const GameStore = await ethers.getContractFactory("GameStore");
    const gameStore = await GameStore.deploy(keyCoin.target, gameToken.target);

    await gameToken.grantRole(MINTER_ROLE, gameStore.target);
    await gameStore.grantRole(VENDOR_ROLE, vendor.address);

    return { keyCoin, gameToken, gameStore, admin, vendor, buyer, unauthorizedUser };
  }

  describe("Deployment & Roles", function () {
    it("Should set the correct KeyCoin and GameToken addresses", async function () {
      const { gameStore, keyCoin, gameToken } = await loadFixture(deployGameStoreFixture);
      expect(await gameStore.keyCoin()).to.equal(keyCoin.target);
      expect(await gameStore.gameToken()).to.equal(gameToken.target);
    });
  });

  describe("registerGame", function () {
    it("Should allow VENDOR_ROLE to register a game", async function () {
      const { gameStore, gameToken, vendor } = await loadFixture(deployGameStoreFixture);
      const name = "Cyberpunk 2077";
      const price = ethers.parseEther("50");
      const royaltyBps = 1000n;
      const uri = "ipfs://game-uri";

      await gameStore.connect(vendor).registerGame(name, price, royaltyBps, uri);

      const vendorAddress = await gameStore.gameVendor(1n);
      expect(vendorAddress).to.equal(vendor.address);

      const [ids, infos] = await gameStore.getCatalog();
      expect(ids[0]).to.equal(1n);
      expect(infos[0].name).to.equal(name);
      expect(infos[0].price).to.equal(price);
      expect(infos[0].isListed).to.be.true;

      expect(await gameToken.uri(1n)).to.equal(uri);
    });

    it("Should revert if non-vendor tries to register a game", async function () {
      const { gameStore, unauthorizedUser } = await loadFixture(deployGameStoreFixture);
      await expect(
        gameStore.connect(unauthorizedUser).registerGame("Game", 100n, 500n, "ipfs://")
      ).to.be.revertedWithCustomError(gameStore, "AccessControlUnauthorizedAccount")
        .withArgs(unauthorizedUser.address, VENDOR_ROLE);
    });
  });

  describe("setGameListed", function () {
    it("Should allow the owning vendor to pause and resume game sales", async function () {
      const { gameStore, vendor } = await loadFixture(deployGameStoreFixture);
      await gameStore.connect(vendor).registerGame("Game", 100n, 500n, "ipfs://");
      
      await gameStore.connect(vendor).setGameListed(1n, false);
      let catalog = await gameStore.getCatalog();
      expect(catalog.infos[0].isListed).to.be.false;

      await gameStore.connect(vendor).setGameListed(1n, true);
      catalog = await gameStore.getCatalog();
      expect(catalog.infos[0].isListed).to.be.true;
    });

    it("Should allow admin to takedown (pause) any game", async function () {
      const { gameStore, admin, vendor } = await loadFixture(deployGameStoreFixture);
      await gameStore.connect(vendor).registerGame("Game", 100n, 500n, "ipfs://");     
      await gameStore.connect(admin).setGameListed(1n, false);
      const catalog = await gameStore.getCatalog();
      expect(catalog.infos[0].isListed).to.be.false;
    });

    it("Should revert if unauthorized user tries to list/unlist a game", async function () {
      const { gameStore, vendor, unauthorizedUser } = await loadFixture(deployGameStoreFixture);
      await gameStore.connect(vendor).registerGame("Game", 100n, 500n, "ipfs://");

      await expect(
        gameStore.connect(unauthorizedUser).setGameListed(1n, false)
      ).to.be.revertedWith("GameStore: not authorized");
    });
  });

  describe("purchaseLicense", function () {
    async function deployAndRegisterFixture() {
      const fixture = await deployGameStoreFixture();
      const price = ethers.parseEther("50");
      await fixture.gameStore.connect(fixture.vendor).registerGame("GTA VI", price, 500n, "ipfs://");
      await fixture.keyCoin.connect(fixture.buyer).buyKeyCoin({ value: ethers.parseEther("1") });
      await fixture.keyCoin.connect(fixture.buyer).approve(fixture.gameStore.target, price);
      return { ...fixture, gameId: 1n, price };
    }

    it("Should allow user to purchase a license and emit event", async function () {
      const { gameStore, gameToken, keyCoin, vendor, buyer, gameId, price } = await loadFixture(deployAndRegisterFixture);
      const initialVendorBalance = await keyCoin.balanceOf(vendor.address);
      const initialBuyerBalance = await keyCoin.balanceOf(buyer.address);

      await expect(gameStore.connect(buyer).purchaseLicense(gameId))
        .to.emit(gameStore, "LicensePurchased")
        .withArgs(gameId, buyer.address, vendor.address, price);

      expect(await keyCoin.balanceOf(vendor.address)).to.equal(initialVendorBalance + price);
      expect(await keyCoin.balanceOf(buyer.address)).to.equal(initialBuyerBalance - price);
      expect(await gameToken.balanceOf(buyer.address, gameId)).to.equal(1n);
    });

    it("Should revert if the game is not listed", async function () {
      const { gameStore, vendor, buyer, gameId } = await loadFixture(deployAndRegisterFixture);
      await gameStore.connect(vendor).setGameListed(gameId, false);
      await expect(gameStore.connect(buyer).purchaseLicense(gameId))
        .to.be.revertedWith("GameStore: not listed");
    });

    it("Should revert if buyer does not have enough KEY approved", async function () {
      const { gameStore, keyCoin, buyer, gameId } = await loadFixture(deployAndRegisterFixture);
      await keyCoin.connect(buyer).approve(gameStore.target, 0n);
      await expect(gameStore.connect(buyer).purchaseLicense(gameId))
        .to.be.revertedWithCustomError(keyCoin, "ERC20InsufficientAllowance");
    });
  });

  describe("getCatalog", function () {
    it("Should return correctly all registered games", async function () {
      const { gameStore, vendor } = await loadFixture(deployGameStoreFixture);
      await gameStore.connect(vendor).registerGame("Game 1", 10n, 100n, "ipfs://1");
      await gameStore.connect(vendor).registerGame("Game 2", 20n, 200n, "ipfs://2");

      const [ids, infos] = await gameStore.getCatalog();
      expect(ids.length).to.equal(2);
      expect(ids[0]).to.equal(1n);
      expect(infos[0].name).to.equal("Game 1");
      expect(ids[1]).to.equal(2n);
      expect(infos[1].price).to.equal(20n);
    });
  });
});