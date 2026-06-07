/**
 * KeyChain - seed-games.ts
 * ========================
 * Tasks:
 *   1. Read contract addresses from deployments/<network>.json
 *   2. Use the vendor wallet (from VENDOR_PRIVATE_KEY or deployer) to
 *      registerGame() for each game in SEED_GAMES
 *   3. Register a GamePass (subscription) for each game that has a monthlyPrice
 *   4. Print the resulting catalog for confirmation
 *
 * Prerequisites:
 *   - deploy.ts has run
 *   - setup-roles.ts has granted VENDOR_ROLE to the vendor wallet
 *   - The vendor wallet has enough ETH for gas
 *
 * Usage:
 *   npx hardhat run scripts/seed-games.ts --network sepolia
 *   npx hardhat run scripts/seed-games.ts --network hardhat
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import hre from "hardhat";

// --- Seed data ---

/**
 * Demo game list. Each game is registered via registerGame() on GameStore.
 *
 * price: amount of KEY (18 decimals - use ethers.parseUnits)
 * royaltyBps: secondary-market royalty in basis points (500 = 5%)
 * uri: IPFS CID metadata (JSON with name, description, image)
 * monthlyPrice: if > 0, registerPass() on GamePass with this price per month
 */
const SEED_GAMES = [
  {
    name: "CryptoQuest",
    price: ethers.parseUnits("10", 18),      // 10 KEY
    royaltyBps: 500,                          // 5% secondary royalty
    uri: "ipfs://QmCryptoQuestMetadataCIDHere",
    monthlyPrice: ethers.parseUnits("3", 18), // 3 KEY/month
  },
  {
    name: "BlockBrawl",
    price: ethers.parseUnits("25", 18),       // 25 KEY
    royaltyBps: 750,                          // 7.5%
    uri: "ipfs://QmBlockBrawlMetadataCIDHere",
    monthlyPrice: ethers.parseUnits("5", 18), // 5 KEY/month
  },
  {
    name: "NFT Racer",
    price: ethers.parseUnits("15", 18),       // 15 KEY
    royaltyBps: 300,                          // 3%
    uri: "ipfs://QmNFTRacerMetadataCIDHere",
    monthlyPrice: BigInt(0),                  // no subscription
  },
  {
    name: "DeFi Dungeon",
    price: ethers.parseUnits("50", 18),       // 50 KEY - premium game
    royaltyBps: 1000,                         // 10%
    uri: "ipfs://QmDeFiDungeonMetadataCIDHere",
    monthlyPrice: ethers.parseUnits("8", 18), // 8 KEY/month
  },
];

// --- Helpers ---

function loadDeployment(network: string): Record<string, string> {
  const filePath = path.join(__dirname, "..", "deployments", `${network}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Deployment file not found: ${filePath}\n` +
        `Run deploy.ts first: npm run deploy:${network}`
    );
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

// --- Main ---

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = hre.network.name;

  console.log(`seed-games   |  network: ${network}`);
  console.log(`Vendor       |  ${deployer.address}`);

  // Load addresses
  const deployment = loadDeployment(network);
  const { GameStore: gameStoreAddr, GamePass: gamePassAddr } = deployment;

  if (!gameStoreAddr) throw new Error("GameStore address missing in deployment.");
  if (!gamePassAddr)  throw new Error("GamePass address missing in deployment.");

  // Attach contracts
  const GameStore = await ethers.getContractFactory("GameStore");
  const gameStore = GameStore.attach(gameStoreAddr) as any;

  const GamePass = await ethers.getContractFactory("GamePass");
  const gamePass = GamePass.attach(gamePassAddr) as any;

  // Check VENDOR_ROLE
  const VENDOR_ROLE = await gameStore.VENDOR_ROLE();
  const isVendor = await gameStore.hasRole(VENDOR_ROLE, deployer.address);
  if (!isVendor) {
    throw new Error(
      `Address ${deployer.address} does not have VENDOR_ROLE.\n` +
        `Run setup-roles.ts first to grant the role.`
    );
  }

  // Register games
  console.log(`\nRegistering ${SEED_GAMES.length} games...\n`);

  const registeredGameIds: { name: string; gameId: bigint; hasPass: boolean }[] = [];

  for (const game of SEED_GAMES) {
    process.stdout.write(`  ${game.name.padEnd(16)}`);

    // staticCall to read the gameId without spending gas
    const gameId: bigint = await gameStore.registerGame.staticCall(
      game.name,
      game.price,
      game.royaltyBps,
      game.uri
    );

    const tx = await gameStore.registerGame(
      game.name,
      game.price,
      game.royaltyBps,
      game.uri
    );
    await tx.wait();

    registeredGameIds.push({ name: game.name, gameId, hasPass: game.monthlyPrice > 0n });

    console.log(
      ` gameId=${gameId}  price=${ethers.formatUnits(game.price, 18)} KEY` +
        `  royalty=${game.royaltyBps / 100}%`
    );
  }

  // Register GamePass for games that have a monthlyPrice
  const passGames = SEED_GAMES.filter((g) => g.monthlyPrice > 0n);

  if (passGames.length > 0) {
    console.log(`\nRegistering GamePass for ${passGames.length} game(s)...\n`);

    for (let i = 0; i < SEED_GAMES.length; i++) {
      const game = SEED_GAMES[i];
      if (game.monthlyPrice === 0n) continue;

      const gameId = i + 1;
      process.stdout.write(`  ${game.name.padEnd(16)}`);

      const tx = await gamePass.registerPass(gameId, game.monthlyPrice);
      await tx.wait();

      console.log(
        ` gameId=${gameId}  ${ethers.formatUnits(game.monthlyPrice, 18)} KEY/month`
      );
    }
  }

  // Confirm the on-chain catalog
  console.log("\nOn-chain catalog:\n");
  const [ids, infos] = await gameStore.getCatalog();

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const info = infos[i];
    console.log(
      `  [${id}] ${info.name.padEnd(16)}` +
        `  price=${ethers.formatUnits(info.price, 18).padStart(6)} KEY` +
        `  listed=${info.isListed}` +
        `  vendor=${info.vendorAddress.slice(0, 10)}...`
    );
  }

  console.log("\nseed-games done.\n");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
