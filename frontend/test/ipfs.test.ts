import { describe, it, expect } from "vitest";
import { resolveIpfsUrl } from "@/lib/ipfs";

const GATEWAY = "https://gateway.pinata.cloud/ipfs/";

describe("resolveIpfsUrl", () => {
  it("rewrites an ipfs:// URI to the gateway", () => {
    expect(resolveIpfsUrl("ipfs://QmAbc123")).toBe(GATEWAY + "QmAbc123");
  });

  it("prefixes a bare Qm CID with the gateway", () => {
    expect(resolveIpfsUrl("QmAbc123")).toBe(GATEWAY + "QmAbc123");
  });

  it("prefixes a bare bafy CID with the gateway", () => {
    expect(resolveIpfsUrl("bafyabc")).toBe(GATEWAY + "bafyabc");
  });

  it("leaves an http URL untouched", () => {
    expect(resolveIpfsUrl("https://example.com/x.png")).toBe(
      "https://example.com/x.png"
    );
  });

  it("returns an empty string for empty input", () => {
    expect(resolveIpfsUrl("")).toBe("");
  });
});
