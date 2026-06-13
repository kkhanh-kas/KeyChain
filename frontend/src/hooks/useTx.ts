"use client";

// Shared write-transaction wrapper: send, wait for the receipt, and surface a
// success/error toast. Used by every write hook so they stay uniform.

import { useCallback, useState } from "react";
import type { ContractTransactionResponse } from "ethers";
import { useToast } from "@/providers/ToastProvider";

export function useTx() {
  const { push } = useToast();
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async (title: string, send: () => Promise<ContractTransactionResponse>) => {
      setPending(true);
      try {
        const tx = await send();
        const receipt = await tx.wait();
        push({ type: "success", title, hash: tx.hash });
        return receipt;
      } catch (err) {
        push({ type: "error", title: `${title} failed`, msg: (err as Error).message });
        throw err;
      } finally {
        setPending(false);
      }
    },
    [push]
  );

  return { run, pending };
}
