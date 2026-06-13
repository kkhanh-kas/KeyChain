"use client";

// ActivationContract: bind a held license to this device (machineHash derived
// client-side) and release it so it can be resold. isActive blocks listing.

import { useCallback } from "react";
import { useContract } from "@/hooks/useContract";
import { useTx } from "@/hooks/useTx";
import { generateMachineHash } from "@/lib/machineHash";

export function useActivation() {
  const activation = useContract("ActivationContract");
  const { run, pending } = useTx();

  const activate = useCallback(
    async (tokenId: number) => {
      if (!activation) throw new Error("ActivationContract unavailable");
      const machineHash = await generateMachineHash();
      return run("License activated", () =>
        activation.activateLicense(tokenId, machineHash)
      );
    },
    [activation, run]
  );

  const deactivate = useCallback(
    async (tokenId: number) => {
      if (!activation) throw new Error("ActivationContract unavailable");
      return run("License deactivated", () =>
        activation.deactivateLicense(tokenId)
      );
    },
    [activation, run]
  );

  const isActive = useCallback(
    async (owner: string, tokenId: number): Promise<boolean> => {
      if (!activation) return false;
      return activation.isActive(owner, tokenId);
    },
    [activation]
  );

  return { activate, deactivate, isActive, pending };
}
