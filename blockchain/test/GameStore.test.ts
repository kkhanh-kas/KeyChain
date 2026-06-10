import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

// GameStore — the primary market. Vendors register games (which creates the
// ERC-1155 token) and can pause sales; buyers purchase a license by paying KEY,
// which is forwarded to the vendor and mints them a license unit.
describe("GameStore", () => {
  const INITIAL_RATE = 100n;
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

    // Wiring: the store mints licenses; the vendor may register games.
    await gameToken.grantRole(MINTER_ROLE, gameStore.target);
    await gameStore.grantRole(VENDOR_ROLE, vendor.address);

    return { keyCoin, gameToken, gameStore, admin, vendor, buyer, unauthorizedUser };
  }

  describe("deployment and roles", () => {
    it("stores the KeyCoin and GameToken addresses", async () => {
      const { gameStore, keyCoin, gameToken } = await loadFixture(
        deployGameStoreFixture
      );
      expect(await gameStore.keyCoin()).to.equal(keyCoin.target);
      expect(await gameStore.gameToken()).to.equal(gameToken.target);
    });
  });

  describe("registerGame", () => {
    it("lets a vendor register a game and exposes it in the catalog", async () => {
      const { gameStore, gameToken, vendor } = await loadFixture(
        deployGameStoreFixture
      );
      const name = "Cyberpunk 2077";
      const price = ethers.parseEther("50");
      const royaltyBps = 1000n;
      const uri = "ipfs://game-uri";

      await gameStore.connect(vendor).registerGame(name, price, royaltyBps, uri);

      expect(await gameStore.gameVendor(1n)).to.equal(vendor.address);

      const [ids, infos] = await gameStore.getCatalog();
      expect(ids[0]).to.equal(1n);
      expect(infos[0].name).to.equal(name);
      expect(infos[0].price).to.equal(price);
      expect(infos[0].isListed).to.equal(true);

      // registerGame also creates the ERC-1155 token with its URI.
      expect(await gameToken.uri(1n)).to.equal(uri);
    });

    it("reverts when a non-vendor tries to register a game", async () => {
      const { gameStore, unauthorizedUser } = await loadFixture(
        deployGameStoreFixture
      );
      await expect(
        gameStore
          .connect(unauthorizedUser)
          .registerGame("Game", 100n, 500n, "ipfs://")
      )
        .to.be.revertedWithCustomError(
          gameStore,
          "AccessControlUnauthorizedAccount"
        )
        .withArgs(unauthorizedUser.address, VENDOR_ROLE);
    });
  });

  describe("setGameListed", () => {
    it("lets the owning vendor pause and resume sales", async () => {
      const { gameStore, vendor } = await loadFixture(deployGameStoreFixture);
      await gameStore.connect(vendor).registerGame("Game", 100n, 500n, "ipfs://");

      await gameStore.connect(vendor).setGameListed(1n, false);
      let catalog = await gameStore.getCatalog();
      expect(catalog.infos[0].isListed).to.equal(false);

      await gameStore.connect(vendor).setGameListed(1n, true);
      catalog = await gameStore.getCatalog();
      expect(catalog.infos[0].isListed).to.equal(true);
    });

    it("lets the admin take down (pause) any game", async () => {
      const { gameStore, admin, vendor } = await loadFixture(
        deployGameStoreFixture
      );
      await gameStore.connect(vendor).registerGame("Game", 100n, 500n, "ipfs://");
      await gameStore.connect(admin).setGameListed(1n, false);
      const catalog = await gameStore.getCatalog();
      expect(catalog.infos[0].isListed).to.equal(false);
    });

    it("reverts when an unauthorized user tries to list/unlist a game", async () => {
      const { gameStore, vendor, unauthorizedUser } = await loadFixture(
        deployGameStoreFixture
      );
      await gameStore.connect(vendor).registerGame("Game", 100n, 500n, "ipfs://");

      await expect(
        gameStore.connect(unauthorizedUser).setGameListed(1n, false)
      ).to.be.revertedWith("GameStore: not authorized");
    });
  });

  describe("purchaseLicense", () => {
    // Extends the base fixture with a registered game and a funded, approved buyer.
    async function deployAndRegisterFixture() {
      const fixture = await deployGameStoreFixture();
      const price = ethers.parseEther("50");
      await fixture.gameStore
        .connect(fixture.vendor)
        .registerGame("GTA VI", price, 500n, "ipfs://");
      await fixture.keyCoin
        .connect(fixture.buyer)
        .buyKeyCoin({ value: ethers.parseEther("1") });
      await fixture.keyCoin
        .connect(fixture.buyer)
        .approve(fixture.gameStore.target, price);
      return { ...fixture, gameId: 1n, price };
    }

    it("lets a buyer purchase a license, paying the vendor and minting the unit", async () => {
      const { gameStore, gameToken, keyCoin, vendor, buyer, gameId, price } =
        await loadFixture(deployAndRegisterFixture);
      const initialVendorBalance = await keyCoin.balanceOf(vendor.address);
      const initialBuyerBalance = await keyCoin.balanceOf(buyer.address);

      await expect(gameStore.connect(buyer).purchaseLicense(gameId))
        .to.emit(gameStore, "LicensePurchased")
        .withArgs(gameId, buyer.address, vendor.address, price);

      expect(await keyCoin.balanceOf(vendor.address)).to.equal(
        initialVendorBalance + price
      );
      expect(await keyCoin.balanceOf(buyer.address)).to.equal(
        initialBuyerBalance - price
      );
      expect(await gameToken.balanceOf(buyer.address, gameId)).to.equal(1n);
    });

    it("reverts when the game is not listed", async () => {
      const { gameStore, vendor, buyer, gameId } = await loadFixture(
        deployAndRegisterFixture
      );
      await gameStore.connect(vendor).setGameListed(gameId, false);
      await expect(
        gameStore.connect(buyer).purchaseLicense(gameId)
      ).to.be.revertedWith("GameStore: not listed");
    });

    it("reverts when the buyer has not approved enough KEY", async () => {
      const { gameStore, keyCoin, buyer, gameId } = await loadFixture(
        deployAndRegisterFixture
      );
      await keyCoin.connect(buyer).approve(gameStore.target, 0n);
      await expect(
        gameStore.connect(buyer).purchaseLicense(gameId)
      ).to.be.revertedWithCustomError(keyCoin, "ERC20InsufficientAllowance");
    });
  });

  describe("getCatalog", () => {
    it("returns every registered game", async () => {
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
