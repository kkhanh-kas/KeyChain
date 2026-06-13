"use client";

// Marketplace secondary market: read open listings, list a license, buy, or
// cancel. Listing escrows the ERC-1155 unit, so the seller must
// setApprovalForAll(Marketplace) on GameToken first; buying pulls KEY, so the
// buyer must approve KEY for `price` first (see useKeyCoin.approve).

import { useCallback, useEffect, useState } from "react";
import { useContract } from "@/hooks/useContract";
import { useWallet } from "@/providers/WalletProvider";
import { useTx } from "@/hooks/useTx";

export interface Listing {
  listingId: number;
  tokenId: number;
  seller: string;
  price: bigint;
}

export function useMarketplace() {
  const marketplace = useContract("Marketplace");
  const keyCoin = useContract("KeyCoin");
  const gameToken = useContract("GameToken");
  const { address } = useWallet();
  const { run, pending } = useTx();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!marketplace) return;
    setLoading(true);
    setError(null);
    try {
      const [ids, raw] = await marketplace.getOpenListings();
      setListings(
        ids.map((id: bigint, i: number) => ({
          listingId: Number(id),
          tokenId: Number(raw[i].tokenId),
          seller: raw[i].seller,
          price: raw[i].price as bigint,
        }))
      );
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [marketplace]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  // Listing escrows the ERC-1155 unit, so approve Marketplace as operator first.
  const listLicense = useCallback(
    async (tokenId: number, price: bigint) => {
      if (!marketplace || !gameToken || !address) throw new Error("Wallet not connected");
      const operator = await marketplace.getAddress();
      if (!(await gameToken.isApprovedForAll(address, operator))) {
        await run("Approved Marketplace", () => gameToken.setApprovalForAll(operator, true));
      }
      const receipt = await run("License listed", () =>
        marketplace.listLicense(tokenId, price)
      );
      await refetch();
      return receipt;
    },
    [marketplace, gameToken, address, run, refetch]
  );

  // Buying pulls `price` KEY via transferFrom, so approve Marketplace first.
  const buyLicense = useCallback(
    async (listingId: number, price: bigint) => {
      if (!marketplace || !keyCoin || !address) throw new Error("Wallet not connected");
      const spender = await marketplace.getAddress();
      if ((await keyCoin.allowance(address, spender)) < price) {
        await run("Approved KEY", () => keyCoin.approve(spender, price));
      }
      const receipt = await run("License bought", () =>
        marketplace.buyLicense(listingId)
      );
      await refetch();
      return receipt;
    },
    [marketplace, keyCoin, address, run, refetch]
  );

  const cancelListing = useCallback(
    async (listingId: number) => {
      if (!marketplace) throw new Error("Marketplace contract unavailable");
      const receipt = await run("Listing cancelled", () =>
        marketplace.cancelListing(listingId)
      );
      await refetch();
      return receipt;
    },
    [marketplace, run, refetch]
  );

  return { listings, loading, error, refetch, listLicense, buyLicense, cancelListing, pending };
}
