"use client";

// GameToken ERC-1155 reads. There is no on-chain "owned licenses" view, so we
// derive ownership by checking the wallet's balance for each catalog tokenId.
// royaltyInfo exposes the ERC-2981 royalty for a given sale price.

import { useCallback } from "react";
import { useContract } from "@/hooks/useContract";

export function useGameToken() {
  const gameToken = useContract("GameToken");
  const store = useContract("GameStore");

  // Returns the tokenIds the owner holds at least one unit of.
  const getOwnedLicenses = useCallback(
    async (owner: string): Promise<number[]> => {
      if (!gameToken || !store) return [];
      const [ids] = await store.getCatalog();
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

  return { getOwnedLicenses, royaltyInfo };
}
