/**
 * KeyChain — Deploy Script
 * ========================
 * Deployment order (strict — each contract depends on the previous):
 *
 *   1. KeyCoin          (ERC-20 payment token, no deps)
 *   2. GameToken        (ERC-1155 license NFT, no deps)
 *   3. GameStore        (primary market — needs KeyCoin + GameToken)
 *   4. ActivationContract (activation state — needs GameToken)
 *   5. Marketplace      (secondary market — needs KeyCoin + GameToken + ActivationContract)
 *   6. GamePass         (subscription — needs KeyCoin + GameStore)
 *
 * Post-deploy wiring:
 *   - Grant GameStore the MINTER_ROLE on GameToken
 *   - (Optional) Grant DEFAULT_ADMIN_ROLE to a multisig and revoke deployer
 *
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network sepolia
 *   npx hardhat run scripts/deploy.ts --network hardhat   # local fork
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import hre from "hardhat";

// ─── Config ────────────────────────────────────────────────────────────────

/** KEY minted per 1 wei of ETH  (1 ETH → 1 000 KEY) */
const KEYCOIN_RATE = ethers.parseUnits("1000", 18);

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Pretty-print a deployed contract address. */
function log(name: string, address: string) {
  console.log(`✅  ${name.padEnd(22)} → ${address}`);
}

/**
 * Write all deployed addresses to a JSON file so post-deploy scripts
 * (setup-roles.ts, seed-games.ts, verify.ts) and the frontend .env.local
 * generator can read them without re-fetching.
 */
async function saveAddresses(
  network: string,
  addresses: Record<string, string>
) {
  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });

  const outFile = path.join(outDir, `${network}.json`);
  fs.writeFileSync(outFile, JSON.stringify({ network, ...addresses }, null, 2));

  console.log(`\n📄  Addresses saved → ${outFile}`);
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = hre.network.name;

  console.log("━".repeat(55));
  console.log(`  KeyChain deploy  |  network: ${network}`);
  console.log(`  Deployer         |  ${deployer.address}`);
  console.log(
    `  Balance          |  ${ethers.formatEther(
      await ethers.provider.getBalance(deployer.address)
    )} ETH`
  );
  console.log("━".repeat(55));

  // ── 1. KeyCoin ────────────────────────────────────────────────────────────
  // TODO: confirm KEYCOIN_RATE with product team before mainnet deploy
  const KeyCoin = await ethers.getContractFactory("KeyCoin");
  const keyCoin = await KeyCoin.deploy(KEYCOIN_RATE);
  await keyCoin.waitForDeployment();
  const keyCoinAddr = await keyCoin.getAddress();
  log("KeyCoin", keyCoinAddr);

  // ── 2. GameToken ──────────────────────────────────────────────────────────
  const GameToken = await ethers.getContractFactory("GameToken");
  const gameToken = await GameToken.deploy();
  await gameToken.waitForDeployment();
  const gameTokenAddr = await gameToken.getAddress();
  log("GameToken", gameTokenAddr);

  // ── 3. GameStore ──────────────────────────────────────────────────────────
  const GameStore = await ethers.getContractFactory("GameStore");
  const gameStore = await GameStore.deploy(keyCoinAddr, gameTokenAddr);
  await gameStore.waitForDeployment();
  const gameStoreAddr = await gameStore.getAddress();
  log("GameStore", gameStoreAddr);

  // ── 4. ActivationContract ─────────────────────────────────────────────────
  const ActivationContract = await ethers.getContractFactory("ActivationContract");
  const activation = await ActivationContract.deploy(gameTokenAddr);
  await activation.waitForDeployment();
  const activationAddr = await activation.getAddress();
  log("ActivationContract", activationAddr);

  // ── 5. Marketplace ────────────────────────────────────────────────────────
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(
    keyCoinAddr,
    gameTokenAddr,
    activationAddr
  );
  await marketplace.waitForDeployment();
  const marketplaceAddr = await marketplace.getAddress();
  log("Marketplace", marketplaceAddr);

  // ── 6. GamePass ───────────────────────────────────────────────────────────
  const GamePass = await ethers.getContractFactory("GamePass");
  const gamePass = await GamePass.deploy(keyCoinAddr, gameStoreAddr);
  await gamePass.waitForDeployment();
  const gamePassAddr = await gamePass.getAddress();
  log("GamePass", gamePassAddr);

  // ── Post-deploy wiring ────────────────────────────────────────────────────
  console.log("\n🔧  Wiring roles…");

  // Grant GameStore MINTER_ROLE on GameToken so it can mint license NFTs
  const MINTER_ROLE = await (gameToken as any).MINTER_ROLE();
  const wireTx = await (gameToken as any).grantRole(MINTER_ROLE, gameStoreAddr);
  await wireTx.wait();
  console.log(`✅  MINTER_ROLE → GameStore`);

  // TODO (optional, recommended for mainnet):
  //   const ADMIN_ROLE = await gameToken.DEFAULT_ADMIN_ROLE();
  //   await gameToken.grantRole(ADMIN_ROLE, MULTISIG_ADDRESS);
  //   await gameStore.grantRole(ADMIN_ROLE, MULTISIG_ADDRESS);
  //   await gameToken.revokeRole(ADMIN_ROLE, deployer.address);
  //   await gameStore.revokeRole(ADMIN_ROLE, deployer.address);

  // ── Save results ──────────────────────────────────────────────────────────
  const addresses = {
    KeyCoin:            keyCoinAddr,
    GameToken:          gameTokenAddr,
    GameStore:          gameStoreAddr,
    ActivationContract: activationAddr,
    Marketplace:        marketplaceAddr,
    GamePass:           gamePassAddr,
  };

  await saveAddresses(network, addresses);

  // ── Print .env.local snippet ───────────────────────────────────────────────
  console.log("\n📋  Copy into frontend/.env.local:\n");
  console.log(`NEXT_PUBLIC_KEYCOIN_ADDRESS=${keyCoinAddr}`);
  console.log(`NEXT_PUBLIC_GAMETOKEN_ADDRESS=${gameTokenAddr}`);
  console.log(`NEXT_PUBLIC_GAMESTORE_ADDRESS=${gameStoreAddr}`);
  console.log(`NEXT_PUBLIC_ACTIVATION_ADDRESS=${activationAddr}`);
  console.log(`NEXT_PUBLIC_MARKETPLACE_ADDRESS=${marketplaceAddr}`);
  console.log(`NEXT_PUBLIC_GAMEPASS_ADDRESS=${gamePassAddr}`);
  console.log();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
