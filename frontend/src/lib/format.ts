/**
 * Display formatting utilities
 */

import { parseUnits } from "ethers";

/** Parse a KEY amount string (e.g. "300") into base-unit wei (18 decimals). */
export function parseKey(amount: string, decimals = 18): bigint {
  return parseUnits(amount || "0", decimals);
}

/** Truncate an Ethereum address: 0x1234...5678 */
export function truncateAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

/** Format KEY token balance with locale-aware separators */
export function formatKey(amount: bigint | number, decimals = 18): string {
  const value =
    typeof amount === "bigint"
      ? Number(amount) / 10 ** decimals
      : amount;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/** Format a transaction hash for display */
export function truncateHash(hash: string): string {
  if (!hash) return "";
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

/** Format ISO date string to readable format */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
