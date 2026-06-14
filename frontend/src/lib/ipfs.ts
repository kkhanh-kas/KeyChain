// Resolves IPFS URIs (ipfs://Qm...) to HTTP gateway URLs for display. Game
// metadata (title, description, cover image) lives on IPFS and is referenced by
// GameToken's tokenURI. The CID reference is on-chain; the content and gateway
// resolution are off-chain (client).

// Prefer the account's dedicated Pinata gateway (more reliable, no shared
// rate-limit); fall back to the public gateway if it isn't configured.
const IPFS_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY
  ? `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/`
  : "https://gateway.pinata.cloud/ipfs/";

// Convert an IPFS URI to an HTTP gateway URL. Handles both the ipfs:// prefix
// and a raw CID.
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

// Expected shape of game metadata stored on IPFS, matching what the Vendor
// uploads when registering a game.
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
