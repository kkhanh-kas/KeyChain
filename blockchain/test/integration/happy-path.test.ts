/**
 * KeyChain — happy-path.test.ts
 * ==============================
 * Luồng: ETH → KEY → mua game → activate → xác nhận
 *
 * Actors:
 *   deployer  — deploy contracts, cấp VENDOR_ROLE
 *   vendor    — đăng ký game
 *   buyer     — mua license, activate
 *
 * Luồng đầy đủ:
 *   1. buyer gửi ETH → nhận KEY (rate: 1 ETH = 1000 KEY)
 *   2. buyer approve GameStore tiêu KEY
 *   3. buyer purchaseLicense() → KEY sang vendor, GameToken mint cho buyer
 *   4. buyer activateLicense() → bind với machineHash
 *   5. Xác nhận toàn bộ state sau từng bước
 */

import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

// ─── Constants ─────────────────────────────────────────────────────────────

const KEYCOIN_RATE  = 1000n;
const GAME_PRICE    = ethers.parseUnits("10", 18);   // 10 KEY
const ROYALTY_BPS   = 500;                            // 5%
const GAME_NAME     = "CryptoQuest";
const GAME_URI      = "ipfs://QmCryptoQuestMetadata";
const MACHINE_HASH  = ethers.keccak256(ethers.toUtf8Bytes("device-001"));

// ─── Fixture ───────────────────────────────────────────────────────────────

async function deployFixture() {
  const [deployer, vendor, buyer] = await ethers.getSigners();

  // 1. KeyCoin
  const KeyCoin = await ethers.getContractFactory("KeyCoin");
  const keyCoin = await KeyCoin.deploy(KEYCOIN_RATE);
  await keyCoin.waitForDeployment();

  // 2. GameToken
  const GameToken = await ethers.getContractFactory("GameToken");
  const gameToken = await GameToken.deploy();
  await gameToken.waitForDeployment();

  // 3. GameStore
  const GameStore = await ethers.getContractFactory("GameStore");
  const gameStore = await GameStore.deploy(
    await keyCoin.getAddress(),
    await gameToken.getAddress()
  );
  await gameStore.waitForDeployment();

  // 4. ActivationContract
  const ActivationContract = await ethers.getContractFactory("ActivationContract");
  const activation = await ActivationContract.deploy(await gameToken.getAddress());
  await activation.waitForDeployment();

  // Wire: GameStore cần MINTER_ROLE trên GameToken
  const MINTER_ROLE = await (gameToken as any).MINTER_ROLE();
  await (gameToken as any).grantRole(MINTER_ROLE, await gameStore.getAddress());

  // Grant VENDOR_ROLE
  const VENDOR_ROLE = await (gameStore as any).VENDOR_ROLE();
  await (gameStore as any).grantRole(VENDOR_ROLE, vendor.address);

  return { keyCoin, gameToken, gameStore, activation, deployer, vendor, buyer };
}

// ══════════════════════════════════════════════════════════════════════════
//  Test suite
// ══════════════════════════════════════════════════════════════════════════

describe("Happy Path — ETH → KEY → mua game → activate", function () {

  // ────────────────────────────────────────────────────────────────────────
  // Bước 1: ETH → KEY
  // ────────────────────────────────────────────────────────────────────────
  describe("Bước 1: Mua KEY bằng ETH", function () {
    it("buyer gửi 0.01 ETH nhận đúng 10 KEY", async function () {
      const { keyCoin, buyer } = await deployFixture();

      const ethSent     = ethers.parseEther("0.01");
      const expectedKey = ethSent * KEYCOIN_RATE;

      await (keyCoin as any).connect(buyer).buyKeyCoin({ value: ethSent });

      expect(await (keyCoin as any).balanceOf(buyer.address))
        .to.equal(expectedKey);
    });

    it("buyer gửi 1 ETH nhận đúng 1000 KEY", async function () {
      const { keyCoin, buyer } = await deployFixture();

      await (keyCoin as any).connect(buyer).buyKeyCoin({
        value: ethers.parseEther("1"),
      });

      expect(await (keyCoin as any).balanceOf(buyer.address))
        .to.equal(ethers.parseUnits("1000", 18));
    });

    it("số dư ETH của buyer giảm đúng sau khi mua KEY", async function () {
      const { keyCoin, buyer } = await deployFixture();

      const ethSent    = ethers.parseEther("0.5");
      const balBefore  = await ethers.provider.getBalance(buyer.address);

      const tx      = await (keyCoin as any).connect(buyer).buyKeyCoin({ value: ethSent });
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;

      const balAfter = await ethers.provider.getBalance(buyer.address);
      expect(balBefore - balAfter).to.equal(ethSent + gasCost);
    });

    it("contract KeyCoin nhận được ETH đúng số", async function () {
      const { keyCoin, buyer } = await deployFixture();

      const ethSent = ethers.parseEther("0.1");
      await (keyCoin as any).connect(buyer).buyKeyCoin({ value: ethSent });

      expect(
        await ethers.provider.getBalance(await keyCoin.getAddress())
      ).to.equal(ethSent);
    });

    it("revert nếu gửi 0 ETH", async function () {
      const { keyCoin, buyer } = await deployFixture();
      await expect(
        (keyCoin as any).connect(buyer).buyKeyCoin({ value: 0n })
      ).to.be.revertedWith("KeyCoin: no ETH sent");
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Bước 2: Vendor đăng ký game
  // ────────────────────────────────────────────────────────────────────────
  describe("Bước 2: Vendor đăng ký game", function () {
    it("registerGame: game xuất hiện trong catalog với đúng thông tin", async function () {
      const { gameStore, vendor } = await deployFixture();

      await (gameStore as any)
        .connect(vendor)
        .registerGame(GAME_NAME, GAME_PRICE, ROYALTY_BPS, GAME_URI);

      const [ids, infos] = await (gameStore as any).getCatalog();
      expect(ids.length).to.equal(1);
      expect(infos[0].name).to.equal(GAME_NAME);
      expect(infos[0].price).to.equal(GAME_PRICE);
      expect(infos[0].isListed).to.be.true;
      expect(infos[0].vendorAddress).to.equal(vendor.address);
    });

    it("registerGame: GameToken URI được set đúng", async function () {
      const { gameStore, gameToken, vendor } = await deployFixture();

      await (gameStore as any)
        .connect(vendor)
        .registerGame(GAME_NAME, GAME_PRICE, ROYALTY_BPS, GAME_URI);

      expect(await (gameToken as any).uri(1)).to.equal(GAME_URI);
    });

    it("registerGame: royalty ERC-2981 được set đúng cho vendor", async function () {
      const { gameStore, gameToken, vendor } = await deployFixture();

      await (gameStore as any)
        .connect(vendor)
        .registerGame(GAME_NAME, GAME_PRICE, ROYALTY_BPS, GAME_URI);

      const salePrice = ethers.parseUnits("100", 18);
      const [receiver, royaltyAmount] = await (gameToken as any).royaltyInfo(1, salePrice);

      expect(receiver).to.equal(vendor.address);
      expect(royaltyAmount).to.equal((salePrice * BigInt(ROYALTY_BPS)) / 10000n);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Bước 3: Mua license
  // ────────────────────────────────────────────────────────────────────────
  describe("Bước 3: Mua license từ GameStore", function () {
    async function setupWithGame() {
      const ctx = await deployFixture();
      const { gameStore, keyCoin, vendor, buyer } = ctx;

      // Vendor đăng ký game
      await (gameStore as any)
        .connect(vendor)
        .registerGame(GAME_NAME, GAME_PRICE, ROYALTY_BPS, GAME_URI);

      // Buyer mua KEY đủ để mua game (mua 1 ETH = 1000 KEY, game giá 10 KEY)
      await (keyCoin as any).connect(buyer).buyKeyCoin({
        value: ethers.parseEther("1"),
      });

      // Approve GameStore tiêu KEY không giới hạn
      await (keyCoin as any)
        .connect(buyer)
        .approve(await gameStore.getAddress(), ethers.MaxUint256);

      return ctx;
    }

    it("purchaseLicense: buyer nhận được 1 GameToken", async function () {
      const { gameStore, gameToken, buyer } = await setupWithGame();

      await (gameStore as any).connect(buyer).purchaseLicense(1);

      expect(await (gameToken as any).balanceOf(buyer.address, 1)).to.equal(1n);
    });

    it("purchaseLicense: KEY của buyer giảm đúng GAME_PRICE", async function () {
      const { gameStore, keyCoin, buyer } = await setupWithGame();

      const keyBefore = await (keyCoin as any).balanceOf(buyer.address);
      await (gameStore as any).connect(buyer).purchaseLicense(1);
      const keyAfter = await (keyCoin as any).balanceOf(buyer.address);

      expect(keyBefore - keyAfter).to.equal(GAME_PRICE);
    });

    it("purchaseLicense: KEY của vendor tăng đúng GAME_PRICE", async function () {
      const { gameStore, keyCoin, vendor, buyer } = await setupWithGame();

      const vendorBefore = await (keyCoin as any).balanceOf(vendor.address);
      await (gameStore as any).connect(buyer).purchaseLicense(1);
      const vendorAfter = await (keyCoin as any).balanceOf(vendor.address);

      expect(vendorAfter - vendorBefore).to.equal(GAME_PRICE);
    });

    it("purchaseLicense: emit LicensePurchased với đúng args", async function () {
      const { gameStore, vendor, buyer } = await setupWithGame();

      await expect(
        (gameStore as any).connect(buyer).purchaseLicense(1)
      )
        .to.emit(gameStore, "LicensePurchased")
        .withArgs(1n, buyer.address, vendor.address, GAME_PRICE);
    });

    it("purchaseLicense: revert nếu buyer không đủ KEY", async function () {
      const ctx = await deployFixture();
      const { gameStore, keyCoin, vendor, buyer } = ctx;

      await (gameStore as any)
        .connect(vendor)
        .registerGame(GAME_NAME, GAME_PRICE, ROYALTY_BPS, GAME_URI);

      // Buyer chỉ mua 0.005 ETH = 5 KEY, ít hơn GAME_PRICE (10 KEY)
      await (keyCoin as any).connect(buyer).buyKeyCoin({
        value: ethers.parseEther("0.005"),
      });
      await (keyCoin as any)
        .connect(buyer)
        .approve(await gameStore.getAddress(), ethers.MaxUint256);

      await expect(
        (gameStore as any).connect(buyer).purchaseLicense(1)
      ).to.be.reverted;
    });

    it("purchaseLicense: revert nếu chưa approve KEY", async function () {
      const ctx = await deployFixture();
      const { gameStore, keyCoin, vendor, buyer } = ctx;

      await (gameStore as any)
        .connect(vendor)
        .registerGame(GAME_NAME, GAME_PRICE, ROYALTY_BPS, GAME_URI);
      await (keyCoin as any).connect(buyer).buyKeyCoin({
        value: ethers.parseEther("1"),
      });
      // Không approve — expect revert

      await expect(
        (gameStore as any).connect(buyer).purchaseLicense(1)
      ).to.be.reverted;
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Bước 4: Activate license
  // ────────────────────────────────────────────────────────────────────────
  describe("Bước 4: Activate license", function () {
    async function setupWithLicense() {
      const ctx = await deployFixture();
      const { gameStore, keyCoin, vendor, buyer } = ctx;

      await (gameStore as any)
        .connect(vendor)
        .registerGame(GAME_NAME, GAME_PRICE, ROYALTY_BPS, GAME_URI);
      await (keyCoin as any).connect(buyer).buyKeyCoin({
        value: ethers.parseEther("1"),
      });
      await (keyCoin as any)
        .connect(buyer)
        .approve(await gameStore.getAddress(), ethers.MaxUint256);
      await (gameStore as any).connect(buyer).purchaseLicense(1);

      return ctx;
    }

    it("activateLicense: isActive trả về true sau khi activate", async function () {
      const { activation, buyer } = await setupWithLicense();

      await (activation as any).connect(buyer).activateLicense(1, MACHINE_HASH);

      expect(await (activation as any).isActive(buyer.address, 1)).to.be.true;
    });

    it("activateLicense: getLicense trả về đúng hardwareHash", async function () {
      const { activation, buyer } = await setupWithLicense();

      await (activation as any).connect(buyer).activateLicense(1, MACHINE_HASH);

      const info = await (activation as any).getLicense(buyer.address, 1);
      expect(info.hardwareHash).to.equal(MACHINE_HASH);
      expect(info.isActive).to.be.true;
    });

    it("activateLicense: activatedAt gần với block.timestamp", async function () {
      const { activation, buyer } = await setupWithLicense();

      const tx      = await (activation as any).connect(buyer).activateLicense(1, MACHINE_HASH);
      const receipt = await tx.wait();
      const block   = await ethers.provider.getBlock(receipt.blockNumber);

      const info = await (activation as any).getLicense(buyer.address, 1);
      expect(info.activatedAt).to.equal(BigInt(block!.timestamp));
    });

    it("activateLicense: revert nếu buyer không có license", async function () {
      const { activation, deployer } = await setupWithLicense();

      await expect(
        (activation as any).connect(deployer).activateLicense(1, MACHINE_HASH)
      ).to.be.revertedWith("Activation: not license owner");
    });

    it("activateLicense: revert nếu gọi activate lần 2", async function () {
      const { activation, buyer } = await setupWithLicense();

      await (activation as any).connect(buyer).activateLicense(1, MACHINE_HASH);

      await expect(
        (activation as any).connect(buyer).activateLicense(1, MACHINE_HASH)
      ).to.be.revertedWith("Activation: already active");
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Bước 5: Xác nhận toàn bộ state cuối
  // ────────────────────────────────────────────────────────────────────────
  describe("Bước 5: Xác nhận toàn bộ state sau happy path", function () {
    it("toàn bộ luồng ETH → KEY → mua game → activate hoạt động đúng", async function () {
      const { keyCoin, gameToken, gameStore, activation, vendor, buyer } =
        await deployFixture();

      // ── Vendor đăng ký game ──────────────────────────────────────────────
      await (gameStore as any)
        .connect(vendor)
        .registerGame(GAME_NAME, GAME_PRICE, ROYALTY_BPS, GAME_URI);

      // ── Buyer mua KEY ────────────────────────────────────────────────────
      const ethSent = ethers.parseEther("1");
      await (keyCoin as any).connect(buyer).buyKeyCoin({ value: ethSent });

      const keyBalance = await (keyCoin as any).balanceOf(buyer.address);
      expect(keyBalance).to.equal(ethers.parseUnits("1000", 18));

      // ── Buyer mua license ────────────────────────────────────────────────
      await (keyCoin as any)
        .connect(buyer)
        .approve(await gameStore.getAddress(), ethers.MaxUint256);
      await (gameStore as any).connect(buyer).purchaseLicense(1);

      // Xác nhận GameToken
      expect(await (gameToken as any).balanceOf(buyer.address, 1)).to.equal(1n);

      // Xác nhận KEY đã chuyển sang vendor
      expect(await (keyCoin as any).balanceOf(vendor.address)).to.equal(GAME_PRICE);

      // Xác nhận KEY của buyer giảm đúng
      expect(await (keyCoin as any).balanceOf(buyer.address))
        .to.equal(ethers.parseUnits("1000", 18) - GAME_PRICE);

      // ── Buyer activate ───────────────────────────────────────────────────
      await (activation as any).connect(buyer).activateLicense(1, MACHINE_HASH);

      // Xác nhận activation state
      expect(await (activation as any).isActive(buyer.address, 1)).to.be.true;

      const licInfo = await (activation as any).getLicense(buyer.address, 1);
      expect(licInfo.isActive).to.be.true;
      expect(licInfo.hardwareHash).to.equal(MACHINE_HASH);
      expect(licInfo.activatedAt).to.be.gt(0n);
    });
  });
});