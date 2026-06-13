import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/providers/ToastProvider";
import { WalletProvider } from "@/providers/WalletProvider";

const { getCatalogMock } = vi.hoisted(() => ({ getCatalogMock: vi.fn() }));

vi.mock("@/hooks/useContract", () => ({
  useContract: () => ({
    getCatalog: getCatalogMock,
    purchaseLicense: vi.fn(),
    registerGame: vi.fn(),
  }),
}));

import { useGameStore } from "@/hooks/useGameStore";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <WalletProvider>
    <ToastProvider>{children}</ToastProvider>
  </WalletProvider>
);

describe("useGameStore catalog mapping", () => {
  it("maps the on-chain tuple into Game objects", async () => {
    getCatalogMock.mockResolvedValue([
      [BigInt(1), BigInt(2)],
      [
        { name: "Game A", price: BigInt(50), isListed: true, vendorAddress: "0xV1" },
        { name: "Game B", price: BigInt(75), isListed: false, vendorAddress: "0xV2" },
      ],
    ]);

    const { result } = renderHook(() => useGameStore(), { wrapper });

    await waitFor(() => expect(result.current.games).toHaveLength(2));
    expect(result.current.games[0]).toEqual({
      id: 1,
      name: "Game A",
      price: BigInt(50),
      isListed: true,
      vendor: "0xV1",
    });
    expect(result.current.games[1].isListed).toBe(false);
  });
});
