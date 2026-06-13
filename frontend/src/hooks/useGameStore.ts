"use client";

// GameStore primary market: read the catalog, buy a license, and (vendor only)
// register a new game. purchaseLicense pulls KEY via transferFrom, so the buyer
// must approve GameStore for `price` first (see useKeyCoin.approve).

import { useCallback, useEffect, useState } from "react";
import { useContract } from "@/hooks/useContract";
import { useTx } from "@/hooks/useTx";

export interface Game {
  id: number;
  name: string;
  price: bigint;
  isListed: boolean;
  vendor: string;
}

export function useGameStore() {
  const store = useContract("GameStore");
  const { run, pending } = useTx();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!store) return;
    setLoading(true);
    setError(null);
    try {
      const [ids, infos] = await store.getCatalog();
      setGames(
        ids.map((id: bigint, i: number) => ({
          id: Number(id),
          name: infos[i].name,
          price: infos[i].price as bigint,
          isListed: infos[i].isListed,
          vendor: infos[i].vendorAddress,
        }))
      );
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [store]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const purchaseLicense = useCallback(
    async (gameId: number) => {
      if (!store) throw new Error("GameStore contract unavailable");
      return run("License purchased", () => store.purchaseLicense(gameId));
    },
    [store, run]
  );

  const registerGame = useCallback(
    async (name: string, price: bigint, royaltyBps: number, uri: string) => {
      if (!store) throw new Error("GameStore contract unavailable");
      const receipt = await run("Game registered", () =>
        store.registerGame(name, price, royaltyBps, uri)
      );
      await refetch();
      return receipt;
    },
    [store, run, refetch]
  );

  return { games, loading, error, refetch, purchaseLicense, registerGame, pending };
}
