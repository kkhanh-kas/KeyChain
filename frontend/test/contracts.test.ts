import { describe, it, expect, afterEach, vi } from "vitest";
import { getContractConfig } from "@/lib/contracts";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getContractConfig", () => {
  it("throws when the contract address is not configured", () => {
    expect(() => getContractConfig("KeyCoin")).toThrow(/address not configured/);
  });

  it("returns the ABI and address when configured", () => {
    vi.stubEnv("NEXT_PUBLIC_KEYCOIN_ADDRESS", "0xabc");
    const config = getContractConfig("KeyCoin");
    expect(config.address).toBe("0xabc");
    expect(Array.isArray(config.abi)).toBe(true);
    expect(config.abi.length).toBeGreaterThan(0);
  });
});
