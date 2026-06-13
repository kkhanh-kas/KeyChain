"use client";

// Builds an ethers.Contract for a deployed contract, bound to the connected
// signer when available (so writes work) or the read-only provider otherwise.
// Returns null until a wallet provider is available or if the address is unset.

import { useMemo } from "react";
import { Contract, type InterfaceAbi } from "ethers";
import { useWallet } from "@/providers/WalletProvider";
import { getContractConfig } from "@/lib/contracts";
import type { ContractName } from "@/lib/constants";

export function useContract(name: ContractName): Contract | null {
  const { signer, provider } = useWallet();
  return useMemo(() => {
    const runner = signer ?? provider;
    if (!runner) return null;
    try {
      const { abi, address } = getContractConfig(name);
      return new Contract(address, abi as InterfaceAbi, runner);
    } catch (err) {
      // Address not configured yet (contract not deployed / env missing).
      console.warn(`[useContract] ${name} unavailable`, err);
      return null;
    }
  }, [name, signer, provider]);
}
