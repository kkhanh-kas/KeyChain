/**
 * KeyChain constants
 * Chain, roles, and contract references used across the frontend.
 */

// ── Network ──
export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";
export const SEPOLIA_RPC = process.env.NEXT_PUBLIC_ALCHEMY_RPC ?? "";

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

// ── On-chain roles (keccak256 of role strings, from OpenZeppelin AccessControl) ──
// These are computed at deploy time; values here for reference/comparison.
// Usage: contract.hasRole(ROLES.VENDOR, address)
export const ROLES = {
  ADMIN: "0x0000000000000000000000000000000000000000000000000000000000000000", // DEFAULT_ADMIN_ROLE
  VENDOR: "", // keccak256("VENDOR_ROLE") — fill after contract compile
  MINTER: "", // keccak256("MINTER_ROLE") — fill after contract compile
  CUSTOMER: "", // keccak256("CUSTOMER_ROLE") — fill after contract compile
} as const;

// ── Etherscan ──
export const ETHERSCAN_BASE = "https://sepolia.etherscan.io";
export const txUrl = (hash: string) => `${ETHERSCAN_BASE}/tx/${hash}`;
export const addressUrl = (addr: string) => `${ETHERSCAN_BASE}/address/${addr}`;
