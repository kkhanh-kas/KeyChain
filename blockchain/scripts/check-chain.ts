// Read-only: is the Sepolia chain actually producing blocks? Prints the latest
// block number and how many seconds ago it was mined. A large age means the
// network is stalled and nothing (any gas) will mine until it recovers.

import { ethers } from "hardhat";

async function main() {
  const provider = ethers.provider;
  const block = await provider.getBlock("latest");
  if (!block) throw new Error("no latest block");
  const ageSec = Math.floor(Date.now() / 1000) - block.timestamp;
  console.log(`latest block   #${block.number}`);
  console.log(`mined          ${ageSec}s ago`);
  console.log(`txs in block   ${block.transactions.length}`);
  console.log(
    ageSec > 60
      ? `\n>>> Chain looks STALLED (last block ${ageSec}s ago). Wait for recovery.`
      : `\n>>> Chain is producing blocks normally.`
  );
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
