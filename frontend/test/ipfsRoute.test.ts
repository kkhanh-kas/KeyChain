import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/ipfs/[cid]/route";

const ctx = (cid: string) => ({ params: Promise.resolve({ cid }) });
const req = new Request("http://localhost/api/ipfs/x");

describe("GET /api/ipfs/[cid]", () => {
  it("redirects to the resolved gateway url", async () => {
    const res = await GET(req, ctx("QmAbc"));

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(
      "https://gateway.pinata.cloud/ipfs/QmAbc"
    );
  });

  it("returns 400 for an empty cid", async () => {
    const res = await GET(req, ctx(""));

    expect(res.status).toBe(400);
  });
});
