"use client";

// Marketplace — open resale listings as a gallery. Buying pulls KEY, splits the
// royalty to the original vendor (ERC-2981), and transfers an inactive license.
// Design reference: design-reference/pages/store.jsx (Marketplace component)

import { useMemo, useState } from "react";
import { useMarketplace } from "@/hooks/useMarketplace";
import type { Listing } from "@/hooks/useMarketplace";
import { useGameStore } from "@/hooks/useGameStore";
import { useWallet } from "@/providers/WalletProvider";
import { useKeyBalance } from "@/providers/KeyBalanceProvider";
import { useGameMetadata } from "@/hooks/useGameMetadata";
import { useSearch } from "@/providers/SearchProvider";
import { GameCard } from "@/components/game/GameCard";
import { Button, Modal } from "@/components/ui";
import { Mascot } from "@/components/Mascot";
import { formatKey, truncateAddress } from "@/lib/format";

export default function MarketplacePage() {
  const { listings, loading, buyLicense, pending } = useMarketplace();
  const { games } = useGameStore();
  const { address, status } = useWallet();
  const { balance } = useKeyBalance();

  // Only show listings for games still in the active catalog (delisted/old seed
  // games are hidden, matching the Store).
  const listedIds = useMemo(() => new Set(games.filter((g) => g.isListed).map((g) => g.id)), [games]);
  const visibleListings = useMemo(
    () => listings.filter((l) => listedIds.has(l.tokenId)),
    [listings, listedIds]
  );

  const ids = useMemo(() => visibleListings.map((l) => l.tokenId), [visibleListings]);
  const meta = useGameMetadata(ids);
  const nameOf = (id: number) => games.find((g) => g.id === id)?.name ?? `Game #${id}`;

  const [filter, setFilter] = useState("All");
  const { query } = useSearch();
  const q = query.trim().toLowerCase();
  const genres = useMemo(
    () => ["All", ...Array.from(new Set(ids.map((id) => meta.get(id).genre)))],
    [ids, meta]
  );
  const shown = visibleListings.filter(
    (l) =>
      (filter === "All" || meta.get(l.tokenId).genre === filter) &&
      (q === "" || nameOf(l.tokenId).toLowerCase().includes(q))
  );

  const [selected, setSelected] = useState<Listing | null>(null);
  const isOwn = selected ? selected.seller.toLowerCase() === address?.toLowerCase() : false;

  async function buy() {
    if (!selected) return;
    await buyLicense(selected.listingId, selected.price);
    setSelected(null);
  }

  return (
    <div className="store page-shell" style={{ gridTemplateColumns: "1fr" }}>
      <main className="store__main">
        <div className="store__head">
          <div>
            <div className="section-marker">Second-hand Wing</div>
            <h1 className="store__title" style={{ marginTop: 12 }}>Marketplace.</h1>
            <p style={{ color: "var(--text-secondary)", marginTop: 8, maxWidth: 620 }}>
              Licenses listed by other holders. Each resale pays a royalty to the original studio.
            </p>
          </div>
          <div className="store__filters">
            {genres.map((g) => (
              <button type="button" key={g} className={`chip ${filter === g ? "chip--active" : ""}`} onClick={() => setFilter(g)}>
                {g}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="empty"><span className="spinner" /></div>
        ) : shown.length === 0 ? (
          <div className="empty">
            <Mascot size={140} />
            <div className="empty__title">Nothing listed for resale.</div>
            <div className="empty__msg">When holders list a game, it shows up here.</div>
          </div>
        ) : (
          <div className="gallery gallery--wide">
            {shown.map((l) => {
              const d = meta.get(l.tokenId);
              return (
                <GameCard
                  key={l.listingId}
                  title={nameOf(l.tokenId)}
                  genre={d.genre}
                  price={l.price}
                  cover={d.cover}
                  seller={l.seller}
                  onOpen={() => setSelected(l)}
                />
              );
            })}
          </div>
        )}
      </main>

      <Modal open={selected !== null} onClose={() => setSelected(null)} title="Buy resale license">
        {selected && (
          <>
            <p style={{ marginBottom: 8 }}>{nameOf(selected.tokenId)}</p>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 16 }}>
              Seller {truncateAddress(selected.seller)} · {formatKey(selected.price)} KEY.
              A royalty goes to the original vendor automatically.
            </p>
            {status !== "connected" ? (
              <Button variant="primary" disabled>Connect wallet to buy</Button>
            ) : isOwn ? (
              <Button variant="primary" disabled>This is your listing</Button>
            ) : balance < selected.price ? (
              <Button variant="primary" disabled title="Buy KEY first">Need more KEY · Buy KEY first</Button>
            ) : (
              <Button variant="primary" disabled={pending} onClick={buy}>
                {pending ? <><span className="spinner" /> Confirming…</> : `Buy · ${formatKey(selected.price)} KEY`}
              </Button>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
