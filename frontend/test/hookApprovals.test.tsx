import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ToastProvider } from "@/providers/ToastProvider";

// These tests cover the bug-prone bit of the write hooks: deciding whether an
// approval is needed before the real call. Wallet and contracts are mocked so
// we can assert the approve/setApprovalForAll calls precisely.

const m = vi.hoisted(() => ({
  // KeyCoin
  allowance: vi.fn(),
  approve: vi.fn(),
  // GameStore
  purchaseLicense: vi.fn(),
  getCatalog: vi.fn(),
  // GameToken
  isApprovedForAll: vi.fn(),
  setApprovalForAll: vi.fn(),
  // Marketplace
  listLicense: vi.fn(),
  getOpenListings: vi.fn(),
  // GamePass
  monthlyPrice: vi.fn(),
  subscribe: vi.fn(),
}));

const tx = () => Promise.resolve({ hash: "0xhash", wait: () => Promise.resolve({}) });

vi.mock("@/providers/WalletProvider", () => ({
  useWallet: () => ({ address: "0xMe" }),
}));

// Stable contract objects so the hooks' useEffect deps don't change every
// render (a fresh object per call would loop the catalog refetch forever).
vi.mock("@/hooks/useContract", () => {
  const contracts: Record<string, unknown> = {
    KeyCoin: { allowance: m.allowance, approve: m.approve },
    GameStore: { getAddress: () => Promise.resolve("0xStore"), purchaseLicense: m.purchaseLicense, getCatalog: m.getCatalog },
    GameToken: { isApprovedForAll: m.isApprovedForAll, setApprovalForAll: m.setApprovalForAll },
    Marketplace: { getAddress: () => Promise.resolve("0xMkt"), listLicense: m.listLicense, getOpenListings: m.getOpenListings },
    GamePass: { getAddress: () => Promise.resolve("0xPass"), monthlyPrice: m.monthlyPrice, subscribe: m.subscribe },
  };
  return { useContract: (name: string) => contracts[name] ?? {} };
});

import { useGameStore } from "@/hooks/useGameStore";
import { useMarketplace } from "@/hooks/useMarketplace";
import { useGamePass } from "@/hooks/useGamePass";

const wrapper = ({ children }: { children: React.ReactNode }) => <ToastProvider>{children}</ToastProvider>;

beforeEach(() => {
  Object.values(m).forEach((fn) => fn.mockReset());
  m.getCatalog.mockResolvedValue([[], []]);
  m.getOpenListings.mockResolvedValue([[], []]);
  m.approve.mockImplementation(tx);
  m.purchaseLicense.mockImplementation(tx);
  m.setApprovalForAll.mockImplementation(tx);
  m.listLicense.mockImplementation(tx);
  m.subscribe.mockImplementation(tx);
});

describe("useGameStore.purchaseLicense approval", () => {
  it("approves KEY for the price when the allowance is short", async () => {
    m.allowance.mockResolvedValue(BigInt(0));
    const { result } = renderHook(() => useGameStore(), { wrapper });

    await act(async () => { await result.current.purchaseLicense(1, BigInt(100)); });

    expect(m.approve).toHaveBeenCalledWith("0xStore", BigInt(100));
    expect(m.purchaseLicense).toHaveBeenCalledWith(1);
  });

  it("skips the approval when the allowance already covers the price", async () => {
    m.allowance.mockResolvedValue(BigInt(1000));
    const { result } = renderHook(() => useGameStore(), { wrapper });

    await act(async () => { await result.current.purchaseLicense(1, BigInt(100)); });

    expect(m.approve).not.toHaveBeenCalled();
    expect(m.purchaseLicense).toHaveBeenCalledWith(1);
  });
});

describe("useMarketplace.listLicense approval", () => {
  it("sets the operator approval when not already approved", async () => {
    m.isApprovedForAll.mockResolvedValue(false);
    const { result } = renderHook(() => useMarketplace(), { wrapper });

    await act(async () => { await result.current.listLicense(5, BigInt(200)); });

    expect(m.setApprovalForAll).toHaveBeenCalledWith("0xMkt", true);
    expect(m.listLicense).toHaveBeenCalledWith(5, BigInt(200));
  });

  it("skips the operator approval when already approved", async () => {
    m.isApprovedForAll.mockResolvedValue(true);
    const { result } = renderHook(() => useMarketplace(), { wrapper });

    await act(async () => { await result.current.listLicense(5, BigInt(200)); });

    expect(m.setApprovalForAll).not.toHaveBeenCalled();
    expect(m.listLicense).toHaveBeenCalledWith(5, BigInt(200));
  });
});

describe("useGamePass.subscribe approval", () => {
  it("approves monthlyPrice * months and then subscribes", async () => {
    m.monthlyPrice.mockResolvedValue(BigInt(50));
    m.allowance.mockResolvedValue(BigInt(0));
    const { result } = renderHook(() => useGamePass(), { wrapper });

    await act(async () => { await result.current.subscribe(2, 3); });

    expect(m.approve).toHaveBeenCalledWith("0xPass", BigInt(150));
    expect(m.subscribe).toHaveBeenCalledWith(2, 3);
  });
});
