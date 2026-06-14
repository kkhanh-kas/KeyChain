"use client";

// GameToken ERC-1155 reads. There is no on-chain "owned licenses" view, so we
// derive ownership by checking the wallet's balance for each catalog tokenId.
// royaltyInfo exposes the ERC-2981 royalty for a given sale price.

import { useCallback, useRef } from "react";
import { useContract } from "@/hooks/useContract";
import { resolveIpfsUrl } from "@/lib/ipfs";
import type { GameMetadata } from "@/lib/ipfs";

export function useGameToken() {
  const gameToken = useContract("GameToken");
  const store = useContract("GameStore");
  // Metadata is immutable per tokenId, so cache it to avoid refetching on rerender.
  const metaCache = useRef<Map<number, GameMetadata | null>>(new Map());

  // Returns the tokenIds the owner holds at least one unit of.
  const getOwnedLicenses = useCallback(
    async (owner: string): Promise<number[]> => {
      if (!gameToken || !store) return [];
      // getCatalog returns a frozen ethers Result; clone to a plain array so
      // ethers can pass it into balanceOfBatch without mutating a read-only array.
      const [idsResult] = await store.getCatalog();
      const ids = Array.from(idsResult as bigint[]);
      if (ids.length === 0) return [];
      const owners = ids.map(() => owner);
      const balances: bigint[] = await gameToken.balanceOfBatch(owners, ids);
      return ids
        .map((id: bigint, i: number) => (balances[i] > BigInt(0) ? Number(id) : -1))
        .filter((id: number) => id >= 0);
    },
    [gameToken, store]
  );

  // ERC-2981 royalty for selling `tokenId` at `salePrice`: [receiver, amount].
  const royaltyInfo = useCallback(
    async (tokenId: number, salePrice: bigint): Promise<[string, bigint]> => {
      if (!gameToken) throw new Error("GameToken contract unavailable");
      const [receiver, amount] = await gameToken.royaltyInfo(tokenId, salePrice);
      return [receiver, amount];
    },
    [gameToken]
  );

  // Off-chain game metadata (title, cover, description) referenced by the
  // on-chain tokenURI. Returns null when the URI is missing or the fetch fails.
  const getMetadata = useCallback(
    async (tokenId: number): Promise<GameMetadata | null> => {
      if (metaCache.current.has(tokenId)) return metaCache.current.get(tokenId)!;
      if (!gameToken) return null;
      let meta: GameMetadata | null = null;
      try {
        const url = resolveIpfsUrl(await gameToken.uri(tokenId));
        if (url) meta = (await (await fetch(url)).json()) as GameMetadata;
      } catch {
        meta = null;
      }
      metaCache.current.set(tokenId, meta);
      return meta;
    },
    [gameToken]
  );

  return { getOwnedLicenses, royaltyInfo, getMetadata };
}
