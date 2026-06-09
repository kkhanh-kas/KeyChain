import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import type {
  KeyCoin,
  GameToken,
  GameStore,
  GamePass,
} from "../typechain-types";

// Constants 
const MONTH = 30n * 24n * 3600n;
const INITIAL_RATE = 1000n;
const MONTHLY_PRICE = ethers.parseEther("10");
const GAME_ID = 1n;
const GAME_ID_2 = 2n;
const ROYALTY_BPS = 500n;
const GAME_URI = "ipfs://QmTest";
const GAME_NAME = "TestGame";
const GAME_PRICE = ethers.parseEther("100");
const LARGE_KEY = ethers.parseEther("1000");

async function buyEnoughKey(keyCoin: KeyCoin, account: any) {
  const ethNeeded = LARGE_KEY / INITIAL_RATE;
  await keyCoin.connect(account).buyKeyCoin({ value: ethNeeded });
}

//  Fixture 
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

// Tests 
describe("GamePass", () => {
  describe("Deployment", () => {
    it("stores the correct KeyCoin address", async () => {
      const { keyCoin, gamePass } = await loadFixture(deployGamePassFixture);

      expect(await gamePass.keyCoin()).to.equal(await keyCoin.getAddress());
    });

    it("stores the correct GameStore address", async () => {
      const { gameStore, gamePass } = await loadFixture(deployGamePassFixture);

      expect(await gamePass.gameStore()).to.equal(await gameStore.getAddress());
    });

    it("exposes MONTH constant equal to 30 days", async () => {
      const { gamePass } = await loadFixture(deployGamePassFixture);

      expect(await gamePass.MONTH()).to.equal(MONTH);
    });

    it("returns 0 expiry before subscription", async () => {
      const { gamePass, subscriber } = await loadFixture(deployGamePassFixture);

      expect(await gamePass.expiryOf(subscriber.address, GAME_ID)).to.equal(0n);
    });
  });

  describe("registerPass()", () => {
    it("allows the game vendor to register a pass", async () => {
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

    it("updates monthly price when vendor registers the same pass again", async () => {
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

    it("reverts when a non-vendor tries to registerPass", async () => {
      const { gamePass, otherUser } = await loadFixture(deployGamePassFixture);

      await expect(
        gamePass.connect(otherUser).registerPass(GAME_ID, MONTHLY_PRICE)
      ).to.be.revertedWith("GamePass: not game vendor");
    });

    it("reverts when subscriber tries to registerPass", async () => {
      const { gamePass, subscriber } = await loadFixture(deployGamePassFixture);

      await expect(
        gamePass.connect(subscriber).registerPass(GAME_ID, MONTHLY_PRICE)
      ).to.be.revertedWith("GamePass: not game vendor");
    });

    it("allows monthlyPrice = 0 because contract has no price guard", async () => {
      const { gamePass, vendor } = await loadFixture(deployGamePassFixture);

      await expect(gamePass.connect(vendor).registerPass(GAME_ID, 0n)).to.not.be
        .reverted;
    });
  });

  describe("subscribe()", () => {
    it("allows subscriber to subscribe for 1 month", async () => {
      const { gamePass, subscriber } = await loadFixture(deployGamePassFixture);

      await expect(gamePass.connect(subscriber).subscribe(GAME_ID, 1n)).to.not.be
        .reverted;
    });

    it("sets expiry greater than current block timestamp", async () => {
      const { gamePass, subscriber } = await loadFixture(deployGamePassFixture);

      const beforeSubscribe = await time.latest();

      await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);

      const expiry = await gamePass.expiryOf(subscriber.address, GAME_ID);

      expect(expiry).to.be.greaterThan(BigInt(beforeSubscribe));
    });

    it("transfers monthlyPrice * months KEY from subscriber to vendor", async () => {
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

    it("emits PassSubscribed with correct arguments", async () => {
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

    it("reverts when months = 0", async () => {
      const { gamePass, subscriber } = await loadFixture(deployGamePassFixture);

      await expect(
        gamePass.connect(subscriber).subscribe(GAME_ID, 0n)
      ).to.be.revertedWith("GamePass: months out of range");
    });

    it("reverts when months > 12", async () => {
      const { gamePass, subscriber } = await loadFixture(deployGamePassFixture);

      await expect(
        gamePass.connect(subscriber).subscribe(GAME_ID, 13n)
      ).to.be.revertedWith("GamePass: months out of range");
    });

    it("allows subscribing for exactly 12 months", async () => {
      const { gamePass, subscriber } = await loadFixture(deployGamePassFixture);

      await expect(gamePass.connect(subscriber).subscribe(GAME_ID, 12n)).to.not
        .be.reverted;
    });

    it("reverts when pass is not registered", async () => {
      const { gamePass, subscriber } = await loadFixture(deployGamePassFixture);

      await expect(
        gamePass.connect(subscriber).subscribe(999n, 1n)
      ).to.be.revertedWith("GamePass: pass not registered");
    });

    it("reverts when subscriber has insufficient KEY balance", async () => {
      const { gamePass, keyCoin, otherUser } = await loadFixture(
        deployGamePassFixture
      );

      await keyCoin
        .connect(otherUser)
        .approve(await gamePass.getAddress(), ethers.MaxUint256);

      await expect(gamePass.connect(otherUser).subscribe(GAME_ID, 1n)).to.be
        .reverted;
    });

    it("reverts when subscriber has not approved GamePass to spend KEY", async () => {
      const { gamePass, keyCoin, otherUser } = await loadFixture(
        deployGamePassFixture
      );

      await buyEnoughKey(keyCoin, otherUser);

      await expect(gamePass.connect(otherUser).subscribe(GAME_ID, 1n)).to.be
        .reverted;
    });
  });

  describe("Renew while subscription is active", () => {
    it("extends expiry from current expiry", async () => {
      const { gamePass, subscriber } = await loadFixture(deployGamePassFixture);

      await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);
      const firstExpiry = await gamePass.expiryOf(subscriber.address, GAME_ID);

      await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);
      const secondExpiry = await gamePass.expiryOf(subscriber.address, GAME_ID);

      expect(secondExpiry).to.equal(firstExpiry + MONTH);
    });

    it("state: No subscription → Active → Renew while active", async () => {
      const { gamePass, subscriber } = await loadFixture(deployGamePassFixture);

      expect(await gamePass.expiryOf(subscriber.address, GAME_ID)).to.equal(0n);

      await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);
      const firstExpiry = await gamePass.expiryOf(subscriber.address, GAME_ID);

      await time.increase(15 * 24 * 3600);

      await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);
      const secondExpiry = await gamePass.expiryOf(subscriber.address, GAME_ID);

      expect(secondExpiry).to.equal(firstExpiry + MONTH);
    });
  });

  describe("Renew after subscription has expired", () => {
    it("renews from block.timestamp after expiry", async () => {
      const { gamePass, subscriber } = await loadFixture(deployGamePassFixture);

      await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);
      const firstExpiry = await gamePass.expiryOf(subscriber.address, GAME_ID);

      await time.increase(Number(MONTH + 1n));

      expect(firstExpiry).to.be.lessThan(BigInt(await time.latest()));

      const tx = await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      const secondExpiry = await gamePass.expiryOf(subscriber.address, GAME_ID);

      expect(secondExpiry).to.equal(BigInt(block!.timestamp) + MONTH);
    });

    it("allows multiple subscribe cycles after expiry", async () => {
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

  describe("expiryOf()", () => {
    it("returns 0 before any subscription", async () => {
      const { gamePass, subscriber } = await loadFixture(deployGamePassFixture);

      expect(await gamePass.expiryOf(subscriber.address, GAME_ID)).to.equal(0n);
    });

    it("returns 0 for an address that never subscribed", async () => {
      const { gamePass, otherUser } = await loadFixture(deployGamePassFixture);

      expect(await gamePass.expiryOf(otherUser.address, GAME_ID)).to.equal(0n);
    });

    it("returns exact expiry after subscribing for 1 month", async () => {
      const { gamePass, subscriber } = await loadFixture(deployGamePassFixture);

      const tx = await gamePass.connect(subscriber).subscribe(GAME_ID, 1n);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      const expiry = await gamePass.expiryOf(subscriber.address, GAME_ID);

      expect(expiry).to.equal(BigInt(block!.timestamp) + MONTH);
    });

    it("returns exact expiry after subscribing for multiple months", async () => {
      const { gamePass, subscriber } = await loadFixture(deployGamePassFixture);

      const months = 6n;

      const tx = await gamePass.connect(subscriber).subscribe(GAME_ID, months);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      const expiry = await gamePass.expiryOf(subscriber.address, GAME_ID);

      expect(expiry).to.equal(BigInt(block!.timestamp) + months * MONTH);
    });

    it("updates correctly after renewal", async () => {
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
      const otherUserExpiry = await gamePass.expiryOf(otherUser.address, GAME_ID);

      expect(otherUserExpiry).to.be.greaterThan(subscriberExpiry);
    });
  });
});
