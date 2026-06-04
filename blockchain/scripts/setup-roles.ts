/**
 * KeyChain — setup-roles.ts
 * =========================
 * Nhiệm vụ chính:
 *   1. Đọc địa chỉ contracts đã deploy từ deployments/<network>.json
 *   2. Grant VENDOR_ROLE trên GameStore cho danh sách vendor
 *   3. (Tùy chọn) Grant DEFAULT_ADMIN_ROLE cho multisig, revoke deployer
 *   4. In bảng xác nhận roles sau khi setup xong
 *
 * Usage:
 *   npx hardhat run scripts/setup-roles.ts --network sepolia
 *   npx hardhat run scripts/setup-roles.ts --network hardhat
 *
 * Cấu hình:
 *   Chỉnh VENDORS và MULTISIG_ADDRESS bên dưới trước khi chạy.
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// ─── Cấu hình — chỉnh trước khi chạy ──────────────────────────────────────

/**
 * Danh sách địa chỉ được cấp VENDOR_ROLE.
 * Vendor có quyền: registerGame(), setGameListed() cho game của mình.
 */
const VENDORS: string[] = [
  // "0xVendorAddress1...",
  // "0xVendorAddress2...",
];

/**
 * Địa chỉ multisig (Gnosis Safe) nhận DEFAULT_ADMIN_ROLE.
 * Để trống ("") nếu chưa cần chuyển quyền admin (testnet).
 * BẮT BUỘC điền trước khi deploy mainnet.
 */
const MULTISIG_ADDRESS = "";

/**
 * Nếu true: sau khi grant admin cho multisig, revoke deployer khỏi admin.
 * Chỉ bật khi MULTISIG_ADDRESS đã được xác nhận chính xác.
 */
const REVOKE_DEPLOYER_ADMIN = false;

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Đọc deployed addresses từ file JSON do deploy.ts tạo ra. */
function loadDeployment(network: string): Record<string, string> {
  const filePath = path.join(__dirname, "..", "deployments", `${network}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Deployment file not found: ${filePath}\n` +
        `Hãy chạy deploy.ts trước: npm run deploy:${network}`
    );
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function log(msg: string) {
  console.log(msg);
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const [deployer] = await ethers.getSigners();
  const networkObj = await ethers.provider.getNetwork();
  const network = networkObj.name;

  console.log("━".repeat(55));
  console.log(`  setup-roles  |  network: ${network}`);
  console.log(`  Deployer     |  ${deployer.address}`);
  console.log("━".repeat(55));

  // ── Load deployment addresses ─────────────────────────────────────────────
  const deployment = loadDeployment(network);
  const gameStoreAddr = deployment.GameStore;

  if (!gameStoreAddr) {
    throw new Error("GameStore address not found in deployment file.");
  }

  // ── Attach to GameStore ───────────────────────────────────────────────────
  const GameStore = await ethers.getContractFactory("GameStore");
  const gameStore = GameStore.attach(gameStoreAddr) as any;

  const VENDOR_ROLE = await gameStore.VENDOR_ROLE();
  const ADMIN_ROLE = await gameStore.DEFAULT_ADMIN_ROLE();

  log(`\n📋  GameStore  → ${gameStoreAddr}`);
  log(`    VENDOR_ROLE = ${VENDOR_ROLE}`);
  log(`    ADMIN_ROLE  = ${ADMIN_ROLE}`);

  // ── Grant VENDOR_ROLE ─────────────────────────────────────────────────────
  if (VENDORS.length === 0) {
    log("\n⚠️   VENDORS list is empty — chỉnh mảng VENDORS trong file này rồi chạy lại.");
  } else {
    log(`\n🔧  Granting VENDOR_ROLE to ${VENDORS.length} address(es)…`);
    for (const vendor of VENDORS) {
      const already = await gameStore.hasRole(VENDOR_ROLE, vendor);
      if (already) {
        log(`⏭   ${vendor}  (đã có VENDOR_ROLE, bỏ qua)`);
        continue;
      }
      const tx = await gameStore.grantRole(VENDOR_ROLE, vendor);
      await tx.wait();
      log(`✅  ${vendor}  → VENDOR_ROLE granted`);
    }
  }

  // ── (Tùy chọn) Chuyển quyền admin sang multisig ───────────────────────────
  if (MULTISIG_ADDRESS) {
    log(`\n🔐  Chuyển DEFAULT_ADMIN_ROLE → ${MULTISIG_ADDRESS}…`);

    // Grant cho GameStore
    const tx1 = await gameStore.grantRole(ADMIN_ROLE, MULTISIG_ADDRESS);
    await tx1.wait();
    log(`✅  GameStore ADMIN_ROLE → multisig`);

    // Làm tương tự cho GameToken nếu cần
    // const GameToken = await ethers.getContractFactory("GameToken");
    // const gameToken = GameToken.attach(deployment.GameToken) as any;
    // const tx2 = await gameToken.grantRole(ADMIN_ROLE, MULTISIG_ADDRESS);
    // await tx2.wait();
    // log(`✅  GameToken ADMIN_ROLE → multisig`);

    if (REVOKE_DEPLOYER_ADMIN) {
      log(`\n⚠️   Revoking deployer ADMIN_ROLE…`);
      const tx3 = await gameStore.revokeRole(ADMIN_ROLE, deployer.address);
      await tx3.wait();
      log(`✅  Deployer ADMIN_ROLE revoked — deployer không còn quyền admin`);
    }
  }

  // ── Xác nhận trạng thái cuối ──────────────────────────────────────────────
  log("\n📊  Kiểm tra trạng thái roles:\n");
  for (const vendor of VENDORS) {
    const hasVendor = await gameStore.hasRole(VENDOR_ROLE, vendor);
    log(`    ${vendor}  VENDOR_ROLE=${hasVendor}`);
  }
  const deployerHasAdmin = await gameStore.hasRole(ADMIN_ROLE, deployer.address);
  log(`    ${deployer.address}  ADMIN_ROLE=${deployerHasAdmin}  (deployer)`);
  if (MULTISIG_ADDRESS) {
    const multisigHasAdmin = await gameStore.hasRole(ADMIN_ROLE, MULTISIG_ADDRESS);
    log(`    ${MULTISIG_ADDRESS}  ADMIN_ROLE=${multisigHasAdmin}  (multisig)`);
  }

  log("\n✅  setup-roles hoàn thành.\n");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
