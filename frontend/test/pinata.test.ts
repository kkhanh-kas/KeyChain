import { describe, it, expect, vi, beforeEach } from "vitest";
import { uploadFile, uploadJson } from "@/lib/pinata";

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("uploadFile", () => {
  it("posts the file to /api/pinata and returns the ipfs uri", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ cid: "bafyCover", uri: "ipfs://bafyCover" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["x"], "cover.png", { type: "image/png" });
    await expect(uploadFile(file)).resolves.toBe("ipfs://bafyCover");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/pinata");
    expect(init.method).toBe("POST");
    expect((init.body as FormData).get("file")).toBe(file);
  });
});

describe("uploadJson", () => {
  it("posts the json string to /api/pinata and returns the ipfs uri", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ cid: "bafyMeta", uri: "ipfs://bafyMeta" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const meta = { name: "Celadon Drift", description: "A quiet racer." };
    await expect(uploadJson(meta)).resolves.toBe("ipfs://bafyMeta");

    const init = fetchMock.mock.calls[0][1];
    expect((init.body as FormData).get("json")).toBe(JSON.stringify(meta));
  });
});

describe("upload error handling", () => {
  it("throws the server error message when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "PINATA_JWT not configured" }),
      })
    );

    const file = new File(["x"], "cover.png", { type: "image/png" });
    await expect(uploadFile(file)).rejects.toThrow("PINATA_JWT not configured");
  });
});
