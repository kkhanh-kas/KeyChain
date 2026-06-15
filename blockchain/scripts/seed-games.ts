/**
 * KeyChain - seed-games.ts
 * ========================
 * Seeds a catalog of real indie games. For each game it:
 *   1. Uploads the cover image from seed-assets/ to IPFS (Pinata)
 *   2. Builds + uploads a metadata JSON (name, description, image, attributes)
 *   3. registerGame() on GameStore with the metadata ipfs:// URI
 *   4. registerPass() on GamePass for games that offer a subscription
 *
 * Prerequisites:
 *   - deploy.ts has run  (deployments/<network>.json exists)
 *   - setup-roles.ts granted VENDOR_ROLE to the deployer wallet
 *   - PINATA_JWT is set in blockchain/.env  (same JWT as the frontend)
 *   - Cover images placed in blockchain/seed-assets/ (e.g. omori.jpg)
 *
 * Usage:
 *   npx hardhat run scripts/seed-games.ts --network sepolia
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import hre from "hardhat";

// --- Seed data (6 indie games) ---

interface SeedGame {
  name: string;
  slug: string;          // cover image filename (without extension) in seed-assets/
  genre: string;
  description: string;
  price: bigint;         // KEY (18 decimals)
  royaltyBps: number;    // secondary-market royalty, basis points (500 = 5%)
  monthlyPrice: bigint;  // GamePass price per month; 0n = no pass
}

const SEED_GAMES: SeedGame[] = [
  {
    name: "OMORI",
    slug: "omori",
    genre: "Psychological RPG",
    description: "Explore a surreal world and confront what waits in the dark to retrieve what has been lost.",
    price: ethers.parseUnits("30", 18),
    royaltyBps: 500,
    monthlyPrice: ethers.parseUnits("3", 18),
  },
  {
    name: "Stardew Valley",
    slug: "stardew-valley",
    genre: "Farming Sim",
    description: "Inherit your grandfather's old farm plot and build the country life you've always dreamed of.",
    price: ethers.parseUnits("25", 18),
    royaltyBps: 500,
    monthlyPrice: 0n,
  },
  {
    name: "Don't Starve Together",
    slug: "dont-starve-together",
    genre: "Survival",
    description: "A multiplayer survival game of uncompromising wilderness — gather, craft, and endure together.",
    price: ethers.parseUnits("20", 18),
    royaltyBps: 750,
    monthlyPrice: ethers.parseUnits("4", 18),
  },
  {
    name: "Cult of the Lamb",
    slug: "cult-of-the-lamb",
    genre: "Roguelike",
    description: "Build a loyal flock and lead them through a twisted land in the name of a fallen god.",
    price: ethers.parseUnits("28", 18),
    royaltyBps: 600,
    monthlyPrice: 0n,
  },
  {
    name: "Spiritfarer",
    slug: "spiritfarer",
    genre: "Adventure",
    description: "A cozy management game about dying — care for spirits, then release them into the beyond.",
    price: ethers.parseUnits("22", 18),
    royaltyBps: 500,
    monthlyPrice: ethers.parseUnits("3", 18),
  },
  {
    name: "Hoa",
    slug: "hoa",
    genre: "Platformer",
    description: "A hand-painted puzzle platformer about returning home, set to a soft orchestral score.",
    price: ethers.parseUnits("15", 18),
    royaltyBps: 400,
    monthlyPrice: 0n,
  },
  {
    name: "GRIS",
    slug: "gris",
    genre: "Adventure",
    description: "A young girl lost in her own grief journeys through a watercolor world that blooms back into color.",
    price: ethers.parseUnits("18", 18),
    royaltyBps: 500,
    monthlyPrice: 0n,
  },
  {
    name: "Undertale",
    slug: "undertale",
    genre: "RPG",
    description: "A friendly RPG where nobody has to die — talk, spare, or fight your way out of the Underground.",
    price: ethers.parseUnits("20", 18),
    royaltyBps: 500,
    monthlyPrice: 0n,
  },
  {
    name: "Persona 3",
    slug: "persona-3",
    genre: "JRPG",
    description: "Balance ordinary school days with midnight battles in the Dark Hour as you face the mystery of death.",
    price: ethers.parseUnits("45", 18),
    royaltyBps: 750,
    monthlyPrice: ethers.parseUnits("5", 18),
  },
  {
    name: "A Date with Death",
    slug: "a-date-with-death",
    genre: "Visual Novel",
    description: "A text-message dating sim where you flirt with Death himself to talk your way out of an early grave.",
    price: ethers.parseUnits("12", 18),
    royaltyBps: 400,
    monthlyPrice: 0n,
  },
];

const ASSETS_DIR = path.join(__dirname, "..", "seed-assets");
const PINATA_JWT = process.env.PINATA_JWT;

// --- IPFS helpers (Pinata REST, uses Node 18+ global fetch/FormData/Blob) ---

const g = globalThis as any;

/** Find a cover image for a slug, trying common extensions. */
function findImage(slug: string): string {
  for (const ext of [".jpg", ".jpeg", ".png", ".webp"]) {
    const p = path.join(ASSETS_DIR, slug + ext);
    if (fs.existsSync(p)) return p;
  }
  throw new Error(
    `Cover image not found for "${slug}". Put ${slug}.jpg (or .png/.webp) in seed-assets/`
  );
}

/** Pin a file to IPFS, return its CID. */
async function pinFile(filePath: string): Promise<string> {
  const data = fs.readFileSync(filePath);
  const form = new g.FormData();
  form.append("file", new g.Blob([data]), path.basename(filePath));
  const res = await g.fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: form,
  });
  if (!res.ok) throw new Error(`pinFile failed: ${res.status} ${await res.text()}`);
  return (await res.json()).IpfsHash as string;
}

/** Pin a JSON object to IPFS, return its CID. */
async function pinJson(obj: unknown): Promise<string> {
  const res = await g.fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${PINATA_JWT}`, "Content-Type": "application/json" },
    body: JSON.stringify({ pinataContent: obj }),
  });
  if (!res.ok) throw new Error(`pinJson failed: ${res.status} ${await res.text()}`);
  return (await res.json()).IpfsHash as string;
}

// --- Deployment loading ---

function loadDeployment(network: string): Record<string, string> {
  const filePath = path.join(__dirname, "..", "deployments", `${network}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Deployment file not found: ${filePath}\nRun deploy.ts first: npm run deploy:${network}`
    );
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

// --- Main ---

async function main() {
  if (!PINATA_JWT) {
    throw new Error("PINATA_JWT not set in blockchain/.env (use the same JWT as the frontend).");
  }

  const [deployer] = await ethers.getSigners();
  const network = hre.network.name;

  console.log(`seed-games   |  network: ${network}`);
  console.log(`Vendor       |  ${deployer.address}\n`);

  const deployment = loadDeployment(network);
  const { GameStore: gameStoreAddr, GamePass: gamePassAddr } = deployment;
  if (!gameStoreAddr) throw new Error("GameStore address missing in deployment.");
  if (!gamePassAddr) throw new Error("GamePass address missing in deployment.");

  const GameStore = await ethers.getContractFactory("GameStore");
  const gameStore = GameStore.attach(gameStoreAddr) as any;
  const GamePass = await ethers.getContractFactory("GamePass");
  const gamePass = GamePass.attach(gamePassAddr) as any;

  // Vendor role check
  const VENDOR_ROLE = await gameStore.VENDOR_ROLE();
  if (!(await gameStore.hasRole(VENDOR_ROLE, deployer.address))) {
    throw new Error(
      `${deployer.address} lacks VENDOR_ROLE. Run setup-roles.ts first.`
    );
  }

  // Skip games already on-chain so this can be re-run after adding new entries
  // (re-registering would create duplicates).
  const [, existingInfos] = await gameStore.getCatalog();
  const existingNames = new Set(existingInfos.map((g: any) => g.name));

  console.log(`Registering ${SEED_GAMES.length} games...\n`);

  for (const game of SEED_GAMES) {
    if (existingNames.has(game.name)) {
      console.log(`  ${game.name.padEnd(22)} already registered — skip`);
      continue;
    }
    process.stdout.write(`  ${game.name.padEnd(22)}`);

    // 1. upload cover, 2. upload metadata
    const imageCid = await pinFile(findImage(game.slug));
    const metadataCid = await pinJson({
      name: game.name,
      description: game.description,
      image: `ipfs://${imageCid}`,
      attributes: { genre: game.genre, vendor: deployer.address, royaltyBps: game.royaltyBps },
    });
    const uri = `ipfs://${metadataCid}`;

    // 3. register on-chain (staticCall first to learn the gameId)
    const gameId: bigint = await gameStore.registerGame.staticCall(
      game.name, game.price, game.royaltyBps, uri
    );
    await (await gameStore.registerGame(game.name, game.price, game.royaltyBps, uri)).wait();

    // 4. register the pass if this game offers one
    if (game.monthlyPrice > 0n) {
      await (await gamePass.registerPass(gameId, game.monthlyPrice)).wait();
    }

    console.log(
      ` id=${gameId}  ${ethers.formatUnits(game.price, 18)} KEY` +
        `  royalty=${game.royaltyBps / 100}%` +
        (game.monthlyPrice > 0n ? `  pass=${ethers.formatUnits(game.monthlyPrice, 18)}/mo` : "") +
        `  cid=${metadataCid.slice(0, 10)}…`
    );
  }

  // Confirm catalog
  console.log("\nOn-chain catalog:\n");
  const [ids, infos] = await gameStore.getCatalog();
  for (let i = 0; i < ids.length; i++) {
    console.log(
      `  [${ids[i]}] ${infos[i].name.padEnd(22)} ${ethers.formatUnits(infos[i].price, 18).padStart(5)} KEY  listed=${infos[i].isListed}`
    );
  }
  console.log("\nseed-games done.\n");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
