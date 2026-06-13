import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { ToastProvider } from "@/providers/ToastProvider";
import { WalletProvider } from "@/providers/WalletProvider";

const { expiryOfMock } = vi.hoisted(() => ({ expiryOfMock: vi.fn() }));

vi.mock("@/hooks/useContract", () => ({
  useContract: () => ({ expiryOf: expiryOfMock, subscribe: vi.fn() }),
}));

import { useGamePass } from "@/hooks/useGamePass";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <WalletProvider>
    <ToastProvider>{children}</ToastProvider>
  </WalletProvider>
);

describe("useGamePass.isSubscribed", () => {
  it("is true when the expiry is in the future", async () => {
    const future = BigInt(Math.floor(Date.now() / 1000) + 86_400);
    expiryOfMock.mockResolvedValue(future);

    const { result } = renderHook(() => useGamePass(), { wrapper });
    await expect(result.current.isSubscribed("0xabc", 1)).resolves.toBe(true);
  });

  it("is false when the pass has never been bought (expiry 0)", async () => {
    expiryOfMock.mockResolvedValue(BigInt(0));

    const { result } = renderHook(() => useGamePass(), { wrapper });
    await expect(result.current.isSubscribed("0xabc", 1)).resolves.toBe(false);
  });
});
