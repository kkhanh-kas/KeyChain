"use client";

// Library — the wallet's owned licenses as boarding-pass tickets. Held tokens
// show active/inactive (activate/deactivate, resell); escrowed tokens that the
// wallet has listed show as "listed" (cancel). Design reference: pages/library.jsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/providers/WalletProvider";
import { useGameStore } from "@/hooks/useGameStore";
import { useGameToken } from "@/hooks/useGameToken";
import { useActivation } from "@/hooks/useActivation";
import { useMarketplace } from "@/hooks/useMarketplace";
import { useGameMetadata } from "@/hooks/useGameMetadata";
import { LicenseTicket } from "@/components/library/LicenseTicket";
import type { LicenseStatus } from "@/components/library/LicenseTicket";
import { Button, Modal } from "@/components/ui";
import { Mascot } from "@/components/Mascot";
import { addressUrl } from "@/lib/constants";
import { parseKey } from "@/lib/format";

interface Item {
  tokenId: number;
  status: LicenseStatus;
  listingId?: number;
  askPrice?: bigint;
}

export default function LibraryPage() {
  const router = useRouter();
  const { address, status: walletStatus } = useWallet();
  const { games } = useGameStore();
  const { getOwnedLicenses } = useGameToken();
  const { isActive, activate, deactivate, pending: actPending } = useActivation();
  const { listings, listLicense, cancelListing, pending: mktPending } = useMarketplace();

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [resellId, setResellId] = useState<number | null>(null);
  const [price, setPrice] = useState("");

  const busy = actPending || mktPending;

  // Held tokens (active/inactive) + tokens this wallet has escrowed on the market.
  const load = useCallback(async () => {
    if (!address) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const held = await getOwnedLicenses(address);
      const heldItems: Item[] = await Promise.all(
        held.map(async (tokenId) => ({
          tokenId,
          status: (await isActive(address, tokenId)) ? "active" : "inactive" as LicenseStatus,
        }))
      );
      const mine = listings.filter((l) => l.seller.toLowerCase() === address.toLowerCase());
      const listedItems: Item[] = mine.map((l) => ({
        tokenId: l.tokenId,
        status: "listed",
        listingId: l.listingId,
        askPrice: l.price,
      }));
      setItems([...heldItems, ...listedItems]);
    } finally {
      setLoading(false);
    }
  }, [address, getOwnedLicenses, isActive, listings]);

  useEffect(() => {
    void load();
  }, [load]);

  const ids = useMemo(() => items.map((i) => i.tokenId), [items]);
  const meta = useGameMetadata(ids);
  const nameOf = (id: number) => games.find((g) => g.id === id)?.name ?? `Game #${id}`;

  async function confirmResell() {
    if (resellId === null) return;
    await listLicense(resellId, parseKey(price));
    setResellId(null);
    setPrice("");
    await load();
  }

  if (walletStatus !== "connected") {
    return (
      <div className="library page-shell">
        <div className="empty">
          <Mascot size={160} />
          <div className="empty__title">Connect your wallet.</div>
          <div className="empty__msg">Your licenses live on-chain — connect to see your tickets.</div>
        </div>
      </div>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <div className="library page-shell">
        <div className="empty">
          <Mascot size={160} />
          <div className="empty__title">No games yet.</div>
          <div className="empty__msg">Your collection starts at the Store.</div>
          <Button variant="primary" large onClick={() => router.push("/store")}>Visit the Store</Button>
        </div>
      </div>
    );
  }

  const activeCount = items.filter((i) => i.status === "active").length;

  return (
    <div className="library page-shell">
      <div className="library__head">
        <div>
          <div className="section-marker">Your Library</div>
          <h1 className="library__title" style={{ marginTop: 12 }}>Tickets.</h1>
        </div>
        <div className="library__count">{items.length} owned · {activeCount} active</div>
      </div>

      {items.map((item) => {
        const d = meta.get(item.tokenId);
        return (
          <LicenseTicket
            key={`${item.tokenId}-${item.status}`}
            tokenId={item.tokenId}
            title={nameOf(item.tokenId)}
            genre={d.genre}
            cover={d.cover}
            status={item.status}
            askPrice={item.askPrice}
            busy={busy}
            onActivate={async () => { await activate(item.tokenId); await load(); }}
            onDeactivate={async () => { await deactivate(item.tokenId); await load(); }}
            onResell={() => setResellId(item.tokenId)}
            onCancelListing={async () => { if (item.listingId !== undefined) { await cancelListing(item.listingId); await load(); } }}
            onViewChain={() => window.open(addressUrl(address!), "_blank")}
          />
        );
      })}

      <Modal open={resellId !== null} onClose={() => setResellId(null)} title="List for resale">
        <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
          Set an asking price in KEY. The original vendor still earns a royalty on every resale.
        </p>
        <div className="form-field" style={{ marginBottom: 18 }}>
          <label htmlFor="resell-price">Price (KEY)</label>
          <input id="resell-price" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="300" />
        </div>
        <Button variant="primary" disabled={busy || !price} onClick={confirmResell}>
          {busy ? <><span className="spinner" /> Listing…</> : "List license"}
        </Button>
      </Modal>
    </div>
  );
}
