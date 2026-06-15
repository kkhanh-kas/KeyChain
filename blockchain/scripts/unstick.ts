// Clears ALL stuck pending transactions by replacing each stuck nonce (from
// latest up to pending) with a 0-ETH self-transfer at a high gas price. Forces a
// fresh broadcast so the nonce advances and deploy can proceed. Escalates gas if
// a replacement is rejected as underpriced.

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const provider = ethers.provider;

  const latest = await provider.getTransactionCount(deployer.address, "latest");
  const pending = await provider.getTransactionCount(deployer.address, "pending");

  if (pending <= latest) {
    console.log("No stuck tx — nothing to do.");
    return;
  }

  console.log(`Clearing ${pending - latest} stuck tx (nonce ${latest}..${pending - 1})...`);

  for (let nonce = latest; nonce < pending; nonce++) {
    let gasPrice = 80_000_000_000n; // 80 gwei, above the 50 gwei stuck txs
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const tx = await deployer.sendTransaction({
          to: deployer.address,
          value: 0,
          nonce,
          gasPrice,
        });
        console.log(`  nonce ${nonce}: sent ${tx.hash} @ ${ethers.formatUnits(gasPrice, "gwei")} gwei`);
        await tx.wait();
        console.log(`  nonce ${nonce}: confirmed`);
        break;
      } catch (e: any) {
        if (/underpriced|replacement/i.test(e?.message ?? "")) {
          gasPrice = (gasPrice * 3n) / 2n; // +50% and retry
          console.log(`  nonce ${nonce}: underpriced, bumping to ${ethers.formatUnits(gasPrice, "gwei")} gwei`);
          continue;
        }
        throw e;
      }
    }
  }

  console.log("Done. Run check-nonce to confirm CLEAN, then npm run deploy:sepolia.");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
