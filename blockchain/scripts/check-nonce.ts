// Read-only diagnostic: shows the deployer balance and whether there is a stuck
// pending transaction (pending nonce > latest nonce means a tx is jammed at the
// next nonce, which makes deploy hang or report "underpriced").

import { ethers } from "hardhat";
import hre from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const provider = ethers.provider;

  const latest = await provider.getTransactionCount(deployer.address, "latest");
  const pending = await provider.getTransactionCount(deployer.address, "pending");
  const balance = await provider.getBalance(deployer.address);
  const fee = await provider.getFeeData();

  console.log(`network        ${hre.network.name}`);
  console.log(`deployer       ${deployer.address}`);
  console.log(`balance        ${ethers.formatEther(balance)} ETH`);
  console.log(`nonce latest   ${latest}   (mined txs)`);
  console.log(`nonce pending  ${pending}   (incl. mempool)`);
  console.log(
    `network gasPrice ${fee.gasPrice ? ethers.formatUnits(fee.gasPrice, "gwei") : "?"} gwei`
  );

  if (pending > latest) {
    console.log(`\n>>> STUCK: ${pending - latest} tx pending at nonce ${latest}. Run unstick.`);
  } else {
    console.log(`\n>>> CLEAN: no stuck tx. Deploy should run.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
