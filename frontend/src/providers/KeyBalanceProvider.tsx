"use client";

// Single source of truth for the connected wallet's KEY balance and the on-chain
// ETH→KEY rate. Living in one context (rather than per-hook state) means the
// navbar chip, Member Card, and buy modals all see the same number, and it
// refreshes after any write tx — useTx dispatches `keychain:tx` on success.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useContract } from "@/hooks/useContract";
import { useWallet } from "@/providers/WalletProvider";

interface KeyBalanceValue {
  balance: bigint;
  rate: bigint; // KEY base-units minted per wei of ETH
  refetch: () => Promise<void>;
}

const KeyBalanceContext = createContext<KeyBalanceValue | null>(null);

export function KeyBalanceProvider({ children }: { children: React.ReactNode }) {
  const keyCoin = useContract("KeyCoin");
  const { address } = useWallet();
  const [balance, setBalance] = useState<bigint>(BigInt(0));
  const [rate, setRate] = useState<bigint>(BigInt(0));

  const refetch = useCallback(async () => {
    if (!keyCoin || !address) {
      setBalance(BigInt(0));
      return;
    }
    setBalance(await keyCoin.balanceOf(address));
  }, [keyCoin, address]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (!keyCoin) return;
    keyCoin.rate().then(setRate).catch(() => {});
  }, [keyCoin]);

  // Any write may move KEY (buy KEY, buy game, subscribe, resale); refresh when
  // one completes anywhere in the app.
  useEffect(() => {
    const onTx = () => void refetch();
    window.addEventListener("keychain:tx", onTx);
    return () => window.removeEventListener("keychain:tx", onTx);
  }, [refetch]);

  return (
    <KeyBalanceContext.Provider value={{ balance, rate, refetch }}>
      {children}
    </KeyBalanceContext.Provider>
  );
}

export function useKeyBalance(): KeyBalanceValue {
  const ctx = useContext(KeyBalanceContext);
  if (!ctx) throw new Error("useKeyBalance must be used within a KeyBalanceProvider");
  return ctx;
}
