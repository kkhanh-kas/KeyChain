/**
 * KeyChain — secondary-market.test.ts
 * =====================================
 * Luồng: mua → activate → deactivate → list → người khác mua
 *         → royalty tự động → activation reset
 *
 * Actors:
 *   deployer  — deploy contracts, cấp VENDOR_ROLE
 *   vendor    — đăng ký game, nhận royalty từ mỗi lần bán lại
 *   seller    — mua license gốc, activate, deactivate, list bán lại
 *   buyer     — mua license trên secondary market
 *
 * Điểm đặc biệt cần test:
 *   - License PHẢI deactivate trước khi list (còn active → revert)
 *   - GameToken được escrow vào Marketplace khi list
 *   - Payment tự động split: royalty (5%) → vendor, còn lại → seller
 *   - Sau khi bán: buyer nhận GameToken, seller mất GameToken
 *   - Activation của seller đã reset (isActive = false trước đó)
 *   - Buyer chưa activate (isActive = false)
 */

import { expect } from "chai";
import { ethers } from "hardhat";

// ─── Constants ─────────────────────────────────────────────────────────────

const KEYCOIN_RATE   = ethers.parseUnits("1000", 18);
const GAME_PRICE     = ethers.parseUnits("20", 18);   // 20 KEY — primary market
const LIST_PRICE     = ethers.parseUnits("15", 18);   // 15 KEY — harga jual lại
const ROYALTY_BPS    = 500;                            // 5%
const GAME_URI       = "ipfs://QmSecondaryMarketTest";
const MACHINE_HASH   = ethers.keccak256(ethers.toUtf8Bytes("seller-device-001"));

// ─── Fixture ───────────────────────────────────────────────────────────────

async function deployFixture() {
  const [deployer, vendor, seller, buyer] = await ethers.getSigners();

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

  const ActivationContract = await ethers.getContractFactory("ActivationContract");
  const activation = await ActivationContract.deploy(await gameToken.getAddress());
  await activation.waitForDeployment();

  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(
    await keyCoin.getAddress(),
    await gameToken.getAddress(),
    await activation.getAddress()
  );
  await marketplace.waitForDeployment();

  // Wire MINTER_ROLE
  const MINTER_ROLE = await (gameToken as any).MINTER_ROLE();
  await (gameToken as any).grantRole(MINTER_ROLE, await gameStore.getAddress());

  // Grant VENDOR_ROLE
  const VENDOR_ROLE = await (gameStore as any).VENDOR_ROLE();
  await (gameStore as any).grantRole(VENDOR_ROLE, vendor.address);

  return { keyCoin, gameToken, gameStore, activation, marketplace, deployer, vendor, seller, buyer };
}

/**
 * Setup đầy đủ: vendor đăng ký game, seller mua license, buyer có KEY sẵn sàng.
 */
async function setupWithLicense() {
  const ctx = await deployFixture();
  const { gameStore, gameToken, keyCoin, marketplace, vendor, seller, buyer } = ctx;

  // Vendor đăng ký game
  await (gameStore as any)
    .connect(vendor)
    .registerGame("BlockBrawl", GAME_PRICE, ROYALTY_BPS, GAME_URI);

  // Seller mua KEY và mua license
  await (keyCoin as any).connect(seller).buyKeyCoin({ value: ethers.parseEther("1") });
  await (keyCoin as any)
    .connect(seller)
    .approve(await gameStore.getAddress(), ethers.MaxUint256);
  await (gameStore as any).connect(seller).purchaseLicense(1);

  // Seller approve Marketplace để escrow GameToken
  await (gameToken as any)
    .connect(seller)
    .setApprovalForAll(await marketplace.getAddress(), true);

  // Buyer mua KEY và approve Marketplace
  await (keyCoin as any).connect(buyer).buyKeyCoin({ value: ethers.parseEther("1") });
  await (keyCoin as any)
    .connect(buyer)
    .approve(await marketplace.getAddress(), ethers.MaxUint256);

  return ctx;
}

// ══════════════════════════════════════════════════════════════════════════
//  Test suite
// ══════════════════════════════════════════════════════════════════════════

describe("Secondary Market — mua → activate → list → royalty → activation reset", function () {

  // ────────────────────────────────────────────────────────────────────────
  // Bước 1: Mua và activate license gốc
  // ────────────────────────────────────────────────────────────────────────
  describe("Bước 1: Seller mua và activate license", function () {
    it("seller nhận được GameToken sau khi mua license", async function () {
      const { gameToken, seller } = await setupWithLicense();
      expect(await (gameToken as any).balanceOf(seller.address, 1)).to.equal(1n);
    });

    it("seller activate license thành công", async function () {
      const { activation, seller } = await setupWithLicense();

      await (activation as any).connect(seller).activateLicense(1, MACHINE_HASH);

      expect(await (activation as any).isActive(seller.address, 1)).to.be.true;
    });

    it("isActive = true sau activate, block resale", async function () {
      const { activation, marketplace, seller } = await setupWithLicense();

      await (activation as any).connect(seller).activateLicense(1, MACHINE_HASH);

      // Thử list khi còn active → phải revert
      await expect(
        (marketplace as any).connect(seller).listLicense(1, LIST_PRICE)
      ).to.be.revertedWith("Marketplace: license active");
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Bước 2: Deactivate để chuẩn bị bán lại
  // ────────────────────────────────────────────────────────────────────────
  describe("Bước 2: Deactivate license trước khi list", function () {
    it("deactivateLicense: isActive trở về false", async function () {
      const { activation, seller } = await setupWithLicense();

      await (activation as any).connect(seller).activateLicense(1, MACHINE_HASH);
      await (activation as any).connect(seller).deactivateLicense(1);

      expect(await (activation as any).isActive(seller.address, 1)).to.be.false;
    });

    it("deactivateLicense: revert nếu chưa activate", async function () {
      const { activation, seller } = await setupWithLicense();

      // Chưa activate lần nào → deactivate phải revert
      await expect(
        (activation as any).connect(seller).deactivateLicense(1)
      ).to.be.revertedWith("Activation: not active");
    });

    it("sau deactivate có thể list được ngay lập tức", async function () {
      const { activation, marketplace, seller } = await setupWithLicense();

      await (activation as any).connect(seller).activateLicense(1, MACHINE_HASH);
      await (activation as any).connect(seller).deactivateLicense(1);

      // Không revert
      await expect(
        (marketplace as any).connect(seller).listLicense(1, LIST_PRICE)
      ).to.not.be.reverted;
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Bước 3: List license lên Marketplace
  // ────────────────────────────────────────────────────────────────────────
  describe("Bước 3: List license lên Marketplace", function () {
    async function setupWithListing() {
      const ctx = await setupWithLicense();
      const { activation, marketplace, seller } = ctx;

      // Activate rồi deactivate để chuẩn bị list
      await (activation as any).connect(seller).activateLicense(1, MACHINE_HASH);
      await (activation as any).connect(seller).deactivateLicense(1);

      // List license
      await (marketplace as any).connect(seller).listLicense(1, LIST_PRICE);

      return ctx;
    }

    it("listLicense: GameToken được escrow vào Marketplace", async function () {
      const { gameToken, marketplace, seller } = await setupWithListing();

      // Marketplace giữ token
      expect(
        await (gameToken as any).balanceOf(await marketplace.getAddress(), 1)
      ).to.equal(1n);

      // Seller không còn token
      expect(await (gameToken as any).balanceOf(seller.address, 1)).to.equal(0n);
    });

    it("listLicense: listing có đúng thông tin", async function () {
      const { marketplace, seller } = await setupWithListing();

      const listing = await (marketplace as any).getListing(1);
      expect(listing.tokenId).to.equal(1n);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.price).to.equal(LIST_PRICE);
      expect(listing.isOpen).to.be.true;
    });

    it("listLicense: revert nếu list license đang active", async function () {
      const { activation, marketplace, seller } = await setupWithLicense();

      await (activation as any).connect(seller).activateLicense(1, MACHINE_HASH);
      // Không deactivate → list phải revert

      await expect(
        (marketplace as any).connect(seller).listLicense(1, LIST_PRICE)
      ).to.be.revertedWith("Marketplace: license active");
    });

    it("listLicense: revert nếu không có license (chưa mua)", async function () {
      const ctx = await deployFixture();
      const { gameStore, keyCoin, gameToken, marketplace, vendor, buyer } = ctx;

      await (gameStore as any)
        .connect(vendor)
        .registerGame("TestGame", GAME_PRICE, ROYALTY_BPS, GAME_URI);
      await (gameToken as any)
        .connect(buyer)
        .setApprovalForAll(await marketplace.getAddress(), true);

      // buyer chưa mua → không có token → safeTransferFrom sẽ revert
      await expect(
        (marketplace as any).connect(buyer).listLicense(1, LIST_PRICE)
      ).to.be.reverted;
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Bước 4: Người khác mua, royalty tự động, activation reset
  // ────────────────────────────────────────────────────────────────────────
  describe("Bước 4: Buyer mua listing, royalty chia đúng", function () {
    async function setupWithActiveListing() {
      const ctx = await setupWithLicense();
      const { activation, marketplace, seller } = ctx;

      await (activation as any).connect(seller).activateLicense(1, MACHINE_HASH);
      await (activation as any).connect(seller).deactivateLicense(1);
      await (marketplace as any).connect(seller).listLicense(1, LIST_PRICE);

      return ctx;
    }

    it("buyLicense: buyer nhận được GameToken", async function () {
      const { gameToken, marketplace, buyer } = await setupWithActiveListing();

      await (marketplace as any).connect(buyer).buyLicense(1);

      expect(await (gameToken as any).balanceOf(buyer.address, 1)).to.equal(1n);
    });

    it("buyLicense: Marketplace không còn giữ token (escrow giải phóng)", async function () {
      const { gameToken, marketplace, buyer } = await setupWithActiveListing();

      await (marketplace as any).connect(buyer).buyLicense(1);

      expect(
        await (gameToken as any).balanceOf(await marketplace.getAddress(), 1)
      ).to.equal(0n);
    });

    it("buyLicense: vendor nhận đúng royalty 5% của LIST_PRICE", async function () {
      const { keyCoin, marketplace, vendor, buyer } = await setupWithActiveListing();

      const royalty = (LIST_PRICE * BigInt(ROYALTY_BPS)) / 10000n; // 5% của 15 KEY = 0.75 KEY

      const vendorKeyBefore = await (keyCoin as any).balanceOf(vendor.address);
      await (marketplace as any).connect(buyer).buyLicense(1);
      const vendorKeyAfter = await (keyCoin as any).balanceOf(vendor.address);

      // Vendor đã nhận GAME_PRICE khi seller mua primary, cộng thêm royalty thứ cấp
      expect(vendorKeyAfter - vendorKeyBefore).to.equal(royalty);
    });

    it("buyLicense: seller nhận đúng 95% của LIST_PRICE", async function () {
      const { keyCoin, marketplace, seller, buyer } = await setupWithActiveListing();

      const royalty       = (LIST_PRICE * BigInt(ROYALTY_BPS)) / 10000n;
      const sellerReceive = LIST_PRICE - royalty;

      const sellerKeyBefore = await (keyCoin as any).balanceOf(seller.address);
      await (marketplace as any).connect(buyer).buyLicense(1);
      const sellerKeyAfter = await (keyCoin as any).balanceOf(seller.address);

      expect(sellerKeyAfter - sellerKeyBefore).to.equal(sellerReceive);
    });

    it("buyLicense: tổng royalty + seller amount = LIST_PRICE (không thất thoát KEY)", async function () {
      const { keyCoin, marketplace, vendor, seller, buyer } = await setupWithActiveListing();

      const royalty       = (LIST_PRICE * BigInt(ROYALTY_BPS)) / 10000n;
      const sellerReceive = LIST_PRICE - royalty;

      const vendorBefore = await (keyCoin as any).balanceOf(vendor.address);
      const sellerBefore = await (keyCoin as any).balanceOf(seller.address);
      const buyerBefore  = await (keyCoin as any).balanceOf(buyer.address);

      await (marketplace as any).connect(buyer).buyLicense(1);

      const vendorDiff = (await (keyCoin as any).balanceOf(vendor.address)) - vendorBefore;
      const sellerDiff = (await (keyCoin as any).balanceOf(seller.address)) - sellerBefore;
      const buyerDiff  = buyerBefore - (await (keyCoin as any).balanceOf(buyer.address));

      // Không thất thoát
      expect(vendorDiff + sellerDiff).to.equal(buyerDiff);
      expect(vendorDiff).to.equal(royalty);
      expect(sellerDiff).to.equal(sellerReceive);
    });

    it("buyLicense: emit RoyaltyPaid với đúng vendor và amount", async function () {
      const { marketplace, vendor, buyer } = await setupWithActiveListing();

      const royalty = (LIST_PRICE * BigInt(ROYALTY_BPS)) / 10000n;

      await expect(
        (marketplace as any).connect(buyer).buyLicense(1)
      )
        .to.emit(marketplace, "RoyaltyPaid")
        .withArgs(1n, vendor.address, royalty);
    });

    it("buyLicense: listing.isOpen = false sau khi mua", async function () {
      const { marketplace, buyer } = await setupWithActiveListing();

      await (marketplace as any).connect(buyer).buyLicense(1);

      const listing = await (marketplace as any).getListing(1);
      expect(listing.isOpen).to.be.false;
    });

    it("buyLicense: revert nếu mua listing đã đóng", async function () {
      const { marketplace, buyer, seller } = await setupWithActiveListing();

      await (marketplace as any).connect(buyer).buyLicense(1);

      // Mua lần 2 → listing đã đóng → revert
      await expect(
        (marketplace as any).connect(buyer).buyLicense(1)
      ).to.be.revertedWith("Marketplace: not open");
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Bước 5: Xác nhận activation reset sau khi bán
  // ────────────────────────────────────────────────────────────────────────
  describe("Bước 5: Xác nhận activation state sau khi bán", function () {
    async function setupAfterSale() {
      const ctx = await setupWithLicense();
      const { activation, marketplace, seller, buyer } = ctx;

      await (activation as any).connect(seller).activateLicense(1, MACHINE_HASH);
      await (activation as any).connect(seller).deactivateLicense(1);
      await (marketplace as any).connect(seller).listLicense(1, LIST_PRICE);
      await (marketplace as any).connect(buyer).buyLicense(1);

      return ctx;
    }

    it("seller: isActive = false (đã deactivate trước khi list)", async function () {
      const { activation, seller } = await setupAfterSale();
      expect(await (activation as any).isActive(seller.address, 1)).to.be.false;
    });

    it("buyer: isActive = false (chưa activate lần nào)", async function () {
      const { activation, buyer } = await setupAfterSale();
      expect(await (activation as any).isActive(buyer.address, 1)).to.be.false;
    });

    it("buyer: có thể activate license vừa mua", async function () {
      const { activation, buyer } = await setupAfterSale();

      const buyerHash = ethers.keccak256(ethers.toUtf8Bytes("buyer-device-001"));
      await (activation as any).connect(buyer).activateLicense(1, buyerHash);

      expect(await (activation as any).isActive(buyer.address, 1)).to.be.true;
      const info = await (activation as any).getLicense(buyer.address, 1);
      expect(info.hardwareHash).to.equal(buyerHash);
    });

    it("seller: không còn license, không thể activate lại", async function () {
      const { activation, gameToken, seller } = await setupAfterSale();

      // Seller không còn token
      expect(await (gameToken as any).balanceOf(seller.address, 1)).to.equal(0n);

      // Không thể activate vì không có license
      await expect(
        (activation as any).connect(seller).activateLicense(1, MACHINE_HASH)
      ).to.be.revertedWith("Activation: not license owner");
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Cancel listing
  // ────────────────────────────────────────────────────────────────────────
  describe("Cancel listing", function () {
    async function setupWithListing() {
      const ctx = await setupWithLicense();
      const { activation, marketplace, seller } = ctx;

      await (activation as any).connect(seller).activateLicense(1, MACHINE_HASH);
      await (activation as any).connect(seller).deactivateLicense(1);
      await (marketplace as any).connect(seller).listLicense(1, LIST_PRICE);

      return ctx;
    }

    it("cancelListing: seller lấy lại được GameToken", async function () {
      const { gameToken, marketplace, seller } = await setupWithListing();

      await (marketplace as any).connect(seller).cancelListing(1);

      expect(await (gameToken as any).balanceOf(seller.address, 1)).to.equal(1n);
      expect(
        await (gameToken as any).balanceOf(await marketplace.getAddress(), 1)
      ).to.equal(0n);
    });

    it("cancelListing: listing.isOpen = false sau cancel", async function () {
      const { marketplace, seller } = await setupWithListing();

      await (marketplace as any).connect(seller).cancelListing(1);

      const listing = await (marketplace as any).getListing(1);
      expect(listing.isOpen).to.be.false;
    });

    it("cancelListing: revert nếu stranger cố cancel listing của seller", async function () {
      const { marketplace, buyer } = await setupWithListing();

      await expect(
        (marketplace as any).connect(buyer).cancelListing(1)
      ).to.be.revertedWith("Marketplace: not seller");
    });
  });
});