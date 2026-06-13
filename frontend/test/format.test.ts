import { describe, it, expect } from "vitest";
import {
  truncateAddress,
  formatKey,
  truncateHash,
  formatDate,
  parseKey,
} from "@/lib/format";

describe("truncateAddress", () => {
  it("keeps the 0x prefix and the trailing chars", () => {
    expect(
      truncateAddress("0x1234567890abcdef1234567890abcdef12345678")
    ).toBe("0x1234…5678");
  });

  it("returns an empty string for empty input", () => {
    expect(truncateAddress("")).toBe("");
  });
});

describe("formatKey", () => {
  it("scales an 18-decimal bigint to a whole number", () => {
    expect(formatKey(BigInt("5000000000000000000"))).toBe("5");
  });

  it("keeps up to two fraction digits", () => {
    expect(formatKey(BigInt("1500000000000000000"))).toBe("1.5");
  });
});

describe("truncateHash", () => {
  it("keeps the leading 10 and trailing 6 characters", () => {
    const hash = "0x" + "a".repeat(64);
    expect(truncateHash(hash)).toBe("0xaaaaaaaa…aaaaaa");
  });
});

describe("formatDate", () => {
  it("formats an ISO date in en-US", () => {
    expect(formatDate("2026-06-13T12:00:00")).toBe("Jun 13, 2026");
  });
});

describe("parseKey", () => {
  it("scales a whole KEY amount to 18-decimal base units", () => {
    expect(parseKey("300")).toBe(BigInt("300000000000000000000"));
  });

  it("treats an empty string as zero", () => {
    expect(parseKey("")).toBe(BigInt(0));
  });

  it("round-trips with formatKey", () => {
    expect(formatKey(parseKey("42"))).toBe("42");
  });
});
