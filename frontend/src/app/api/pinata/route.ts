// Server-side IPFS upload via Pinata. The JWT is read here (never exposed to
// the browser): a file field is pinned as-is, otherwise a `json` field is
// parsed and pinned as JSON. Returns the resulting CID and ipfs:// URI.

import { NextResponse } from "next/server";
import { PinataSDK } from "pinata-web3";

export async function POST(req: Request) {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    return NextResponse.json({ error: "PINATA_JWT not configured" }, { status: 500 });
  }

  try {
    const pinata = new PinataSDK({ pinataJwt: jwt, pinataGateway: process.env.PINATA_GATEWAY });
    const form = await req.formData();
    const file = form.get("file");

    let cid: string;
    if (file instanceof File) {
      ({ IpfsHash: cid } = await pinata.upload.file(file));
    } else {
      const json = form.get("json");
      ({ IpfsHash: cid } = await pinata.upload.json(JSON.parse(json as string)));
    }

    return NextResponse.json({ cid, uri: `ipfs://${cid}` });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
