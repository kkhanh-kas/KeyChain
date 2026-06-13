"use client";

// KeyCoin (KEY) ERC-20: read the connected wallet's balance, buy KEY with ETH,
// and approve a spender (e.g. GameStore / Marketplace) before a purchase.

import { useCallback, useEffect, useState } from "react";
import { parseEther } from "ethers";
import { useContract } from "@/hooks/useContract";
import { useWallet } from "@/providers/WalletProvider";
import { useTx } from "@/hooks/useTx";

export function useKeyCoin() {
  const keyCoin = useContract("KeyCoin");
  const { address } = useWallet();
  const { run, pending } = useTx();
  const [balance, setBalance] = useState<bigint>(BigInt(0));

  const refetchBalance = useCallback(async () => {
    if (!keyCoin || !address) {
      setBalance(BigInt(0));
      return;
    }
    setBalance(await keyCoin.balanceOf(address));
  }, [keyCoin, address]);

  useEffect(() => {
    void refetchBalance();
  }, [refetchBalance]);

  // Buy KEY by sending ETH; `ethAmount` is a decimal string e.g. "0.1".
  const buyKeyCoin = useCallback(
    async (ethAmount: string) => {
      if (!keyCoin) throw new Error("KeyCoin contract unavailable");
      const receipt = await run("Bought KEY", () =>
        keyCoin.buyKeyCoin({ value: parseEther(ethAmount) })
      );
      await refetchBalance();
      return receipt;
    },
    [keyCoin, run, refetchBalance]
  );

  const approve = useCallback(
    async (spender: string, amount: bigint) => {
      if (!keyCoin) throw new Error("KeyCoin contract unavailable");
      return run("Approved KEY", () => keyCoin.approve(spender, amount));
    },
    [keyCoin, run]
  );

  return { balance, refetchBalance, buyKeyCoin, approve, pending };
}
