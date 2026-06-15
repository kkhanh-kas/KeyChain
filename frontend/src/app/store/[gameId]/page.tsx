"use client";

// Game detail — cover + info, buy a perpetual license, or subscribe to the
// Game Pass (Flow 5). Buy approves KEY then calls purchaseLicense.
// Design reference: design-reference/pages/store.jsx (GameDetail component)

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/hooks/useGameStore";
import { useGameToken } from "@/hooks/useGameToken";
import { useGamePass } from "@/hooks/useGamePass";
import { useWallet } from "@/providers/WalletProvider";
import { useKeyBalance } from "@/providers/KeyBalanceProvider";
import { useGameMetadata } from "@/hooks/useGameMetadata";
import { Button } from "@/components/ui";
import { formatKey } from "@/lib/format";
import { TARGET_CHAIN_ID } from "@/lib/constants";

export default function GameDetailPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const id = Number(gameId);
  const router = useRouter();

  const { games, loading, purchaseLicense, pending } = useGameStore();
  const { getOwnedLicenses } = useGameToken();
  const { address, status } = useWallet();
  const { balance } = useKeyBalance();
  const meta = useGameMetadata([id]);

  const game = games.find((g) => g.id === id);
  const display = meta.get(id);
  const [owned, setOwned] = useState(false);

  useEffect(() => {
    if (address) getOwnedLicenses(address).then((ids) => setOwned(ids.includes(id)));
  }, [address, id, getOwnedLicenses]);

  async function buy() {
    if (!game) return;
    await purchaseLicense(game.id, game.price);
    router.push("/library");
  }

  if (loading && !game) {
    return <div className="detail page-shell"><span className="spinner" /></div>;
  }
  if (!game) {
    return (
      <div className="detail page-shell">
        <a className="detail__back" onClick={() => router.push("/store")}>‹ Back to store</a>
        <p style={{ color: "var(--text-secondary)" }}>Game #{gameId} not found.</p>
      </div>
    );
  }

  const connected = status === "connected";

  return (
    <div className="detail page-shell">
      <a className="detail__back" onClick={() => router.push("/store")}>‹ Back to store</a>
      <div className="detail__hero">
        <div
          className="detail__cover"
          style={display.cover ? { backgroundImage: `url("${display.cover}")` } : { background: "var(--accent-soft)" }}
        />
        <div className="detail__info">
          <span className="detail__genre">{display.genre} · {game.vendor.slice(0, 10)}…</span>
          <h1 className="detail__title">{game.name}</h1>
          {display.description && <p className="detail__desc lead">{display.description}</p>}
          <div className="divider-bar" />

          <div className="detail__buybar">
            <div>
              <div className="detail__price-label">List price</div>
              <div className="detail__price">{formatKey(game.price)}<small>KEY</small></div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Button variant="secondary" large onClick={() => router.push("/store")}>Cancel</Button>
              {!connected ? (
                <Button variant="primary" large disabled>Connect wallet to buy</Button>
              ) : owned ? (
                <Button variant="primary" large disabled>Owned in Library</Button>
              ) : balance < game.price ? (
                <Button variant="primary" large disabled title="Buy KEY first">Need more KEY · Buy KEY first</Button>
              ) : (
                <Button variant="primary" large disabled={pending} onClick={buy}>
                  {pending ? <><span className="spinner" /> Confirming…</> : `Buy Now · ${formatKey(game.price)} KEY`}
                </Button>
              )}
            </div>
          </div>

          <GamePassSection gameId={game.id} address={address} connected={connected} />

          <div className="detail__meta-grid">
            <Meta label="Token Standard" value="ERC-1155 · ERC-2981" />
            <Meta label="License Type" value="Perpetual" serif />
            <Meta label="Token ID" value={`#${game.id}`} />
            <Meta label="Vendor" value={game.vendor} />
            <Meta label="Network" value={`Sepolia · ChainID ${TARGET_CHAIN_ID}`} />
            <Meta label="Status" value={game.isListed ? "Listed for sale" : "Delisted"} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value, serif }: { label: string; value: string; serif?: boolean }) {
  return (
    <div className="detail__meta">
      <div className="detail__meta-label">{label}</div>
      <div className={`detail__meta-val${serif ? " serif" : ""}`}>{value}</div>
    </div>
  );
}

// Game Pass: subscribe for N months. monthlyPrice 0 means the vendor offers no pass.
function GamePassSection({ gameId, address, connected }: { gameId: number; address: string | null; connected: boolean }) {
  const { subscribe, monthlyPrice, expiryOf, pending } = useGamePass();
  const [price, setPrice] = useState<bigint>(BigInt(0));
  const [months, setMonths] = useState(1);
  const [expiry, setExpiry] = useState<bigint>(BigInt(0));

  useEffect(() => {
    monthlyPrice(gameId).then(setPrice);
  }, [gameId, monthlyPrice]);

  useEffect(() => {
    if (address) expiryOf(address, gameId).then(setExpiry);
  }, [address, gameId, expiryOf]);

  if (price === BigInt(0)) return null; // no pass configured for this game

  const active = expiry > BigInt(Math.floor(Date.now() / 1000));

  async function go() {
    await subscribe(gameId, months);
    if (address) setExpiry(await expiryOf(address, gameId));
  }

  return (
    <div className="section-card" style={{ marginTop: 24 }}>
      <h3>Game Pass</h3>
      <p style={{ color: "var(--text-secondary)", marginBottom: 14 }}>
        {formatKey(price)} KEY / month.
        {active && ` Active until ${new Date(Number(expiry) * 1000).toLocaleDateString()}.`}
      </p>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <select
          aria-label="Subscription months"
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
          className="form-field"
          style={{ padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-primary)", color: "var(--text-primary)" }}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>{m} month{m > 1 ? "s" : ""}</option>
          ))}
        </select>
        <Button variant="secondary" disabled={!connected || pending} onClick={go}>
          {pending ? <><span className="spinner" /> …</> : `Subscribe · ${formatKey(price * BigInt(months))} KEY`}
        </Button>
      </div>
    </div>
  );
}
