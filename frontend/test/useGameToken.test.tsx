import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const { getCatalogMock, balanceOfBatchMock, uriMock } = vi.hoisted(() => ({
  getCatalogMock: vi.fn(),
  balanceOfBatchMock: vi.fn(),
  uriMock: vi.fn(),
}));

vi.mock("@/hooks/useContract", () => ({
  useContract: (name: string) =>
    name === "GameStore"
      ? { getCatalog: getCatalogMock }
      : { balanceOfBatch: balanceOfBatchMock, uri: uriMock },
}));

import { useGameToken } from "@/hooks/useGameToken";

describe("useGameToken.getOwnedLicenses", () => {
  it("returns only the tokenIds with a positive balance", async () => {
    getCatalogMock.mockResolvedValue([
      [BigInt(1), BigInt(2), BigInt(3)],
      [],
    ]);
    balanceOfBatchMock.mockResolvedValue([BigInt(1), BigInt(0), BigInt(2)]);

    const { result } = renderHook(() => useGameToken());
    await expect(result.current.getOwnedLicenses("0xowner")).resolves.toEqual([
      1, 3,
    ]);
  });

  it("returns an empty array when the catalog is empty", async () => {
    getCatalogMock.mockResolvedValue([[], []]);

    const { result } = renderHook(() => useGameToken());
    await expect(result.current.getOwnedLicenses("0xowner")).resolves.toEqual(
      []
    );
  });
});

describe("useGameToken.getMetadata", () => {
  const meta = {
    name: "Celadon Drift",
    description: "A quiet racer.",
    image: "ipfs://bafyCover",
    attributes: { genre: "Racing", vendor: "0xV", royaltyBps: 500 },
  };

  beforeEach(() => {
    uriMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("fetches and parses the metadata at the resolved tokenURI", async () => {
    uriMock.mockResolvedValue("ipfs://bafyMeta");
    const fetchMock = vi.fn().mockResolvedValue({ json: () => Promise.resolve(meta) });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useGameToken());
    await expect(result.current.getMetadata(1)).resolves.toEqual(meta);
    expect(fetchMock).toHaveBeenCalledWith("https://gateway.pinata.cloud/ipfs/bafyMeta");
  });

  it("caches per tokenId and does not refetch", async () => {
    uriMock.mockResolvedValue("ipfs://bafyMeta");
    const fetchMock = vi.fn().mockResolvedValue({ json: () => Promise.resolve(meta) });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useGameToken());
    await result.current.getMetadata(7);
    await result.current.getMetadata(7);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns null without fetching when the tokenURI is empty", async () => {
    uriMock.mockResolvedValue("");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useGameToken());
    await expect(result.current.getMetadata(2)).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null when the fetch fails", async () => {
    uriMock.mockResolvedValue("ipfs://bafyMeta");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    const { result } = renderHook(() => useGameToken());
    await expect(result.current.getMetadata(3)).resolves.toBeNull();
  });
});
