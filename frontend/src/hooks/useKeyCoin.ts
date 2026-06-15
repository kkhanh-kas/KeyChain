"use client";

// KeyCoin (KEY) ERC-20 writes: buy KEY with ETH and approve a spender (e.g.
// GameStore / Marketplace) before a purchase. Balance and rate are read from the
// shared KeyBalanceProvider so every view stays in sync.

import { useCallback } from "react";
import { parseEther } from "ethers";
import { useContract } from "@/hooks/useContract";
import { useTx } from "@/hooks/useTx";
import { useKeyBalance } from "@/providers/KeyBalanceProvider";

export function useKeyCoin() {
  const keyCoin = useContract("KeyCoin");
  const { run, pending } = useTx();
  const { balance, rate, refetch } = useKeyBalance();

  // Buy KEY by sending ETH; `ethAmount` is a decimal string e.g. "0.1".
  const buyKeyCoin = useCallback(
    async (ethAmount: string) => {
      if (!keyCoin) throw new Error("KeyCoin contract unavailable");
      const receipt = await run("Bought KEY", () =>
        keyCoin.buyKeyCoin({ value: parseEther(ethAmount) })
      );
      await refetch();
      return receipt;
    },
    [keyCoin, run, refetch]
  );

  const approve = useCallback(
    async (spender: string, amount: bigint) => {
      if (!keyCoin) throw new Error("KeyCoin contract unavailable");
      return run("Approved KEY", () => keyCoin.approve(spender, amount));
    },
    [keyCoin, run]
  );

  return { balance, rate, refetchBalance: refetch, buyKeyCoin, approve, pending };
}
