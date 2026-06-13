// Chain, roles, and contract references used across the frontend.

import { id } from "ethers";

// ── Network ──
export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";
export const SEPOLIA_RPC = process.env.NEXT_PUBLIC_ALCHEMY_RPC ?? "";

// Chain the wallet must be on. Defaults to Sepolia; set NEXT_PUBLIC_CHAIN_ID
// to 31337 for local Hardhat dev.
export const TARGET_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_CHAIN_ID ?? SEPOLIA_CHAIN_ID
);

// ── Contract names (must match ABI filenames in src/abi/) ──
export const CONTRACT_NAMES = [
  "KeyCoin",
  "GameToken",
  "GameStore",
  "ActivationContract",
  "Marketplace",
  "GamePass",
] as const;

export type ContractName = (typeof CONTRACT_NAMES)[number];

// On-chain roles (OpenZeppelin AccessControl). Only VENDOR and MINTER are
// enforced on-chain; there is no customer role — any wallet without a role can
// buy, activate, and resell. Usage: contract.hasRole(ROLES.VENDOR, address).
export const ROLES = {
  ADMIN: "0x0000000000000000000000000000000000000000000000000000000000000000", // DEFAULT_ADMIN_ROLE
  VENDOR: id("VENDOR_ROLE"),
  MINTER: id("MINTER_ROLE"),
} as const;

// ── Etherscan ──
export const ETHERSCAN_BASE = "https://sepolia.etherscan.io";
export const txUrl = (hash: string) => `${ETHERSCAN_BASE}/tx/${hash}`;
export const addressUrl = (addr: string) => `${ETHERSCAN_BASE}/address/${addr}`;
