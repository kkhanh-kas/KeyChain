"use client";

// True when the connected wallet holds VENDOR_ROLE on GameStore. Used to gate
// the Vendor tab in the navbar — the same on-chain RBAC that guards
// registerGame() also drives what the UI offers.

import { useEffect, useState } from "react";
import { useContract } from "@/hooks/useContract";
import { useWallet } from "@/providers/WalletProvider";

export function useIsVendor(): boolean {
  const store = useContract("GameStore");
  const { address } = useWallet();
  const [isVendor, setIsVendor] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!store || !address) {
      setIsVendor(false);
      return;
    }
    void (async () => {
      try {
        const role = await store.VENDOR_ROLE();
        const has = await store.hasRole(role, address);
        if (!cancelled) setIsVendor(has);
      } catch {
        if (!cancelled) setIsVendor(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [store, address]);

  return isVendor;
}
