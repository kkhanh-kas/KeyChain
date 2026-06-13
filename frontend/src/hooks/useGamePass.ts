"use client";

// GamePass subscriptions. A single subscribe(gameId, months) covers first-time,
// early renewal, and lapsed renewal (see ADR-0002). subscribe pulls KEY, so the
// caller must approve KEY for monthlyPrice * months first.

import { useCallback } from "react";
import { useContract } from "@/hooks/useContract";
import { useWallet } from "@/providers/WalletProvider";
import { useTx } from "@/hooks/useTx";

export function useGamePass() {
  const gamePass = useContract("GamePass");
  const keyCoin = useContract("KeyCoin");
  const { address } = useWallet();
  const { run, pending } = useTx();

  // Per-month price configured by the vendor; 0 means no pass for this game.
  const monthlyPrice = useCallback(
    async (gameId: number): Promise<bigint> => {
      if (!gamePass) return BigInt(0);
      return gamePass.monthlyPrice(gameId);
    },
    [gamePass]
  );

  // subscribe pulls monthlyPrice * months KEY, so approve GamePass first.
  const subscribe = useCallback(
    async (gameId: number, months: number) => {
      if (!gamePass || !keyCoin || !address) throw new Error("Wallet not connected");
      const total = (await monthlyPrice(gameId)) * BigInt(months);
      const spender = await gamePass.getAddress();
      if ((await keyCoin.allowance(address, spender)) < total) {
        await run("Approved KEY", () => keyCoin.approve(spender, total));
      }
      return run("Subscribed", () => gamePass.subscribe(gameId, months));
    },
    [gamePass, keyCoin, address, monthlyPrice, run]
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

  return { subscribe, monthlyPrice, expiryOf, isSubscribed, pending };
}
