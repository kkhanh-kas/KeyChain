/**
 * KeyChain — verify.ts
 * ====================
 * Nhiệm vụ chính:
 *   1. Đọc địa chỉ 6 contracts từ deployments/<network>.json
 *   2. Gọi hardhat verify cho từng contract với đúng constructor args
 *   3. Bỏ qua contract đã verify trước đó (idempotent)
 *   4. In link Etherscan cho từng contract sau khi verify thành công
 *
 * Yêu cầu:
 *   - deploy.ts đã chạy xong → deployments/sepolia.json tồn tại
 *   - ETHERSCAN_API_KEY có trong .env
 *
 * Usage:
 *   npx hardhat run scripts/verify.ts --network sepolia
 *   npm run verify
 */

import { run } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import hre from "hardhat";

dotenv.config();

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Đọc deployment addresses từ file JSON do deploy.ts tạo ra. */
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

/** Link Etherscan cho từng network. */
function explorerUrl(network: string, address: string): string {
  if (network === "sepolia") {
    return `https://sepolia.etherscan.io/address/${address}#code`;
  }
  return `https://etherscan.io/address/${address}#code`;
}

/**
 * Verify một contract. Nếu đã verify rồi thì bỏ qua,
 * không throw để tiếp tục verify các contract còn lại.
 */
async function verifyContract(
  name: string,
  address: string,
  constructorArguments: unknown[],
  network: string
) {
  process.stdout.write(`  ⏳  ${name.padEnd(22)}`);

  try {
    await run("verify:verify", {
      address,
      constructorArguments,
    });
    console.log(`✅  ${explorerUrl(network, address)}`);
  } catch (err: any) {
    // Etherscan trả về lỗi này nếu contract đã được verify trước đó
    if (
      err?.message?.toLowerCase().includes("already verified") ||
      err?.message?.toLowerCase().includes("already been verified")
    ) {
      console.log(`⏭   Already verified  →  ${explorerUrl(network, address)}`);
    } else {
      // Lỗi thật sự — in ra nhưng không dừng script
      console.log(`❌  FAILED`);
      console.error(`      ${err?.message ?? err}`);
    }
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  // Kiểm tra ETHERSCAN_API_KEY
  if (!process.env.ETHERSCAN_API_KEY) {
    throw new Error(
      "ETHERSCAN_API_KEY chưa được set trong .env\n" +
        "Lấy key tại: https://etherscan.io/myapikey"
    );
  }

  // Lấy network từ Hardhat runtime
  const { ethers } = await import("hardhat");
  const network = hre.network.name;

  console.log("━".repeat(55));
  console.log(`  KeyChain verify  |  network: ${network}`);
  console.log("━".repeat(55));

  // Đọc deployment addresses
  const deployment = loadDeployment(network);

  const {
    KeyCoin,
    GameToken,
    GameStore,
    ActivationContract,
    Marketplace,
    GamePass,
  } = deployment;

  // Kiểm tra tất cả địa chỉ có đủ không
  const required = ["KeyCoin", "GameToken", "GameStore", "ActivationContract", "Marketplace", "GamePass"];
  for (const name of required) {
    if (!deployment[name]) {
      throw new Error(`Thiếu địa chỉ ${name} trong deployment file.`);
    }
  }

  // KEYCOIN_RATE phải khớp với giá trị dùng khi deploy
  // Nếu bạn đã đổi giá trị này trong deploy.ts thì đổi ở đây theo
  const KEYCOIN_RATE = ethers.parseUnits("1000", 18);

  console.log(`\n🔍  Verifying 6 contracts trên ${network}...\n`);

  // ── 1. KeyCoin ────────────────────────────────────────────────
  // constructor(uint256 initialRate)
  await verifyContract("KeyCoin", KeyCoin, [KEYCOIN_RATE], network);

  // ── 2. GameToken ──────────────────────────────────────────────
  // constructor()  — không có args
  await verifyContract("GameToken", GameToken, [], network);

  // ── 3. GameStore ──────────────────────────────────────────────
  // constructor(address keyCoin_, address gameToken_)
  await verifyContract("GameStore", GameStore, [KeyCoin, GameToken], network);

  // ── 4. ActivationContract ─────────────────────────────────────
  // constructor(address gameToken_)
  await verifyContract("ActivationContract", ActivationContract, [GameToken], network);

  // ── 5. Marketplace ────────────────────────────────────────────
  // constructor(address keyCoin_, address gameToken_, address activation_)
  await verifyContract(
    "Marketplace",
    Marketplace,
    [KeyCoin, GameToken, ActivationContract],
    network
  );

  // ── 6. GamePass ───────────────────────────────────────────────
  // constructor(address keyCoin_, address gameStore_)
  await verifyContract("GamePass", GamePass, [KeyCoin, GameStore], network);

  // ── Tổng kết ──────────────────────────────────────────────────
  console.log("\n━".repeat(55));
  console.log("\n📋  Tất cả contracts trên Etherscan:\n");
  for (const [name, address] of Object.entries(deployment)) {
    if (name === "network") continue;
    console.log(`  ${name.padEnd(22)} ${explorerUrl(network, address)}`);
  }
  console.log();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});