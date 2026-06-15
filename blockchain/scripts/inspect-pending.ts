// Read-only: fetch the pending block and print our deployer's pending txs with
// their gas pricing, so we can see WHY they are not being mined.

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const provider = ethers.provider;
  const me = deployer.address.toLowerCase();

  const block: any = await provider.send("eth_getBlockByNumber", ["pending", true]);
  const txs = (block?.transactions ?? []).filter(
    (t: any) => (t.from ?? "").toLowerCase() === me
  );

  const fee = await provider.getFeeData();
  console.log(`market gasPrice  ${ethers.formatUnits(fee.gasPrice ?? 0n, "gwei")} gwei`);
  console.log(`market baseFee   ${fee.maxFeePerGas ? "(eip1559)" : "(legacy)"}`);
  console.log(`our pending txs in pending block: ${txs.length}\n`);

  for (const t of txs) {
    const nonce = parseInt(t.nonce, 16);
    const gp = t.gasPrice ? ethers.formatUnits(BigInt(t.gasPrice), "gwei") : null;
    const mfpg = t.maxFeePerGas ? ethers.formatUnits(BigInt(t.maxFeePerGas), "gwei") : null;
    const mpfpg = t.maxPriorityFeePerGas
      ? ethers.formatUnits(BigInt(t.maxPriorityFeePerGas), "gwei")
      : null;
    console.log(`nonce ${nonce}  hash ${t.hash}`);
    console.log(`   gasPrice=${gp ?? "-"}  maxFee=${mfpg ?? "-"}  maxPriority=${mpfpg ?? "-"} gwei`);
  }

  if (txs.length === 0) {
    console.log("(none found in pending block — provider may not expose them)");
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
