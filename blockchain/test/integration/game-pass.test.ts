import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import type {
  GamePass,
  GameStore,
  GameToken,
  KeyCoin,
} from "../../typechain-types";

// GamePass — subscribe → expire → renew.
// A single subscribe(gameId, months) handles first-time, early renewal
// (stacking onto the current expiry) and lapsed renewal (restarting from now):
// expiry = max(currentExpiry, now) + months * MONTH.
describe("Integration: game pass (subscribe → expire → renew)", () => {
  const INITIAL_RATE = 1000n; // KEY (base units) minted per wei of ETH
  const MONTH = 30n * 24n * 3600n; // 30 days in seconds
  const GAME_PRICE = ethers.parseEther("10"); // 10 KEY — primary market
  const MONTHLY_PRICE = ethers.parseEther("3"); // 3 KEY / month
  const ROYALTY_BPS = 500n; // 5%
  const GAME_NAME = "CryptoQuest";
  const GAME_URI = "ipfs://QmGamePassTest";
  const GAME_ID = 1n;

  // Helper: fund an account with KEY by buying `keyAmount` worth at INITIAL_RATE.
  async function fundKey(keyCoin: KeyCoin, account: any, keyAmount: bigint) {
    await keyCoin.connect(account).buyKeyCoin({ value: keyAmount / INITIAL_RATE });
  }

  // Game registered (so a vendor exists for it), but no pass configured yet.
  async function baseFixture() {
    const [deployer, vendor, subscriber, stranger] = await ethers.getSigners();

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

    const GamePassFactory = await ethers.getContractFactory("GamePass");
    const gamePass = (await GamePassFactory.connect(deployer).deploy(
      await keyCoin.getAddress(),
      await gameStore.getAddress()
    )) as unknown as GamePass;
    await gamePass.waitForDeployment();

    // Wiring: store mints licenses, vendor registers a game.
    const MINTER_ROLE = await gameToken.MINTER_ROLE();
    const VENDOR_ROLE = await gameStore.VENDOR_ROLE();
    await gameToken
      .connect(deployer)
      .grantRole(MINTER_ROLE, await gameStore.getAddress());
    await gameStore.connect(deployer).grantRole(VENDOR_ROLE, vendor.address);
    await gameStore
      .connect(vendor)
      .registerGame(GAME_NAME, GAME_PRICE, ROYALTY_BPS, GAME_URI);

    return {
      keyCoin,
      gameToken,
      gameStore,
      gamePass,
      deployer,
      vendor,
      subscriber,
      stranger,
    };
  }

  // Pass registered for the game; subscriber funded with KEY and approved.
  async function withPassFixture() {
    const ctx = await baseFixture();
    const { keyCoin, gamePass, vendor, subscriber } = ctx;

    await gamePass.connect(vendor).registerPass(GAME_ID, MONTHLY_PRICE);

    await fundKey(keyCoin, subscriber, ethers.parseEther("1000"));
    await keyCoin
      .connect(subscriber)
      .approve(await gamePass.getAddress(), ethers.MaxUint256);

    return ctx;
  }

  describe("registerPass", () => {
    it("lets the game vendor register a pass", async () => {
      const { gamePass, vendor } = await loadFixture(baseFixture);

      await expect(
        gamePass.connect(vendor).registerPass(GAME_ID, MONTHLY_PRICE)
      ).to.not.be.reverted;
    });

    it("reverts when a non-vendor tries to register a pass", async () => {
      const { gamePass, stranger } = await loadFixture(baseFixture);

      await expect(
        gamePass.connect(stranger).registerPass(GAME_ID, MONTHLY_PRICE)
      ).to.be.revertedWith("GamePass: not game vendor");
    });

    it("reverts subscribe when the pass is not registered", async () => {
      const { keyCoin, gamePass, subscriber } = await loadFixture(baseFixture);

      await fundKey(keyCoin, subscriber, ethers.parseEther("1000"));
      await keyCoin
        .connect(subscriber)
        .approve(await gamePass.getAddress(), ethers.MaxUint256);

      await expect(
        gamePass.connect(subscriber).subscribe(GAME_ID, 1n)
      ).to.be.revertedWith("GamePass: pass not registered");
    });
  });

  describe("step 1 — first subscribe", () => {
    it("starts at expiry 0 before subscribing", async () => {
      const { gamePass, subscriber } = await loadFixture(withPassFixture);
      expect(await gamePass.expiryOf(subscriber.address, GAME_ID)).to.equal(0n);
    });

    it("sets expiry to now + 30 days for a 1-month subscription", async () => {
      const { gamePass, subscriber } = await loadFixture(withPassFixture);

      const tx = await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      const expected = BigInt(block!.timestamp) + MONTH;

      expect(await gamePass.expiryOf(subscriber.address, GAME_ID)).to.equal(
        expected
      );
    });

    it("sets expiry to now + 90 days for a 3-month subscription", async () => {
      const { gamePass, subscriber } = await loadFixture(withPassFixture);

      const tx = await gamePass.connect(subscriber).subscribe(GAME_ID, 3n);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      const expected = BigInt(block!.timestamp) + MONTH * 3n;

      expect(await gamePass.expiryOf(subscriber.address, GAME_ID)).to.equal(
        expected
      );
    });

    it("charges the subscriber one month's price for 1 month", async () => {
      const { gamePass, keyCoin, subscriber } = await loadFixture(
        withPassFixture
      );

      const keyBefore = await keyCoin.balanceOf(subscriber.address);
      await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);
      const keyAfter = await keyCoin.balanceOf(subscriber.address);

      expect(keyBefore - keyAfter).to.equal(MONTHLY_PRICE);
    });

    it("charges three months' price for 3 months", async () => {
      const { gamePass, keyCoin, subscriber } = await loadFixture(
        withPassFixture
      );

      const keyBefore = await keyCoin.balanceOf(subscriber.address);
      await gamePass.connect(subscriber).subscribe(GAME_ID, 3n);
      const keyAfter = await keyCoin.balanceOf(subscriber.address);

      expect(keyBefore - keyAfter).to.equal(MONTHLY_PRICE * 3n);
    });

    it("pays the vendor the subscription cost", async () => {
      const { gamePass, keyCoin, vendor, subscriber } = await loadFixture(
        withPassFixture
      );

      const vendorBefore = await keyCoin.balanceOf(vendor.address);
      await gamePass.connect(subscriber).subscribe(GAME_ID, 2n);
      const vendorAfter = await keyCoin.balanceOf(vendor.address);

      expect(vendorAfter - vendorBefore).to.equal(MONTHLY_PRICE * 2n);
    });

    it("emits PassSubscribed with the right args", async () => {
      const { gamePass, subscriber } = await loadFixture(withPassFixture);

      const tx = await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      const expected = BigInt(block!.timestamp) + MONTH;

      await expect(tx)
        .to.emit(gamePass, "PassSubscribed")
        .withArgs(GAME_ID, subscriber.address, 1n, expected);
    });

    it("makes the pass valid immediately (expiry > now)", async () => {
      const { gamePass, subscriber } = await loadFixture(withPassFixture);

      await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);

      const expiry = await gamePass.expiryOf(subscriber.address, GAME_ID);
      expect(expiry).to.be.gt(BigInt(await time.latest()));
    });
  });

  describe("step 2 — pass expires", () => {
    it("falls behind now after 31 days", async () => {
      const { gamePass, subscriber } = await loadFixture(withPassFixture);

      await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);
      await time.increase(31 * 24 * 3600);

      const expiry = await gamePass.expiryOf(subscriber.address, GAME_ID);
      expect(expiry).to.be.lt(BigInt(await time.latest()));
    });

    it("keeps a 3-month pass valid at 89 days and expired at 91 days", async () => {
      const { gamePass, subscriber } = await loadFixture(withPassFixture);

      await gamePass.connect(subscriber).subscribe(GAME_ID, 3n);

      await time.increase(89 * 24 * 3600);
      expect(
        await gamePass.expiryOf(subscriber.address, GAME_ID)
      ).to.be.gt(BigInt(await time.latest()));

      await time.increase(2 * 24 * 3600);
      expect(
        await gamePass.expiryOf(subscriber.address, GAME_ID)
      ).to.be.lt(BigInt(await time.latest()));
    });

    it("keeps the stored expiry value after lapsing (no auto-reset)", async () => {
      const { gamePass, subscriber } = await loadFixture(withPassFixture);

      const tx = await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      const stored = BigInt(block!.timestamp) + MONTH;

      await time.increase(31 * 24 * 3600);

      expect(await gamePass.expiryOf(subscriber.address, GAME_ID)).to.equal(
        stored
      );
    });
  });

  describe("step 3 — renew while still valid (stacks)", () => {
    it("stacks the new term onto the existing expiry", async () => {
      const { gamePass, subscriber } = await loadFixture(withPassFixture);

      await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);
      const afterFirst = await gamePass.expiryOf(subscriber.address, GAME_ID);

      await time.increase(15 * 24 * 3600); // still valid
      await gamePass.connect(subscriber).subscribe(GAME_ID, 2n);

      expect(await gamePass.expiryOf(subscriber.address, GAME_ID)).to.equal(
        afterFirst + MONTH * 2n
      );
    });

    it("stacks correctly across three consecutive renewals", async () => {
      const { gamePass, subscriber } = await loadFixture(withPassFixture);

      const tx1 = await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);
      const receipt1 = await tx1.wait();
      const block1 = await ethers.provider.getBlock(receipt1!.blockNumber);
      const expiry1 = BigInt(block1!.timestamp) + MONTH;

      await gamePass.connect(subscriber).subscribe(GAME_ID, 2n);
      const expiry2 = await gamePass.expiryOf(subscriber.address, GAME_ID);
      expect(expiry2).to.equal(expiry1 + MONTH * 2n);

      await gamePass.connect(subscriber).subscribe(GAME_ID, 3n);
      const expiry3 = await gamePass.expiryOf(subscriber.address, GAME_ID);
      expect(expiry3).to.equal(expiry2 + MONTH * 3n);
    });

    it("charges per renewed month", async () => {
      const { gamePass, keyCoin, subscriber } = await loadFixture(
        withPassFixture
      );

      await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);
      await time.increase(15 * 24 * 3600);

      const keyBefore = await keyCoin.balanceOf(subscriber.address);
      await gamePass.connect(subscriber).subscribe(GAME_ID, 3n);
      const keyAfter = await keyCoin.balanceOf(subscriber.address);

      expect(keyBefore - keyAfter).to.equal(MONTHLY_PRICE * 3n);
    });
  });

  describe("step 4 — renew after expiry (restarts from now)", () => {
    it("restarts from now instead of stacking onto the old expiry", async () => {
      const { gamePass, subscriber } = await loadFixture(withPassFixture);

      await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);
      const afterFirst = await gamePass.expiryOf(subscriber.address, GAME_ID);

      await time.increase(31 * 24 * 3600); // expired

      const tx = await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      const expected = BigInt(block!.timestamp) + MONTH;

      const actual = await gamePass.expiryOf(subscriber.address, GAME_ID);
      expect(actual).to.not.equal(afterFirst + MONTH);
      expect(actual).to.equal(expected);
    });

    it("makes the renewed pass valid immediately (expiry > now)", async () => {
      const { gamePass, subscriber } = await loadFixture(withPassFixture);

      await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);
      await time.increase(31 * 24 * 3600);

      await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);

      expect(
        await gamePass.expiryOf(subscriber.address, GAME_ID)
      ).to.be.gt(BigInt(await time.latest()));
    });

    it("sets expiry to now + 90 days when renewing 3 months after expiry", async () => {
      const { gamePass, subscriber } = await loadFixture(withPassFixture);

      await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);
      await time.increase(31 * 24 * 3600);

      const tx = await gamePass.connect(subscriber).subscribe(GAME_ID, 3n);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      const expected = BigInt(block!.timestamp) + MONTH * 3n;

      expect(await gamePass.expiryOf(subscriber.address, GAME_ID)).to.equal(
        expected
      );
    });

    it("emits PassSubscribed with the restarted expiry", async () => {
      const { gamePass, subscriber } = await loadFixture(withPassFixture);

      await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);
      await time.increase(31 * 24 * 3600);

      const tx = await gamePass.connect(subscriber).subscribe(GAME_ID, 2n);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      const expected = BigInt(block!.timestamp) + MONTH * 2n;

      await expect(tx)
        .to.emit(gamePass, "PassSubscribed")
        .withArgs(GAME_ID, subscriber.address, 2n, expected);
    });
  });

  describe("validation — months bounds", () => {
    it("reverts when months is 0", async () => {
      const { gamePass, subscriber } = await loadFixture(withPassFixture);
      await expect(
        gamePass.connect(subscriber).subscribe(GAME_ID, 0n)
      ).to.be.revertedWith("GamePass: months out of range");
    });

    it("reverts when months exceeds 12", async () => {
      const { gamePass, subscriber } = await loadFixture(withPassFixture);
      await expect(
        gamePass.connect(subscriber).subscribe(GAME_ID, 13n)
      ).to.be.revertedWith("GamePass: months out of range");
    });

    it("accepts months = 1", async () => {
      const { gamePass, subscriber } = await loadFixture(withPassFixture);
      await expect(
        gamePass.connect(subscriber).subscribe(GAME_ID, 1n)
      ).to.not.be.reverted;
    });

    it("accepts months = 12 (max)", async () => {
      const { gamePass, subscriber } = await loadFixture(withPassFixture);
      await expect(
        gamePass.connect(subscriber).subscribe(GAME_ID, 12n)
      ).to.not.be.reverted;
    });

    it("charges twelve months' price for months = 12", async () => {
      const { gamePass, keyCoin, subscriber } = await loadFixture(
        withPassFixture
      );

      const keyBefore = await keyCoin.balanceOf(subscriber.address);
      await gamePass.connect(subscriber).subscribe(GAME_ID, 12n);
      const keyAfter = await keyCoin.balanceOf(subscriber.address);

      expect(keyBefore - keyAfter).to.equal(MONTHLY_PRICE * 12n);
    });
  });

  describe("MONTH constant", () => {
    it("equals 30 days (2592000 seconds)", async () => {
      const { gamePass } = await loadFixture(withPassFixture);
      expect(await gamePass.MONTH()).to.equal(MONTH);
    });
  });

  describe("independent subscribers", () => {
    it("tracks expiry per subscriber independently", async () => {
      const { keyCoin, gamePass, vendor } = await loadFixture(baseFixture);
      const [, , subscriber1, subscriber2] = await ethers.getSigners();

      await gamePass.connect(vendor).registerPass(GAME_ID, MONTHLY_PRICE);

      for (const sub of [subscriber1, subscriber2]) {
        await fundKey(keyCoin, sub, ethers.parseEther("1000"));
        await keyCoin
          .connect(sub)
          .approve(await gamePass.getAddress(), ethers.MaxUint256);
      }

      await gamePass.connect(subscriber1).subscribe(GAME_ID, 1n);
      await time.increase(5 * 24 * 3600);
      await gamePass.connect(subscriber2).subscribe(GAME_ID, 1n);

      const expiry1 = await gamePass.expiryOf(subscriber1.address, GAME_ID);
      const expiry2 = await gamePass.expiryOf(subscriber2.address, GAME_ID);

      expect(expiry2).to.be.gt(expiry1);
      expect(expiry2 - expiry1).to.be.closeTo(BigInt(5 * 24 * 3600), 5n);
    });
  });
});
