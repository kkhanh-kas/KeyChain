import { describe, it, expect } from "vitest";
import { generateMachineHash } from "@/lib/machineHash";

describe("generateMachineHash", () => {
  it("produces a 0x-prefixed 32-byte hex digest", async () => {
    const hash = await generateMachineHash();
    expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("is deterministic for the same environment", async () => {
    const a = await generateMachineHash();
    const b = await generateMachineHash();
    expect(a).toBe(b);
  });
});
