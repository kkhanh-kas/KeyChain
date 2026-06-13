"use client";

// GamePass subscriptions. A single subscribe(gameId, months) covers first-time,
// early renewal, and lapsed renewal (see ADR-0002). subscribe pulls KEY, so the
// caller must approve KEY for monthlyPrice * months first.

import { useCallback } from "react";
import { useContract } from "@/hooks/useContract";
import { useTx } from "@/hooks/useTx";

export function useGamePass() {
  const gamePass = useContract("GamePass");
  const { run, pending } = useTx();

  const subscribe = useCallback(
    async (gameId: number, months: number) => {
      if (!gamePass) throw new Error("GamePass contract unavailable");
      return run("Subscribed", () => gamePass.subscribe(gameId, months));
    },
    [gamePass, run]
  );

  // Unix-seconds expiry timestamp; 0 means never subscribed.
  const expiryOf = useCallback(
    async (subscriber: string, gameId: number): Promise<bigint> => {
      if (!gamePass) return BigInt(0);
      return gamePass.expiryOf(subscriber, gameId);
    },
    [gamePass]
  );

  const isSubscribed = useCallback(
    async (subscriber: string, gameId: number): Promise<boolean> => {
      const expiry = await expiryOf(subscriber, gameId);
      return expiry > BigInt(Math.floor(Date.now() / 1000));
    },
    [expiryOf]
  );

  return { subscribe, expiryOf, isSubscribed, pending };
}
