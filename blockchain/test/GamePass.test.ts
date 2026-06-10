import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import type { KeyCoin, GameToken, GameStore, GamePass } from "../typechain-types";

// GamePass — fixed-duration subscription licenses priced in KEY.
// One subscribe(gameId, months) handles first-time, early renewal (stacking),
// and lapsed renewal via expiry = max(currentExpiry, now) + months * MONTH.
describe("GamePass", () => {
  const MONTH = 30n * 24n * 3600n; // 30 days in seconds
  const INITIAL_RATE = 1000n;
  const MONTHLY_PRICE = ethers.parseEther("10");
  const GAME_ID = 1n;
  const GAME_ID_2 = 2n;
  const ROYALTY_BPS = 500n;
  const GAME_URI = "ipfs://QmTest";
  const GAME_NAME = "TestGame";
  const GAME_PRICE = ethers.parseEther("100");
  const LARGE_KEY = ethers.parseEther("1000");

  // Helper: fund an account with enough KEY to cover any subscription in these tests.
  async function buyEnoughKey(keyCoin: KeyCoin, account: any) {
    const ethNeeded = LARGE_KEY / INITIAL_RATE;
    await keyCoin.connect(account).buyKeyCoin({ value: ethNeeded });
  }

  async function deployGamePassFixture() {
    const [deployer, vendor, subscriber, otherUser] = await ethers.getSigners();

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

    // Wiring: store mints licenses, vendor registers a game then a pass for it.
    const MINTER_ROLE = await gameToken.MINTER_ROLE();
    const VENDOR_ROLE = await gameStore.VENDOR_ROLE();
    await gameToken
      .connect(deployer)
      .grantRole(MINTER_ROLE, await gameStore.getAddress());
    await gameStore.connect(deployer).grantRole(VENDOR_ROLE, vendor.address);
    await gameStore
      .connect(vendor)
      .registerGame(GAME_NAME, GAME_PRICE, ROYALTY_BPS, GAME_URI);
    await gamePass.connect(vendor).registerPass(GAME_ID, MONTHLY_PRICE);

    // Subscriber pre-funded and approves GamePass to pull KEY.
    await buyEnoughKey(keyCoin, subscriber);
    await keyCoin
      .connect(subscriber)
      .approve(await gamePass.getAddress(), ethers.MaxUint256);

    return {
      deployer,
      vendor,
      subscriber,
      otherUser,
      keyCoin,
      gameToken,
      gameStore,
      gamePass,
    };
  }

  describe("deployment", () => {
    it("stores the KeyCoin address it was constructed with", async () => {
      const { keyCoin, gamePass } = await loadFixture(deployGamePassFixture);

      expect(await gamePass.keyCoin()).to.equal(await keyCoin.getAddress());
    });

    it("stores the GameStore address it was constructed with", async () => {
      const { gameStore, gamePass } = await loadFixture(deployGamePassFixture);

      expect(await gamePass.gameStore()).to.equal(await gameStore.getAddress());
    });

    it("exposes MONTH as 30 days", async () => {
      const { gamePass } = await loadFixture(deployGamePassFixture);

      expect(await gamePass.MONTH()).to.equal(MONTH);
    });

    it("returns zero expiry before any subscription", async () => {
      const { gamePass, subscriber } = await loadFixture(deployGamePassFixture);

      expect(await gamePass.expiryOf(subscriber.address, GAME_ID)).to.equal(0n);
    });
  });

  describe("registerPass", () => {
    it("lets the game vendor register a pass", async () => {
      const { gameStore, gamePass, vendor } = await loadFixture(
        deployGamePassFixture
      );

      await gameStore
        .connect(vendor)
        .registerGame("Game 2", GAME_PRICE, ROYALTY_BPS, "ipfs://game-2");

      await expect(
        gamePass.connect(vendor).registerPass(GAME_ID_2, MONTHLY_PRICE)
      ).to.not.be.reverted;
    });

    it("updates the monthly price when the vendor re-registers the same pass", async () => {
      const { gamePass, keyCoin, vendor, subscriber } = await loadFixture(
        deployGamePassFixture
      );

      const newMonthlyPrice = ethers.parseEther("15");
      await gamePass.connect(vendor).registerPass(GAME_ID, newMonthlyPrice);

      const vendorBefore = await keyCoin.balanceOf(vendor.address);
      await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);
      const vendorAfter = await keyCoin.balanceOf(vendor.address);

      expect(vendorAfter - vendorBefore).to.equal(newMonthlyPrice);
    });

    it("reverts when a non-vendor tries to register a pass", async () => {
      const { gamePass, otherUser } = await loadFixture(deployGamePassFixture);

      await expect(
        gamePass.connect(otherUser).registerPass(GAME_ID, MONTHLY_PRICE)
      ).to.be.revertedWith("GamePass: not game vendor");
    });

    it("reverts when a subscriber tries to register a pass", async () => {
      const { gamePass, subscriber } = await loadFixture(deployGamePassFixture);

      await expect(
        gamePass.connect(subscriber).registerPass(GAME_ID, MONTHLY_PRICE)
      ).to.be.revertedWith("GamePass: not game vendor");
    });

    it("allows monthlyPrice = 0 because the contract has no price guard", async () => {
      const { gamePass, vendor } = await loadFixture(deployGamePassFixture);

      await expect(gamePass.connect(vendor).registerPass(GAME_ID, 0n)).to.not.be
        .reverted;
    });
  });

  describe("subscribe", () => {
    it("subscribes for a single month", async () => {
      const { gamePass, subscriber } = await loadFixture(deployGamePassFixture);

      await expect(gamePass.connect(subscriber).subscribe(GAME_ID, 1n)).to.not.be
        .reverted;
    });

    it("sets expiry ahead of the current block timestamp", async () => {
      const { gamePass, subscriber } = await loadFixture(deployGamePassFixture);

      const beforeSubscribe = await time.latest();

      await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);

      const expiry = await gamePass.expiryOf(subscriber.address, GAME_ID);
      expect(expiry).to.be.greaterThan(BigInt(beforeSubscribe));
    });

    it("charges months * monthlyPrice from subscriber to vendor", async () => {
      const { gamePass, keyCoin, subscriber, vendor } = await loadFixture(
        deployGamePassFixture
      );

      const months = 3n;
      const expectedCost = MONTHLY_PRICE * months;

      const vendorBefore = await keyCoin.balanceOf(vendor.address);
      const subscriberBefore = await keyCoin.balanceOf(subscriber.address);

      await gamePass.connect(subscriber).subscribe(GAME_ID, months);

      const vendorAfter = await keyCoin.balanceOf(vendor.address);
      const subscriberAfter = await keyCoin.balanceOf(subscriber.address);

      expect(vendorAfter - vendorBefore).to.equal(expectedCost);
      expect(subscriberBefore - subscriberAfter).to.equal(expectedCost);
    });

    it("emits PassSubscribed with the gameId, subscriber, months and expiry", async () => {
      const { gamePass, subscriber } = await loadFixture(deployGamePassFixture);

      const months = 2n;
      const tx = await gamePass.connect(subscriber).subscribe(GAME_ID, months);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      const expectedExpiry = BigInt(block!.timestamp) + months * MONTH;

      await expect(tx)
        .to.emit(gamePass, "PassSubscribed")
        .withArgs(GAME_ID, subscriber.address, months, expectedExpiry);
    });

    it("reverts when months is 0", async () => {
      const { gamePass, subscriber } = await loadFixture(deployGamePassFixture);

      await expect(
        gamePass.connect(subscriber).subscribe(GAME_ID, 0n)
      ).to.be.revertedWith("GamePass: months out of range");
    });

    it("reverts when months exceeds 12", async () => {
      const { gamePass, subscriber } = await loadFixture(deployGamePassFixture);

      await expect(
        gamePass.connect(subscriber).subscribe(GAME_ID, 13n)
      ).to.be.revertedWith("GamePass: months out of range");
    });

    it("allows subscribing for exactly 12 months", async () => {
      const { gamePass, subscriber } = await loadFixture(deployGamePassFixture);

      await expect(gamePass.connect(subscriber).subscribe(GAME_ID, 12n)).to.not.be
        .reverted;
    });

    it("reverts when the pass is not registered", async () => {
      const { gamePass, subscriber } = await loadFixture(deployGamePassFixture);

      await expect(
        gamePass.connect(subscriber).subscribe(999n, 1n)
      ).to.be.revertedWith("GamePass: pass not registered");
    });

    it("reverts when the subscriber has insufficient KEY balance", async () => {
      const { gamePass, keyCoin, otherUser } = await loadFixture(
        deployGamePassFixture
      );

      // otherUser approves but never bought KEY.
      await keyCoin
        .connect(otherUser)
        .approve(await gamePass.getAddress(), ethers.MaxUint256);

      await expect(gamePass.connect(otherUser).subscribe(GAME_ID, 1n)).to.be
        .reverted;
    });

    it("reverts when the subscriber has not approved GamePass to spend KEY", async () => {
      const { gamePass, keyCoin, otherUser } = await loadFixture(
        deployGamePassFixture
      );

      // otherUser holds KEY but skips approve.
      await buyEnoughKey(keyCoin, otherUser);

      await expect(gamePass.connect(otherUser).subscribe(GAME_ID, 1n)).to.be
        .reverted;
    });
  });

  describe("renewing while the subscription is active", () => {
    it("stacks onto the existing expiry", async () => {
      const { gamePass, subscriber } = await loadFixture(deployGamePassFixture);

      await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);
      const firstExpiry = await gamePass.expiryOf(subscriber.address, GAME_ID);

      await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);
      const secondExpiry = await gamePass.expiryOf(subscriber.address, GAME_ID);

      expect(secondExpiry).to.equal(firstExpiry + MONTH);
    });

    it("stacks even after time passes while still subscribed", async () => {
      const { gamePass, subscriber } = await loadFixture(deployGamePassFixture);

      expect(await gamePass.expiryOf(subscriber.address, GAME_ID)).to.equal(0n);

      await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);
      const firstExpiry = await gamePass.expiryOf(subscriber.address, GAME_ID);

      await time.increase(15 * 24 * 3600); // 15 days, still subscribed

      await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);
      const secondExpiry = await gamePass.expiryOf(subscriber.address, GAME_ID);

      expect(secondExpiry).to.equal(firstExpiry + MONTH);
    });
  });

  describe("renewing after the subscription has expired", () => {
    it("starts fresh from the current block timestamp", async () => {
      const { gamePass, subscriber } = await loadFixture(deployGamePassFixture);

      await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);
      const firstExpiry = await gamePass.expiryOf(subscriber.address, GAME_ID);

      await time.increase(Number(MONTH + 1n)); // pass has lapsed
      expect(firstExpiry).to.be.lessThan(BigInt(await time.latest()));

      const tx = await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      const secondExpiry = await gamePass.expiryOf(subscriber.address, GAME_ID);
      expect(secondExpiry).to.equal(BigInt(block!.timestamp) + MONTH);
    });

    it("allows multiple subscribe cycles across expiries", async () => {
      const { gamePass, subscriber } = await loadFixture(deployGamePassFixture);

      await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);
      await time.increase(Number(MONTH + 86400n));

      await expect(gamePass.connect(subscriber).subscribe(GAME_ID, 1n)).to.not.be
        .reverted;

      const expiry = await gamePass.expiryOf(subscriber.address, GAME_ID);
      const now = await time.latest();
      expect(expiry).to.be.greaterThan(BigInt(now));
    });
  });

  describe("expiryOf", () => {
    it("returns zero before any subscription", async () => {
      const { gamePass, subscriber } = await loadFixture(deployGamePassFixture);

      expect(await gamePass.expiryOf(subscriber.address, GAME_ID)).to.equal(0n);
    });

    it("returns zero for an address that never subscribed", async () => {
      const { gamePass, otherUser } = await loadFixture(deployGamePassFixture);

      expect(await gamePass.expiryOf(otherUser.address, GAME_ID)).to.equal(0n);
    });

    it("returns the exact expiry one month ahead after a single-month subscribe", async () => {
      const { gamePass, subscriber } = await loadFixture(deployGamePassFixture);

      const tx = await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      const expiry = await gamePass.expiryOf(subscriber.address, GAME_ID);
      expect(expiry).to.equal(BigInt(block!.timestamp) + MONTH);
    });

    it("returns the exact expiry months ahead after a multi-month subscribe", async () => {
      const { gamePass, subscriber } = await loadFixture(deployGamePassFixture);

      const months = 6n;
      const tx = await gamePass.connect(subscriber).subscribe(GAME_ID, months);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      const expiry = await gamePass.expiryOf(subscriber.address, GAME_ID);
      expect(expiry).to.equal(BigInt(block!.timestamp) + months * MONTH);
    });

    it("updates after renewal", async () => {
      const { gamePass, subscriber } = await loadFixture(deployGamePassFixture);

      await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);
      const firstExpiry = await gamePass.expiryOf(subscriber.address, GAME_ID);

      await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);
      const secondExpiry = await gamePass.expiryOf(subscriber.address, GAME_ID);

      expect(secondExpiry).to.equal(firstExpiry + MONTH);
    });

    it("tracks subscriptions independently per subscriber", async () => {
      const { gamePass, keyCoin, subscriber, otherUser } = await loadFixture(
        deployGamePassFixture
      );

      await buyEnoughKey(keyCoin, otherUser);
      await keyCoin
        .connect(otherUser)
        .approve(await gamePass.getAddress(), ethers.MaxUint256);

      await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);
      await gamePass.connect(otherUser).subscribe(GAME_ID, 2n);

      const subscriberExpiry = await gamePass.expiryOf(
        subscriber.address,
        GAME_ID
      );
      const otherUserExpiry = await gamePass.expiryOf(
        otherUser.address,
        GAME_ID
      );

      expect(otherUserExpiry).to.be.greaterThan(subscriberExpiry);
    });
  });
});
