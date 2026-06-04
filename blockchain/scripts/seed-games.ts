/**
 * KeyChain — seed-games.ts
 * ========================
 * Nhiệm vụ chính:
 *   1. Đọc địa chỉ contracts từ deployments/<network>.json
 *   2. Dùng vendor wallet (từ VENDOR_PRIVATE_KEY hoặc deployer) registerGame()
 *      cho từng game trong danh sách SEED_GAMES
 *   3. Đăng ký GamePass (subscription) cho mỗi game nếu có monthlyPrice
 *   4. In catalog kết quả để xác nhận
 *
 * Yêu cầu trước khi chạy:
 *   - deploy.ts đã chạy xong
 *   - setup-roles.ts đã grant VENDOR_ROLE cho vendor wallet
 *   - Vendor wallet có đủ ETH để trả gas
 *
 * Usage:
 *   npx hardhat run scripts/seed-games.ts --network sepolia
 *   npx hardhat run scripts/seed-games.ts --network hardhat
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// ─── Dữ liệu seed ──────────────────────────────────────────────────────────

/**
 * Danh sách game demo. Mỗi game sẽ được registerGame() trên GameStore.
 *
 * price: số KEY (18 decimals — dùng ethers.parseUnits)
 * royaltyBps: royalty thứ cấp tính bằng basis points (500 = 5%)
 * uri: IPFS CID metadata (JSON gồm name, description, image)
 * monthlyPrice: nếu > 0, registerPass() trên GamePass với giá này/tháng
 */
const SEED_GAMES = [
  {
    name: "CryptoQuest",
    price: ethers.parseUnits("10", 18),      // 10 KEY
    royaltyBps: 500,                          // 5% royalty thứ cấp
    uri: "ipfs://QmCryptoQuestMetadataCIDHere",
    monthlyPrice: ethers.parseUnits("3", 18), // 3 KEY/tháng
  },
  {
    name: "BlockBrawl",
    price: ethers.parseUnits("25", 18),       // 25 KEY
    royaltyBps: 750,                          // 7.5%
    uri: "ipfs://QmBlockBrawlMetadataCIDHere",
    monthlyPrice: ethers.parseUnits("5", 18), // 5 KEY/tháng
  },
  {
    name: "NFT Racer",
    price: ethers.parseUnits("15", 18),       // 15 KEY
    royaltyBps: 300,                          // 3%
    uri: "ipfs://QmNFTRacerMetadataCIDHere",
    monthlyPrice: BigInt(0),                  // không có subscription
  },
  {
    name: "DeFi Dungeon",
    price: ethers.parseUnits("50", 18),       // 50 KEY — premium game
    royaltyBps: 1000,                         // 10%
    uri: "ipfs://QmDeFiDungeonMetadataCIDHere",
    monthlyPrice: ethers.parseUnits("8", 18), // 8 KEY/tháng
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

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

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const [deployer] = await ethers.getSigners();
  const networkObj = await ethers.provider.getNetwork();
  const network = networkObj.name;

  console.log("━".repeat(55));
  console.log(`  seed-games   |  network: ${network}`);
  console.log(`  Vendor       |  ${deployer.address}`);
  console.log("━".repeat(55));

  // ── Load addresses ────────────────────────────────────────────────────────
  const deployment = loadDeployment(network);
  const { GameStore: gameStoreAddr, GamePass: gamePassAddr } = deployment;

  if (!gameStoreAddr) throw new Error("GameStore address missing in deployment.");
  if (!gamePassAddr)  throw new Error("GamePass address missing in deployment.");

  // ── Attach contracts ──────────────────────────────────────────────────────
  const GameStore = await ethers.getContractFactory("GameStore");
  const gameStore = GameStore.attach(gameStoreAddr) as any;

  const GamePass = await ethers.getContractFactory("GamePass");
  const gamePass = GamePass.attach(gamePassAddr) as any;

  // ── Kiểm tra VENDOR_ROLE ──────────────────────────────────────────────────
  const VENDOR_ROLE = await gameStore.VENDOR_ROLE();
  const isVendor = await gameStore.hasRole(VENDOR_ROLE, deployer.address);
  if (!isVendor) {
    throw new Error(
      `Địa chỉ ${deployer.address} chưa có VENDOR_ROLE.\n` +
        `Chạy setup-roles.ts trước để grant role.`
    );
  }

  // ── Register games ────────────────────────────────────────────────────────
  console.log(`\n🎮  Đăng ký ${SEED_GAMES.length} games…\n`);

  const registeredGameIds: { name: string; gameId: bigint; hasPass: boolean }[] = [];

  for (const game of SEED_GAMES) {
    process.stdout.write(`  ⏳  ${game.name.padEnd(16)}`);

    const tx = await gameStore.registerGame(
      game.name,
      game.price,
      game.royaltyBps,
      game.uri
    );
    const receipt = await tx.wait();

    // Lấy gameId từ event log (LicensePurchased không có — đọc nextGameId thay thế)
    // registerGame() trả về gameId qua return value, đọc từ receipt events nếu có
    // hoặc đơn giản đọc catalog sau để biết id
    const gameId = BigInt(registeredGameIds.length + 1); // sequential từ 1

    registeredGameIds.push({ name: game.name, gameId, hasPass: game.monthlyPrice > 0n });

    console.log(
      ` ✅  gameId=${gameId}  price=${ethers.formatUnits(game.price, 18)} KEY` +
        `  royalty=${game.royaltyBps / 100}%`
    );
  }

  // ── Register GamePass cho các game có monthlyPrice ────────────────────────
  const passGames = SEED_GAMES.filter((g) => g.monthlyPrice > 0n);

  if (passGames.length > 0) {
    console.log(`\n🎫  Đăng ký GamePass cho ${passGames.length} game(s)…\n`);

    for (let i = 0; i < SEED_GAMES.length; i++) {
      const game = SEED_GAMES[i];
      if (game.monthlyPrice === 0n) continue;

      const gameId = i + 1;
      process.stdout.write(`  ⏳  ${game.name.padEnd(16)}`);

      const tx = await gamePass.registerPass(gameId, game.monthlyPrice);
      await tx.wait();

      console.log(
        ` ✅  gameId=${gameId}  ${ethers.formatUnits(game.monthlyPrice, 18)} KEY/tháng`
      );
    }
  }

  // ── Xác nhận catalog trên chain ───────────────────────────────────────────
  console.log("\n📋  Catalog trên chain:\n");
  const [ids, infos] = await gameStore.getCatalog();

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const info = infos[i];
    console.log(
      `  [${id}] ${info.name.padEnd(16)}` +
        `  price=${ethers.formatUnits(info.price, 18).padStart(6)} KEY` +
        `  listed=${info.isListed}` +
        `  vendor=${info.vendorAddress.slice(0, 10)}…`
    );
  }

  console.log("\n✅  seed-games hoàn thành.\n");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
