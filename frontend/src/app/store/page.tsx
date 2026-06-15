"use client";

// Store — gallery of listed games with a sticky cover marquee and genre filter.
// Data from useGameStore (on-chain catalog) + useGameMetadata (IPFS covers).
// Design reference: design-reference/pages/store.jsx

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/hooks/useGameStore";
import { useGameMetadata } from "@/hooks/useGameMetadata";
import { useSearch } from "@/providers/SearchProvider";
import { GameCard } from "@/components/game/GameCard";
import { Mascot } from "@/components/Mascot";

export default function StorePage() {
  const router = useRouter();
  const { games, loading } = useGameStore();

  // Only games still open for primary sale appear in the Store.
  const listed = useMemo(() => games.filter((g) => g.isListed), [games]);
  const ids = useMemo(() => listed.map((g) => g.id), [listed]);
  const meta = useGameMetadata(ids);

  const [filter, setFilter] = useState("All");
  const { query } = useSearch();
  const q = query.trim().toLowerCase();
  const genres = useMemo(
    () => ["All", ...Array.from(new Set(ids.map((id) => meta.get(id).genre)))],
    [ids, meta]
  );
  const shown = listed.filter(
    (g) =>
      (filter === "All" || meta.get(g.id).genre === filter) &&
      (q === "" || g.name.toLowerCase().includes(q))
  );

  const covers = listed.map((g) => meta.get(g.id).cover).filter(Boolean) as string[];

  return (
    <div className="store page-shell">
      <aside className="marquee">
        <div className="marquee__head">
          <span>NOW SHOWING</span>
          <span>青花 · GALLERY</span>
        </div>
        <div className="marquee__track">
          {[...covers, ...covers].map((cover, i) => (
            <div key={i} className="marquee__item" style={{ backgroundImage: `url("${cover}")`, backgroundSize: "cover", backgroundPosition: "center" }} />
          ))}
        </div>
      </aside>

      <main className="store__main">
        <div className="store__head">
          <div>
            <div className="section-marker">The Gallery</div>
            <h1 className="store__title" style={{ marginTop: 12 }}>Store.</h1>
            <p style={{ color: "var(--text-secondary)", marginTop: 8, maxWidth: 560 }}>
              A curated shelf. Every cover is the work of its studio. Hover for the price, click for the story!
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
            <div className="empty__title">Keychan looked everywhere.</div>
            <div className="empty__msg">No games on the shelf yet. Check back soon.</div>
          </div>
        ) : (
          <div className="gallery">
            {shown.map((g) => {
              const d = meta.get(g.id);
              return (
                <GameCard
                  key={g.id}
                  title={g.name}
                  genre={d.genre}
                  price={g.price}
                  cover={d.cover}
                  onOpen={() => router.push(`/store/${g.id}`)}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
