/**
 * KeyChain - setup-roles.ts
 * =========================
 * Tasks:
 *   1. Read deployed contract addresses from deployments/<network>.json
 *   2. Grant VENDOR_ROLE on GameStore to a list of vendors
 *   3. (Optional) Grant DEFAULT_ADMIN_ROLE to a multisig, revoke deployer
 *   4. Print a confirmation table of roles after setup
 *
 * Usage:
 *   npx hardhat run scripts/setup-roles.ts --network sepolia
 *   npx hardhat run scripts/setup-roles.ts --network hardhat
 *
 * Configuration:
 *   Edit VENDORS and MULTISIG_ADDRESS below before running.
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import hre from "hardhat";

// --- Configuration - edit before running ---

/**
 * Addresses to be granted VENDOR_ROLE.
 * A vendor can: registerGame(), setGameListed() for their own games.
 */
const VENDORS: string[] = [
  // "0xVendorAddress1...",
  // "0xVendorAddress2...",
];

/**
 * Multisig (Gnosis Safe) address that receives DEFAULT_ADMIN_ROLE.
 * Leave empty ("") if the admin handoff is not needed yet (testnet).
 * REQUIRED before a mainnet deploy.
 */
const MULTISIG_ADDRESS = "";

/**
 * If true: after granting admin to the multisig, revoke the deployer's admin.
 * Only enable once MULTISIG_ADDRESS has been confirmed correct.
 */
const REVOKE_DEPLOYER_ADMIN = false;

// --- Helpers ---

/** Read deployed addresses from the JSON file produced by deploy.ts. */
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

function log(msg: string) {
  console.log(msg);
}

// --- Main ---

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = hre.network.name;

  console.log(`setup-roles  |  network: ${network}`);
  console.log(`Deployer     |  ${deployer.address}`);

  // Load deployment addresses
  const deployment = loadDeployment(network);
  const gameStoreAddr = deployment.GameStore;

  if (!gameStoreAddr) {
    throw new Error("GameStore address not found in deployment file.");
  }

  // Attach to GameStore
  const GameStore = await ethers.getContractFactory("GameStore");
  const gameStore = GameStore.attach(gameStoreAddr) as any;

  const VENDOR_ROLE = await gameStore.VENDOR_ROLE();
  const ADMIN_ROLE = await gameStore.DEFAULT_ADMIN_ROLE();

  log(`\nGameStore  -> ${gameStoreAddr}`);
  log(`    VENDOR_ROLE = ${VENDOR_ROLE}`);
  log(`    ADMIN_ROLE  = ${ADMIN_ROLE}`);

  // Grant VENDOR_ROLE
  if (VENDORS.length === 0) {
    log("\nVENDORS list is empty - edit the VENDORS array in this file and re-run.");
  } else {
    log(`\nGranting VENDOR_ROLE to ${VENDORS.length} address(es)...`);
    for (const vendor of VENDORS) {
      const already = await gameStore.hasRole(VENDOR_ROLE, vendor);
      if (already) {
        log(`  skip ${vendor}  (already has VENDOR_ROLE)`);
        continue;
      }
      const tx = await gameStore.grantRole(VENDOR_ROLE, vendor);
      await tx.wait();
      log(`  ${vendor}  -> VENDOR_ROLE granted`);
    }
  }

  // (Optional) Hand off admin to the multisig
  if (MULTISIG_ADDRESS) {
    log(`\nTransferring DEFAULT_ADMIN_ROLE -> ${MULTISIG_ADDRESS}...`);

    // Grant on GameStore
    const tx1 = await gameStore.grantRole(ADMIN_ROLE, MULTISIG_ADDRESS);
    await tx1.wait();
    log(`  GameStore ADMIN_ROLE -> multisig`);

    // Do the same for GameToken if needed
    // const GameToken = await ethers.getContractFactory("GameToken");
    // const gameToken = GameToken.attach(deployment.GameToken) as any;
    // const tx2 = await gameToken.grantRole(ADMIN_ROLE, MULTISIG_ADDRESS);
    // await tx2.wait();
    // log(`  GameToken ADMIN_ROLE -> multisig`);

    if (REVOKE_DEPLOYER_ADMIN) {
      log(`\nRevoking deployer ADMIN_ROLE...`);
      const tx3 = await gameStore.revokeRole(ADMIN_ROLE, deployer.address);
      await tx3.wait();
      log(`  Deployer ADMIN_ROLE revoked - deployer no longer admin`);
    }
  }

  // Final state check
  log("\nRole status:\n");
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

  log("\nsetup-roles done.\n");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
