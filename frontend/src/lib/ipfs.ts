/**
 * IPFS Utilities
 *
 * Resolves IPFS URIs (ipfs://Qm...) to HTTP gateway URLs for display.
 * Game metadata (title, description, cover image) is stored on IPFS
 * and referenced by GameToken's tokenURI.
 *
 * On-chain / Off-chain boundary:
 *   - IPFS CID reference: ON-CHAIN (stored in GameToken URI)
 *   - Actual metadata content: OFF-CHAIN (IPFS)
 *   - Gateway resolution: OFF-CHAIN (client)
 */

const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

/**
 * Convert an IPFS URI to an HTTP gateway URL.
 * Handles both ipfs:// prefix and raw CID.
 */
export function resolveIpfsUrl(uri: string): string {
  if (!uri) return "";
  if (uri.startsWith("ipfs://")) {
    return IPFS_GATEWAY + uri.slice(7);
  }
  if (uri.startsWith("Qm") || uri.startsWith("bafy")) {
    return IPFS_GATEWAY + uri;
  }
  // Already an HTTP URL
  return uri;
}

/**
 * Expected shape of game metadata stored on IPFS.
 * This matches what the Vendor uploads when registering a game.
 */
export interface GameMetadata {
  name: string;
  description: string;
  image: string; // IPFS URI to cover art
  attributes: {
    genre: string;
    vendor: string;
    royaltyBps: number;
  };
}
