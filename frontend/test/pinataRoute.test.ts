import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { uploadFileMock, uploadJsonMock } = vi.hoisted(() => ({
  uploadFileMock: vi.fn(),
  uploadJsonMock: vi.fn(),
}));

vi.mock("pinata-web3", () => ({
  PinataSDK: class {
    upload = { file: uploadFileMock, json: uploadJsonMock };
  },
}));

import { POST } from "@/app/api/pinata/route";

// The handler only consumes req.formData(); pass a stub that yields a FormData
// we control, so the test exercises our branch logic rather than undici's
// multipart parser.
const reqWith = (form: FormData) =>
  ({ formData: async () => form } as unknown as Request);

beforeEach(() => {
  uploadFileMock.mockReset();
  uploadJsonMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/pinata", () => {
  it("returns 500 when PINATA_JWT is not configured", async () => {
    vi.stubEnv("PINATA_JWT", "");
    const body = new FormData();
    body.append("file", new File(["x"], "c.png"));

    const res = await POST(reqWith(body));

    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/PINATA_JWT/);
  });

  it("pins a file field and returns its cid and ipfs uri", async () => {
    vi.stubEnv("PINATA_JWT", "jwt-token");
    uploadFileMock.mockResolvedValue({ IpfsHash: "bafyCover" });
    const file = new File(["x"], "cover.png", { type: "image/png" });
    const body = new FormData();
    body.append("file", file);

    const res = await POST(reqWith(body));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ cid: "bafyCover", uri: "ipfs://bafyCover" });
    expect(uploadFileMock).toHaveBeenCalledOnce();
    expect(uploadJsonMock).not.toHaveBeenCalled();
  });

  it("parses a json field and pins it as JSON", async () => {
    vi.stubEnv("PINATA_JWT", "jwt-token");
    uploadJsonMock.mockResolvedValue({ IpfsHash: "bafyMeta" });
    const meta = { name: "Celadon Drift", description: "A quiet racer." };
    const body = new FormData();
    body.append("json", JSON.stringify(meta));

    const res = await POST(reqWith(body));

    expect(await res.json()).toEqual({ cid: "bafyMeta", uri: "ipfs://bafyMeta" });
    expect(uploadJsonMock).toHaveBeenCalledWith(meta);
  });
});
