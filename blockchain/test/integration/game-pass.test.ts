/**
 * KeyChain — game-pass.test.ts
 * =============================
 * Luồng: subscribe → hết hạn → renew
 *
 * Actors:
 *   deployer    — deploy contracts, cấp VENDOR_ROLE
 *   vendor      — đăng ký game, registerPass(), nhận KEY từ subscription
 *   subscriber  — subscribe, renew pass
 *   stranger    — địa chỉ không có quyền
 *
 * Logic cốt lõi của GamePass.subscribe():
 *
 *   current = expiryOf(subscriber, gameId)
 *   base    = current > block.timestamp ? current    ← còn hạn → cộng vào expiry cũ
 *                                       : block.timestamp ← hết hạn/chưa sub → tính từ now
 *   newExpiry = base + months × MONTH
 *
 * 3 trường hợp phân biệt:
 *   1. Lần đầu subscribe     → current=0  < now  → base=now
 *   2. Renew khi còn hạn     → current    > now  → base=current (cộng dồn)
 *   3. Renew sau khi hết hạn → current    < now  → base=now     (tính lại từ đầu)
 */

import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

// ─── Constants ─────────────────────────────────────────────────────────────

const KEYCOIN_RATE    = ethers.parseUnits("1000", 18);
const GAME_PRICE      = ethers.parseUnits("10",   18); // 10 KEY — primary market
const MONTHLY_PRICE   = ethers.parseUnits("3",    18); // 3 KEY/tháng
const ROYALTY_BPS     = 500;
const GAME_URI        = "ipfs://QmGamePassTest";
const MONTH           = 30 * 24 * 60 * 60;            // 30 days in seconds

// ─── Fixture ───────────────────────────────────────────────────────────────

async function deployFixture() {
  const [deployer, vendor, subscriber, stranger] = await ethers.getSigners();

  const KeyCoin = await ethers.getContractFactory("KeyCoin");
  const keyCoin = await KeyCoin.deploy(KEYCOIN_RATE);
  await keyCoin.waitForDeployment();

  const GameToken = await ethers.getContractFactory("GameToken");
  const gameToken = await GameToken.deploy();
  await gameToken.waitForDeployment();

  const GameStore = await ethers.getContractFactory("GameStore");
  const gameStore = await GameStore.deploy(
    await keyCoin.getAddress(),
    await gameToken.getAddress()
  );
  await gameStore.waitForDeployment();

  const GamePass = await ethers.getContractFactory("GamePass");
  const gamePass = await GamePass.deploy(
    await keyCoin.getAddress(),
    await gameStore.getAddress()
  );
  await gamePass.waitForDeployment();

  // Wire MINTER_ROLE
  const MINTER_ROLE = await (gameToken as any).MINTER_ROLE();
  await (gameToken as any).grantRole(MINTER_ROLE, await gameStore.getAddress());

  // Grant VENDOR_ROLE
  const VENDOR_ROLE = await (gameStore as any).VENDOR_ROLE();
  await (gameStore as any).grantRole(VENDOR_ROLE, vendor.address);

  return { keyCoin, gameToken, gameStore, gamePass, deployer, vendor, subscriber, stranger };
}

/**
 * Setup đầy đủ:
 *   - Vendor đăng ký 1 game + registerPass
 *   - Subscriber có KEY và đã approve GamePass
 */
async function setupWithPass() {
  const ctx = await deployFixture();
  const { gameStore, gamePass, keyCoin, vendor, subscriber } = ctx;

  // Vendor đăng ký game
  await (gameStore as any)
    .connect(vendor)
    .registerGame("CryptoQuest", GAME_PRICE, ROYALTY_BPS, GAME_URI);

  // Vendor đăng ký pass cho game 1
  await (gamePass as any).connect(vendor).registerPass(1, MONTHLY_PRICE);

  // Subscriber mua KEY và approve GamePass
  await (keyCoin as any)
    .connect(subscriber)
    .buyKeyCoin({ value: ethers.parseEther("1") }); // 1000 KEY
  await (keyCoin as any)
    .connect(subscriber)
    .approve(await gamePass.getAddress(), ethers.MaxUint256);

  return ctx;
}

// ══════════════════════════════════════════════════════════════════════════
//  Test suite
// ══════════════════════════════════════════════════════════════════════════

describe("GamePass — subscribe → hết hạn → renew", function () {

  // ────────────────────────────────────────────────────────────────────────
  // registerPass
  // ────────────────────────────────────────────────────────────────────────
  describe("registerPass", function () {
    it("vendor đăng ký pass thành công", async function () {
      const { gameStore, gamePass, vendor } = await deployFixture();

      await (gameStore as any)
        .connect(vendor)
        .registerGame("TestGame", GAME_PRICE, ROYALTY_BPS, GAME_URI);

      // Không revert
      await expect(
        (gamePass as any).connect(vendor).registerPass(1, MONTHLY_PRICE)
      ).to.not.be.reverted;
    });

    it("stranger không phải vendor của game không thể registerPass", async function () {
      const { gameStore, gamePass, vendor, stranger } = await deployFixture();

      await (gameStore as any)
        .connect(vendor)
        .registerGame("TestGame", GAME_PRICE, ROYALTY_BPS, GAME_URI);

      await expect(
        (gamePass as any).connect(stranger).registerPass(1, MONTHLY_PRICE)
      ).to.be.revertedWith("GamePass: not game vendor");
    });

    it("subscribe revert nếu pass chưa được registerPass", async function () {
      const { gameStore, gamePass, keyCoin, vendor, subscriber } = await deployFixture();

      await (gameStore as any)
        .connect(vendor)
        .registerGame("TestGame", GAME_PRICE, ROYALTY_BPS, GAME_URI);
      // Không registerPass

      await (keyCoin as any)
        .connect(subscriber)
        .buyKeyCoin({ value: ethers.parseEther("1") });
      await (keyCoin as any)
        .connect(subscriber)
        .approve(await gamePass.getAddress(), ethers.MaxUint256);

      await expect(
        (gamePass as any).connect(subscriber).subscribe(1, 1)
      ).to.be.revertedWith("GamePass: pass not registered");
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Bước 1: Lần đầu subscribe
  // ────────────────────────────────────────────────────────────────────────
  describe("Bước 1: Lần đầu subscribe", function () {
    it("expiryOf = 0 trước khi subscribe", async function () {
      const { gamePass, subscriber } = await setupWithPass();
      expect(await (gamePass as any).expiryOf(subscriber.address, 1)).to.equal(0n);
    });

    it("subscribe 1 tháng: expiry = block.timestamp + 30 days", async function () {
      const { gamePass, subscriber } = await setupWithPass();

      const tx      = await (gamePass as any).connect(subscriber).subscribe(1, 1);
      const receipt = await tx.wait();
      const block   = await ethers.provider.getBlock(receipt.blockNumber);
      const expectedExpiry = BigInt(block!.timestamp) + BigInt(MONTH);

      expect(await (gamePass as any).expiryOf(subscriber.address, 1))
        .to.equal(expectedExpiry);
    });

    it("subscribe 3 tháng: expiry = block.timestamp + 90 days", async function () {
      const { gamePass, subscriber } = await setupWithPass();

      const tx      = await (gamePass as any).connect(subscriber).subscribe(1, 3);
      const receipt = await tx.wait();
      const block   = await ethers.provider.getBlock(receipt.blockNumber);
      const expectedExpiry = BigInt(block!.timestamp) + BigInt(MONTH * 3);

      expect(await (gamePass as any).expiryOf(subscriber.address, 1))
        .to.equal(expectedExpiry);
    });

    it("subscribe 1 tháng: KEY của subscriber giảm đúng MONTHLY_PRICE", async function () {
      const { gamePass, keyCoin, subscriber } = await setupWithPass();

      const keyBefore = await (keyCoin as any).balanceOf(subscriber.address);
      await (gamePass as any).connect(subscriber).subscribe(1, 1);
      const keyAfter = await (keyCoin as any).balanceOf(subscriber.address);

      expect(keyBefore - keyAfter).to.equal(MONTHLY_PRICE);
    });

    it("subscribe 3 tháng: KEY của subscriber giảm đúng 3 × MONTHLY_PRICE", async function () {
      const { gamePass, keyCoin, subscriber } = await setupWithPass();

      const keyBefore = await (keyCoin as any).balanceOf(subscriber.address);
      await (gamePass as any).connect(subscriber).subscribe(1, 3);
      const keyAfter = await (keyCoin as any).balanceOf(subscriber.address);

      expect(keyBefore - keyAfter).to.equal(MONTHLY_PRICE * 3n);
    });

    it("subscribe: vendor nhận đúng KEY từ subscriber", async function () {
      const { gamePass, keyCoin, vendor, subscriber } = await setupWithPass();

      const vendorBefore = await (keyCoin as any).balanceOf(vendor.address);
      await (gamePass as any).connect(subscriber).subscribe(1, 2);
      const vendorAfter = await (keyCoin as any).balanceOf(vendor.address);

      expect(vendorAfter - vendorBefore).to.equal(MONTHLY_PRICE * 2n);
    });

    it("subscribe: emit PassSubscribed với đúng 4 args", async function () {
      const { gamePass, subscriber } = await setupWithPass();

      const tx      = await (gamePass as any).connect(subscriber).subscribe(1, 1);
      const receipt = await tx.wait();
      const block   = await ethers.provider.getBlock(receipt.blockNumber);
      const expectedExpiry = BigInt(block!.timestamp) + BigInt(MONTH);

      await expect(tx)
        .to.emit(gamePass, "PassSubscribed")
        .withArgs(1n, subscriber.address, 1n, expectedExpiry);
    });

    it("pass còn hiệu lực ngay sau subscribe (expiry > now)", async function () {
      const { gamePass, subscriber } = await setupWithPass();

      await (gamePass as any).connect(subscriber).subscribe(1, 1);

      const expiry = await (gamePass as any).expiryOf(subscriber.address, 1);
      const now    = BigInt(await time.latest());
      expect(expiry).to.be.gt(now);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Bước 2: Pass hết hạn
  // ────────────────────────────────────────────────────────────────────────
  describe("Bước 2: Pass hết hạn sau 30 ngày", function () {
    it("expiry < now sau khi tua thời gian 31 ngày", async function () {
      const { gamePass, subscriber } = await setupWithPass();

      await (gamePass as any).connect(subscriber).subscribe(1, 1);

      // Tua thời gian vượt qua expiry
      await time.increase(31 * 24 * 60 * 60); // +31 ngày

      const expiry = await (gamePass as any).expiryOf(subscriber.address, 1);
      const now    = BigInt(await time.latest());
      expect(expiry).to.be.lt(now);
    });

    it("subscribe 3 tháng: pass hết hạn đúng sau 90 ngày", async function () {
      const { gamePass, subscriber } = await setupWithPass();

      await (gamePass as any).connect(subscriber).subscribe(1, 3);

      // Sau 89 ngày vẫn còn hạn
      await time.increase(89 * 24 * 60 * 60);
      let expiry = await (gamePass as any).expiryOf(subscriber.address, 1);
      let now    = BigInt(await time.latest());
      expect(expiry).to.be.gt(now); // còn hạn

      // Sau thêm 2 ngày (tổng 91 ngày) → hết hạn
      await time.increase(2 * 24 * 60 * 60);
      expiry = await (gamePass as any).expiryOf(subscriber.address, 1);
      now    = BigInt(await time.latest());
      expect(expiry).to.be.lt(now); // hết hạn
    });

    it("pass hết hạn: expiryOf vẫn giữ giá trị cũ (không tự xóa)", async function () {
      const { gamePass, subscriber } = await setupWithPass();

      const tx      = await (gamePass as any).connect(subscriber).subscribe(1, 1);
      const receipt = await tx.wait();
      const block   = await ethers.provider.getBlock(receipt.blockNumber);
      const storedExpiry = BigInt(block!.timestamp) + BigInt(MONTH);

      await time.increase(31 * 24 * 60 * 60);

      // expiryOf vẫn trả về giá trị cũ, không bị reset
      expect(await (gamePass as any).expiryOf(subscriber.address, 1))
        .to.equal(storedExpiry);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Bước 3: Renew khi còn hạn (cộng dồn vào expiry cũ)
  // ────────────────────────────────────────────────────────────────────────
  describe("Bước 3: Renew khi pass còn hạn", function () {
    it("renew khi còn hạn: newExpiry = expiry cũ + months × MONTH", async function () {
      const { gamePass, subscriber } = await setupWithPass();

      // Subscribe lần 1 — 1 tháng
      await (gamePass as any).connect(subscriber).subscribe(1, 1);
      const expiryAfterFirst = await (gamePass as any).expiryOf(subscriber.address, 1);

      // Tua thời gian 15 ngày (vẫn còn hạn)
      await time.increase(15 * 24 * 60 * 60);

      // Renew thêm 2 tháng — base = expiryAfterFirst (vì current > now)
      await (gamePass as any).connect(subscriber).subscribe(1, 2);
      const expiryAfterRenew = await (gamePass as any).expiryOf(subscriber.address, 1);

      expect(expiryAfterRenew).to.equal(expiryAfterFirst + BigInt(MONTH * 2));
    });

    it("renew 3 lần liên tiếp khi còn hạn: expiry cộng dồn đúng", async function () {
      const { gamePass, subscriber } = await setupWithPass();

      // Lần 1: 1 tháng
      const tx1      = await (gamePass as any).connect(subscriber).subscribe(1, 1);
      const receipt1 = await tx1.wait();
      const block1   = await ethers.provider.getBlock(receipt1.blockNumber);
      const expiry1  = BigInt(block1!.timestamp) + BigInt(MONTH);

      // Lần 2: thêm 2 tháng (còn hạn)
      await (gamePass as any).connect(subscriber).subscribe(1, 2);
      const expiry2 = await (gamePass as any).expiryOf(subscriber.address, 1);
      expect(expiry2).to.equal(expiry1 + BigInt(MONTH * 2));

      // Lần 3: thêm 3 tháng (còn hạn)
      await (gamePass as any).connect(subscriber).subscribe(1, 3);
      const expiry3 = await (gamePass as any).expiryOf(subscriber.address, 1);
      expect(expiry3).to.equal(expiry2 + BigInt(MONTH * 3));
    });

    it("renew khi còn hạn: KEY tiêu đúng theo số tháng renew", async function () {
      const { gamePass, keyCoin, subscriber } = await setupWithPass();

      await (gamePass as any).connect(subscriber).subscribe(1, 1);
      await time.increase(15 * 24 * 60 * 60); // còn 15 ngày

      const keyBefore = await (keyCoin as any).balanceOf(subscriber.address);
      await (gamePass as any).connect(subscriber).subscribe(1, 3); // renew 3 tháng
      const keyAfter = await (keyCoin as any).balanceOf(subscriber.address);

      expect(keyBefore - keyAfter).to.equal(MONTHLY_PRICE * 3n);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Bước 4: Renew sau khi hết hạn (tính lại từ block.timestamp)
  // ────────────────────────────────────────────────────────────────────────
  describe("Bước 4: Renew sau khi pass đã hết hạn", function () {
    it("renew sau hết hạn: newExpiry = block.timestamp + months × MONTH (không cộng vào expiry cũ)", async function () {
      const { gamePass, subscriber } = await setupWithPass();

      // Subscribe lần 1 — 1 tháng
      await (gamePass as any).connect(subscriber).subscribe(1, 1);
      const expiryAfterFirst = await (gamePass as any).expiryOf(subscriber.address, 1);

      // Tua 31 ngày → hết hạn
      await time.increase(31 * 24 * 60 * 60);

      // Renew sau hết hạn: base = block.timestamp (không phải expiryAfterFirst)
      const tx      = await (gamePass as any).connect(subscriber).subscribe(1, 1);
      const receipt = await tx.wait();
      const block   = await ethers.provider.getBlock(receipt.blockNumber);
      const expectedExpiry = BigInt(block!.timestamp) + BigInt(MONTH);

      const actualExpiry = await (gamePass as any).expiryOf(subscriber.address, 1);

      // Phải khác expiry cũ + MONTH (không cộng dồn)
      expect(actualExpiry).to.not.equal(expiryAfterFirst + BigInt(MONTH));
      // Phải bằng now + MONTH
      expect(actualExpiry).to.equal(expectedExpiry);
    });

    it("renew sau hết hạn: pass có hiệu lực ngay (expiry > now)", async function () {
      const { gamePass, subscriber } = await setupWithPass();

      await (gamePass as any).connect(subscriber).subscribe(1, 1);
      await time.increase(31 * 24 * 60 * 60); // hết hạn

      await (gamePass as any).connect(subscriber).subscribe(1, 1); // renew

      const expiry = await (gamePass as any).expiryOf(subscriber.address, 1);
      const now    = BigInt(await time.latest());
      expect(expiry).to.be.gt(now);
    });

    it("renew 3 tháng sau hết hạn: expiry cách now đúng 90 ngày", async function () {
      const { gamePass, subscriber } = await setupWithPass();

      await (gamePass as any).connect(subscriber).subscribe(1, 1);
      await time.increase(31 * 24 * 60 * 60); // hết hạn

      const tx      = await (gamePass as any).connect(subscriber).subscribe(1, 3);
      const receipt = await tx.wait();
      const block   = await ethers.provider.getBlock(receipt.blockNumber);
      const expectedExpiry = BigInt(block!.timestamp) + BigInt(MONTH * 3);

      expect(await (gamePass as any).expiryOf(subscriber.address, 1))
        .to.equal(expectedExpiry);
    });

    it("renew sau hết hạn: emit PassSubscribed với newExpiry đúng", async function () {
      const { gamePass, subscriber } = await setupWithPass();

      await (gamePass as any).connect(subscriber).subscribe(1, 1);
      await time.increase(31 * 24 * 60 * 60);

      const tx      = await (gamePass as any).connect(subscriber).subscribe(1, 2);
      const receipt = await tx.wait();
      const block   = await ethers.provider.getBlock(receipt.blockNumber);
      const expectedExpiry = BigInt(block!.timestamp) + BigInt(MONTH * 2);

      await expect(tx)
        .to.emit(gamePass, "PassSubscribed")
        .withArgs(1n, subscriber.address, 2n, expectedExpiry);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Validation — months out of range
  // ────────────────────────────────────────────────────────────────────────
  describe("Validation — giới hạn months", function () {
    it("revert nếu months = 0", async function () {
      const { gamePass, subscriber } = await setupWithPass();
      await expect(
        (gamePass as any).connect(subscriber).subscribe(1, 0)
      ).to.be.revertedWith("GamePass: months out of range");
    });

    it("revert nếu months = 13 (vượt giới hạn 12)", async function () {
      const { gamePass, subscriber } = await setupWithPass();
      await expect(
        (gamePass as any).connect(subscriber).subscribe(1, 13)
      ).to.be.revertedWith("GamePass: months out of range");
    });

    it("subscribe months = 1 hợp lệ", async function () {
      const { gamePass, subscriber } = await setupWithPass();
      await expect(
        (gamePass as any).connect(subscriber).subscribe(1, 1)
      ).to.not.be.reverted;
    });

    it("subscribe months = 12 hợp lệ (tối đa)", async function () {
      const { gamePass, subscriber } = await setupWithPass();
      await expect(
        (gamePass as any).connect(subscriber).subscribe(1, 12)
      ).to.not.be.reverted;
    });

    it("subscribe months = 12: KEY giảm đúng 12 × MONTHLY_PRICE", async function () {
      const { gamePass, keyCoin, subscriber } = await setupWithPass();

      const keyBefore = await (keyCoin as any).balanceOf(subscriber.address);
      await (gamePass as any).connect(subscriber).subscribe(1, 12);
      const keyAfter = await (keyCoin as any).balanceOf(subscriber.address);

      expect(keyBefore - keyAfter).to.equal(MONTHLY_PRICE * 12n);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // MONTH constant
  // ────────────────────────────────────────────────────────────────────────
  describe("Hằng số MONTH", function () {
    it("MONTH = 30 days = 2592000 giây", async function () {
      const { gamePass } = await setupWithPass();
      expect(await (gamePass as any).MONTH()).to.equal(BigInt(MONTH));
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Nhiều subscriber độc lập
  // ────────────────────────────────────────────────────────────────────────
  describe("Nhiều subscriber độc lập", function () {
    it("2 subscriber có expiry hoàn toàn độc lập nhau", async function () {
      const { gameStore, gamePass, keyCoin, vendor } = await deployFixture();
      const [, , subscriber1, subscriber2] = await ethers.getSigners();

      await (gameStore as any)
        .connect(vendor)
        .registerGame("TestGame", GAME_PRICE, ROYALTY_BPS, GAME_URI);
      await (gamePass as any).connect(vendor).registerPass(1, MONTHLY_PRICE);

      // Cả 2 subscribe
      for (const sub of [subscriber1, subscriber2]) {
        await (keyCoin as any)
          .connect(sub)
          .buyKeyCoin({ value: ethers.parseEther("1") });
        await (keyCoin as any)
          .connect(sub)
          .approve(await gamePass.getAddress(), ethers.MaxUint256);
      }

      await (gamePass as any).connect(subscriber1).subscribe(1, 1);

      // Tua 5 ngày rồi subscriber2 mới subscribe
      await time.increase(5 * 24 * 60 * 60);
      await (gamePass as any).connect(subscriber2).subscribe(1, 1);

      const expiry1 = await (gamePass as any).expiryOf(subscriber1.address, 1);
      const expiry2 = await (gamePass as any).expiryOf(subscriber2.address, 1);

      // expiry2 phải lớn hơn expiry1 khoảng 5 ngày
      expect(expiry2).to.be.gt(expiry1);
      expect(expiry2 - expiry1).to.be.closeTo(BigInt(5 * 24 * 60 * 60), 5n);
    });
  });
});