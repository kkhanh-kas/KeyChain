import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    sepolia: {
      // Alchemy RPC was returning inconsistent mempool state and not propagating
      // txs; using a public endpoint for reliable broadcast. To revert, swap back
      // to: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
      url: "https://ethereum-sepolia-rpc.publicnode.com",
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
      // Force a high legacy gas price so deploy txs don't sit pending on a busy
      // testnet, and so re-running replaces any stuck (underpriced) tx at the
      // same nonce. Sepolia ETH is free, so over-paying gas is harmless.
      gasPrice: 50_000_000_000, // 50 gwei
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
  },
};

export default config;
