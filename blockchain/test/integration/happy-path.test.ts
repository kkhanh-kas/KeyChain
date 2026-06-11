import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import type {
  ActivationContract,
  GameStore,
  GameToken,
  KeyCoin,
} from "../../typechain-types";

// Happy path — ETH → KEY → buy license → activate → confirm.
// Walks the full primary-market lifecycle: a buyer mints KEY with ETH, the
// vendor registers a game, the buyer purchases a license (KEY → vendor, token
// minted to buyer), then binds it to a device via the ActivationContract.
describe("Integration: happy path (ETH → KEY → buy → activate)", () => {
  const INITIAL_RATE = 1000n; // KEY (base units) minted per wei of ETH
  const GAME_PRICE = ethers.parseEther("10"); // 10 KEY
  const ROYALTY_BPS = 500n; // 5%
  const GAME_NAME = "CryptoQuest";
  const GAME_URI = "ipfs://QmCryptoQuestMetadata";
  const MACHINE_HASH = buildMachineHash("device-001");

  // Helper: derive a deterministic machineHash from a label.
  function buildMachineHash(value: string): `0x${string}` {
    return ethers.keccak256(ethers.toUtf8Bytes(value)) as `0x${string}`;
  }

  // Helper: fund an account with KEY by buying `keyAmount` worth at INITIAL_RATE.
  async function fundKey(keyCoin: KeyCoin, account: any, keyAmount: bigint) {
    await keyCoin.connect(account).buyKeyCoin({ value: keyAmount / INITIAL_RATE });
  }

  async function deployFixture() {
    const [deployer, vendor, buyer] = await ethers.getSigners();

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

    // Wiring: GameStore mints licenses, vendor may register games.
    const MINTER_ROLE = await gameToken.MINTER_ROLE();
    const VENDOR_ROLE = await gameStore.VENDOR_ROLE();
    await gameToken
      .connect(deployer)
      .grantRole(MINTER_ROLE, await gameStore.getAddress());
    await gameStore.connect(deployer).grantRole(VENDOR_ROLE, vendor.address);

    return { keyCoin, gameToken, gameStore, activation, deployer, vendor, buyer };
  }

  // Game registered, buyer pre-funded with KEY and approved to spend at the store.
  async function registeredGameFixture() {
    const ctx = await deployFixture();
    const { keyCoin, gameStore, vendor, buyer } = ctx;

    await gameStore
      .connect(vendor)
      .registerGame(GAME_NAME, GAME_PRICE, ROYALTY_BPS, GAME_URI);

    await fundKey(keyCoin, buyer, ethers.parseEther("1000")); // 1000 KEY
    await keyCoin
      .connect(buyer)
      .approve(await gameStore.getAddress(), ethers.MaxUint256);

    return ctx;
  }

  // Buyer additionally owns one license unit (ready to activate).
  async function purchasedLicenseFixture() {
    const ctx = await registeredGameFixture();
    await ctx.gameStore.connect(ctx.buyer).purchaseLicense(1n);
    return ctx;
  }

  describe("step 1 — buy KEY with ETH", () => {
    it("mints exactly 10 KEY for 0.01 ETH at rate 1000", async () => {
      const { keyCoin, buyer } = await loadFixture(deployFixture);

      const ethSent = ethers.parseEther("0.01");
      await keyCoin.connect(buyer).buyKeyCoin({ value: ethSent });

      expect(await keyCoin.balanceOf(buyer.address)).to.equal(
        ethSent * INITIAL_RATE
      );
    });

    it("mints exactly 1000 KEY for 1 ETH", async () => {
      const { keyCoin, buyer } = await loadFixture(deployFixture);

      await keyCoin.connect(buyer).buyKeyCoin({ value: ethers.parseEther("1") });

      expect(await keyCoin.balanceOf(buyer.address)).to.equal(
        ethers.parseEther("1000")
      );
    });

    it("decreases the buyer ETH balance by amount sent plus gas", async () => {
      const { keyCoin, buyer } = await loadFixture(deployFixture);

      const ethSent = ethers.parseEther("0.5");
      const balBefore = await ethers.provider.getBalance(buyer.address);

      const tx = await keyCoin.connect(buyer).buyKeyCoin({ value: ethSent });
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;

      const balAfter = await ethers.provider.getBalance(buyer.address);
      expect(balBefore - balAfter).to.equal(ethSent + gasCost);
    });

    it("forwards the ETH to the KeyCoin contract", async () => {
      const { keyCoin, buyer } = await loadFixture(deployFixture);

      const ethSent = ethers.parseEther("0.1");
      await keyCoin.connect(buyer).buyKeyCoin({ value: ethSent });

      expect(
        await ethers.provider.getBalance(await keyCoin.getAddress())
      ).to.equal(ethSent);
    });

    it("reverts when the buyer sends 0 ETH", async () => {
      const { keyCoin, buyer } = await loadFixture(deployFixture);

      await expect(
        keyCoin.connect(buyer).buyKeyCoin({ value: 0n })
      ).to.be.revertedWith("KeyCoin: no ETH sent");
    });
  });

  describe("step 2 — vendor registers a game", () => {
    it("lists the game in the catalog with the right info", async () => {
      const { gameStore, vendor } = await loadFixture(deployFixture);

      await gameStore
        .connect(vendor)
        .registerGame(GAME_NAME, GAME_PRICE, ROYALTY_BPS, GAME_URI);

      const [ids, infos] = await gameStore.getCatalog();
      expect(ids.length).to.equal(1);
      expect(infos[0].name).to.equal(GAME_NAME);
      expect(infos[0].price).to.equal(GAME_PRICE);
      expect(infos[0].isListed).to.equal(true);
      expect(infos[0].vendorAddress).to.equal(vendor.address);
    });

    it("sets the GameToken metadata URI", async () => {
      const { gameStore, gameToken, vendor } = await loadFixture(deployFixture);

      await gameStore
        .connect(vendor)
        .registerGame(GAME_NAME, GAME_PRICE, ROYALTY_BPS, GAME_URI);

      expect(await gameToken.uri(1n)).to.equal(GAME_URI);
    });

    it("sets the ERC-2981 royalty to the vendor", async () => {
      const { gameStore, gameToken, vendor } = await loadFixture(deployFixture);

      await gameStore
        .connect(vendor)
        .registerGame(GAME_NAME, GAME_PRICE, ROYALTY_BPS, GAME_URI);

      const salePrice = ethers.parseEther("100");
      const [receiver, royaltyAmount] = await gameToken.royaltyInfo(
        1n,
        salePrice
      );

      expect(receiver).to.equal(vendor.address);
      expect(royaltyAmount).to.equal((salePrice * ROYALTY_BPS) / 10_000n);
    });
  });

  describe("step 3 — buy a license from the store", () => {
    it("mints one GameToken to the buyer", async () => {
      const { gameStore, gameToken, buyer } = await loadFixture(
        registeredGameFixture
      );

      await gameStore.connect(buyer).purchaseLicense(1n);

      expect(await gameToken.balanceOf(buyer.address, 1n)).to.equal(1n);
    });

    it("decreases the buyer KEY balance by the game price", async () => {
      const { gameStore, keyCoin, buyer } = await loadFixture(
        registeredGameFixture
      );

      const keyBefore = await keyCoin.balanceOf(buyer.address);
      await gameStore.connect(buyer).purchaseLicense(1n);
      const keyAfter = await keyCoin.balanceOf(buyer.address);

      expect(keyBefore - keyAfter).to.equal(GAME_PRICE);
    });

    it("increases the vendor KEY balance by the game price", async () => {
      const { gameStore, keyCoin, vendor, buyer } = await loadFixture(
        registeredGameFixture
      );

      const vendorBefore = await keyCoin.balanceOf(vendor.address);
      await gameStore.connect(buyer).purchaseLicense(1n);
      const vendorAfter = await keyCoin.balanceOf(vendor.address);

      expect(vendorAfter - vendorBefore).to.equal(GAME_PRICE);
    });

    it("emits LicensePurchased with the right args", async () => {
      const { gameStore, vendor, buyer } = await loadFixture(
        registeredGameFixture
      );

      await expect(gameStore.connect(buyer).purchaseLicense(1n))
        .to.emit(gameStore, "LicensePurchased")
        .withArgs(1n, buyer.address, vendor.address, GAME_PRICE);
    });

    it("reverts when the buyer has insufficient KEY", async () => {
      const { keyCoin, gameStore, vendor, buyer } = await loadFixture(
        deployFixture
      );

      await gameStore
        .connect(vendor)
        .registerGame(GAME_NAME, GAME_PRICE, ROYALTY_BPS, GAME_URI);

      // Only 5 KEY funded, below the 10 KEY price.
      await fundKey(keyCoin, buyer, ethers.parseEther("5"));
      await keyCoin
        .connect(buyer)
        .approve(await gameStore.getAddress(), ethers.MaxUint256);

      await expect(gameStore.connect(buyer).purchaseLicense(1n)).to.be.reverted;
    });

    it("reverts when the buyer has not approved KEY spending", async () => {
      const { keyCoin, gameStore, vendor, buyer } = await loadFixture(
        deployFixture
      );

      await gameStore
        .connect(vendor)
        .registerGame(GAME_NAME, GAME_PRICE, ROYALTY_BPS, GAME_URI);
      await fundKey(keyCoin, buyer, ethers.parseEther("1000"));
      // No approve.

      await expect(gameStore.connect(buyer).purchaseLicense(1n)).to.be.reverted;
    });
  });

  describe("step 4 — activate the license", () => {
    it("reports isActive after activation", async () => {
      const { activation, buyer } = await loadFixture(purchasedLicenseFixture);

      await activation.connect(buyer).activateLicense(1n, MACHINE_HASH);

      expect(await activation.isActive(buyer.address, 1n)).to.equal(true);
    });

    it("records the hardwareHash and active flag", async () => {
      const { activation, buyer } = await loadFixture(purchasedLicenseFixture);

      await activation.connect(buyer).activateLicense(1n, MACHINE_HASH);

      const info = await activation.getLicense(buyer.address, 1n);
      expect(info.hardwareHash).to.equal(MACHINE_HASH);
      expect(info.isActive).to.equal(true);
    });

    it("stamps activatedAt with the block timestamp", async () => {
      const { activation, buyer } = await loadFixture(purchasedLicenseFixture);

      const tx = await activation
        .connect(buyer)
        .activateLicense(1n, MACHINE_HASH);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      const info = await activation.getLicense(buyer.address, 1n);
      expect(info.activatedAt).to.equal(BigInt(block!.timestamp));
    });

    it("reverts when the caller does not own the license", async () => {
      const { activation, deployer } = await loadFixture(
        purchasedLicenseFixture
      );

      await expect(
        activation.connect(deployer).activateLicense(1n, MACHINE_HASH)
      ).to.be.revertedWith("Activation: not license owner");
    });

    it("reverts when activating an already-active license", async () => {
      const { activation, buyer } = await loadFixture(purchasedLicenseFixture);

      await activation.connect(buyer).activateLicense(1n, MACHINE_HASH);

      await expect(
        activation.connect(buyer).activateLicense(1n, MACHINE_HASH)
      ).to.be.revertedWith("Activation: already active");
    });
  });

  describe("step 5 — full end-to-end flow", () => {
    it("runs ETH → KEY → buy → activate and settles all state", async () => {
      const { keyCoin, gameToken, gameStore, activation, vendor, buyer } =
        await loadFixture(deployFixture);

      // Vendor registers the game.
      await gameStore
        .connect(vendor)
        .registerGame(GAME_NAME, GAME_PRICE, ROYALTY_BPS, GAME_URI);

      // Buyer mints KEY with ETH.
      await keyCoin.connect(buyer).buyKeyCoin({ value: ethers.parseEther("1") });
      expect(await keyCoin.balanceOf(buyer.address)).to.equal(
        ethers.parseEther("1000")
      );

      // Buyer purchases the license.
      await keyCoin
        .connect(buyer)
        .approve(await gameStore.getAddress(), ethers.MaxUint256);
      await gameStore.connect(buyer).purchaseLicense(1n);

      expect(await gameToken.balanceOf(buyer.address, 1n)).to.equal(1n);
      expect(await keyCoin.balanceOf(vendor.address)).to.equal(GAME_PRICE);
      expect(await keyCoin.balanceOf(buyer.address)).to.equal(
        ethers.parseEther("1000") - GAME_PRICE
      );

      // Buyer activates the license.
      await activation.connect(buyer).activateLicense(1n, MACHINE_HASH);
      expect(await activation.isActive(buyer.address, 1n)).to.equal(true);

      const info = await activation.getLicense(buyer.address, 1n);
      expect(info.isActive).to.equal(true);
      expect(info.hardwareHash).to.equal(MACHINE_HASH);
      expect(info.activatedAt).to.be.gt(0n);
    });
  });
});
