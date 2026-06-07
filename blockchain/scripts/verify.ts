/**
 * KeyChain - verify.ts
 * ====================
 * Tasks:
 *   1. Read the 6 contract addresses from deployments/<network>.json
 *   2. Call hardhat verify for each contract with the correct constructor args
 *   3. Skip contracts already verified (idempotent)
 *   4. Print the Etherscan link for each contract after a successful verify
 *
 * Requirements:
 *   - deploy.ts has run -> deployments/sepolia.json exists
 *   - ETHERSCAN_API_KEY is set in .env
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

// --- Helpers ---

/** Read deployment addresses from the JSON file produced by deploy.ts. */
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

/** Etherscan link for a given network. */
function explorerUrl(network: string, address: string): string {
  if (network === "sepolia") {
    return `https://sepolia.etherscan.io/address/${address}#code`;
  }
  return `https://etherscan.io/address/${address}#code`;
}

/**
 * Verify a single contract. If it is already verified, skip it without
 * throwing so the remaining contracts still get verified.
 */
async function verifyContract(
  name: string,
  address: string,
  constructorArguments: unknown[],
  network: string
) {
  process.stdout.write(`  ${name.padEnd(22)}`);

  try {
    await run("verify:verify", {
      address,
      constructorArguments,
    });
    console.log(`OK  ${explorerUrl(network, address)}`);
  } catch (err: any) {
    // Etherscan returns this error if the contract was already verified
    if (
      err?.message?.toLowerCase().includes("already verified") ||
      err?.message?.toLowerCase().includes("already been verified")
    ) {
      console.log(`Already verified  ->  ${explorerUrl(network, address)}`);
    } else {
      // Real error - print it but do not stop the script
      console.log(`FAILED`);
      console.error(`      ${err?.message ?? err}`);
    }
  }
}

// --- Main ---

async function main() {
  // Check ETHERSCAN_API_KEY
  if (!process.env.ETHERSCAN_API_KEY) {
    throw new Error(
      "ETHERSCAN_API_KEY is not set in .env\n" +
        "Get a key at: https://etherscan.io/myapikey"
    );
  }

  // Get the network from the Hardhat runtime
  const { ethers } = await import("hardhat");
  const network = hre.network.name;

  console.log(`KeyChain verify  |  network: ${network}`);

  // Read deployment addresses
  const deployment = loadDeployment(network);

  const {
    KeyCoin,
    GameToken,
    GameStore,
    ActivationContract,
    Marketplace,
    GamePass,
  } = deployment;

  // Check that all addresses are present
  const required = ["KeyCoin", "GameToken", "GameStore", "ActivationContract", "Marketplace", "GamePass"];
  for (const name of required) {
    if (!deployment[name]) {
      throw new Error(`Missing ${name} address in deployment file.`);
    }
  }

  // KEYCOIN_RATE must match the value used at deploy time.
  // If you changed it in deploy.ts, change it here too.
  const KEYCOIN_RATE = ethers.parseUnits("1000", 18);

  console.log(`\nVerifying 6 contracts on ${network}...\n`);

  // 1. KeyCoin
  // constructor(uint256 initialRate)
  await verifyContract("KeyCoin", KeyCoin, [KEYCOIN_RATE], network);

  // 2. GameToken
  // constructor()  - no args
  await verifyContract("GameToken", GameToken, [], network);

  // 3. GameStore
  // constructor(address keyCoin_, address gameToken_)
  await verifyContract("GameStore", GameStore, [KeyCoin, GameToken], network);

  // 4. ActivationContract
  // constructor(address gameToken_)
  await verifyContract("ActivationContract", ActivationContract, [GameToken], network);

  // 5. Marketplace
  // constructor(address keyCoin_, address gameToken_, address activation_)
  await verifyContract(
    "Marketplace",
    Marketplace,
    [KeyCoin, GameToken, ActivationContract],
    network
  );

  // 6. GamePass
  // constructor(address keyCoin_, address gameStore_)
  await verifyContract("GamePass", GamePass, [KeyCoin, GameStore], network);

  // Summary
  console.log("\nAll contracts on Etherscan:\n");
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
