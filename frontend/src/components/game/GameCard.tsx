"use client";

// Poster-style game card with hover-to-reveal overlay. Shared by Store and
// Marketplace. Presentational: the parent resolves cover/genre from metadata.

import { formatKey, truncateAddress } from "@/lib/format";

interface GameCardProps {
  title: string;
  genre: string;
  price: bigint;
  cover: string | null;
  seller?: string; // present on resale listings
  onOpen?: () => void;
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function GameCard({ title, genre, price, cover, seller, onOpen }: GameCardProps) {
  return (
    <div className="game-card" onClick={onOpen}>
      {seller && <span className="game-card__badge game-card__badge--resale">Resale</span>}
      <div
        className="game-card__cover"
        style={cover ? { backgroundImage: `url("${cover}")` } : { background: "var(--accent-soft)" }}
      />
      <div className="game-card__overlay">
        <div className="game-card__meta">
          <span className="mono">{genre.toUpperCase()}</span>
          {seller && <span>· seller {truncateAddress(seller)}</span>}
        </div>
        <div className="game-card__title">{title}</div>
        <div className="game-card__price">
          <span className="game-card__price-val">{formatKey(price)} KEY</span>
          <span className="game-card__cta">View <ArrowIcon /></span>
        </div>
      </div>
    </div>
  );
}
