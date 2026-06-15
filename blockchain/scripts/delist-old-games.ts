/**
 * KeyChain - delist-old-games.ts
 * ==============================
 * One-off cleanup: hides the original placeholder catalog (CryptoQuest,
 * BlockBrawl, NFT Racer, DeFi Dungeon — game ids 1-4) before re-seeding with
 * the real indie titles. Calls setGameListed(id, false) as admin, so the games
 * drop out of the Store/Marketplace (which filter on isListed) without a redeploy.
 *
 * Safe to re-run: skips ids that are already delisted or don't exist.
 *
 * Usage:
 *   npx hardhat run scripts/delist-old-games.ts --network sepolia
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import hre from "hardhat";

const OLD_GAME_IDS = [1, 2, 3, 4];

async function main() {
  const [admin] = await ethers.getSigners();
  const network = hre.network.name;
  const deployment = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "deployments", `${network}.json`), "utf8")
  );

  const gameStore = (await ethers.getContractFactory("GameStore")).attach(
    deployment.GameStore
  ) as any;

  console.log(`delist-old-games  |  network: ${network}`);
  console.log(`Admin             |  ${admin.address}\n`);

  // getCatalog -> [ids[], infos[]] so we only touch games that exist + are listed
  const [ids, infos] = await gameStore.getCatalog();
  const byId = new Map<bigint, any>();
  ids.forEach((id: bigint, i: number) => byId.set(id, infos[i]));

  for (const id of OLD_GAME_IDS) {
    const info = byId.get(BigInt(id));
    if (!info) {
      console.log(`  [${id}] not found — skip`);
      continue;
    }
    if (!info.isListed) {
      console.log(`  [${id}] ${info.name.padEnd(24)} already delisted — skip`);
      continue;
    }
    await (await gameStore.setGameListed(id, false)).wait();
    console.log(`  [${id}] ${info.name.padEnd(24)} delisted ✓`);
  }

  console.log("\nRemaining listed catalog:\n");
  const [ids2, infos2] = await gameStore.getCatalog();
  for (let i = 0; i < ids2.length; i++) {
    if (infos2[i].isListed) {
      console.log(`  [${ids2[i]}] ${infos2[i].name.padEnd(24)} ${ethers.formatUnits(infos2[i].price, 18)} KEY`);
    }
  }
  console.log("\ndelist-old-games done.\n");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
