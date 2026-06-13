// Stable IPFS image proxy: /api/ipfs/<cid> redirects to the gateway URL built
// by resolveIpfsUrl, so callers reuse our resolve logic without hard-coding the
// gateway. A redirect (not a fetch) keeps the route thin and cacheable.

import { NextResponse } from "next/server";
import { resolveIpfsUrl } from "@/lib/ipfs";

export async function GET(_req: Request, { params }: { params: Promise<{ cid: string }> }) {
  const { cid } = await params;
  if (!cid) {
    return NextResponse.json({ error: "Missing cid" }, { status: 400 });
  }
  return NextResponse.redirect(resolveIpfsUrl(cid), 302);
}
