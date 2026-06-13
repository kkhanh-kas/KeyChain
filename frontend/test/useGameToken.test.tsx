import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const { getCatalogMock, balanceOfBatchMock } = vi.hoisted(() => ({
  getCatalogMock: vi.fn(),
  balanceOfBatchMock: vi.fn(),
}));

vi.mock("@/hooks/useContract", () => ({
  useContract: (name: string) =>
    name === "GameStore"
      ? { getCatalog: getCatalogMock }
      : { balanceOfBatch: balanceOfBatchMock },
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
