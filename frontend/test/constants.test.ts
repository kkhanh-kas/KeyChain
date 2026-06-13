import { describe, it, expect } from "vitest";
import { id } from "ethers";
import { ROLES, TARGET_CHAIN_ID, SEPOLIA_CHAIN_ID } from "@/lib/constants";

describe("ROLES", () => {
  it("derives VENDOR and MINTER from the contract role strings", () => {
    expect(ROLES.VENDOR).toBe(id("VENDOR_ROLE"));
    expect(ROLES.MINTER).toBe(id("MINTER_ROLE"));
  });

  it("uses the zero hash for the default admin role", () => {
    expect(ROLES.ADMIN).toBe("0x" + "0".repeat(64));
  });

  it("does not define a customer role (no on-chain role for buyers)", () => {
    expect("CUSTOMER" in ROLES).toBe(false);
  });
});

describe("TARGET_CHAIN_ID", () => {
  it("defaults to Sepolia when NEXT_PUBLIC_CHAIN_ID is unset", () => {
    expect(TARGET_CHAIN_ID).toBe(SEPOLIA_CHAIN_ID);
  });
});
