"use client";

// Vendor portal — register games and review your own catalog. Uses a separate
// shell (no shared navbar). Revenue is event-derived and out of scope here, so
// the dashboard reports only real on-chain catalog facts.
// Design reference: design-reference/pages/vendor.jsx

import { useMemo, useState } from "react";
import { useGameStore } from "@/hooks/useGameStore";
import { useWallet } from "@/providers/WalletProvider";
import { VendorShell } from "@/components/vendor/VendorShell";
import type { VendorView } from "@/components/vendor/VendorShell";
import { RegisterGameForm } from "@/components/vendor/RegisterGameForm";
import { CatalogTable } from "@/components/vendor/CatalogTable";
import { truncateAddress } from "@/lib/format";

export default function VendorPage() {
  const [view, setView] = useState<VendorView>("dashboard");
  const { games, registerGame, pending } = useGameStore();
  const { address, status } = useWallet();

  // A vendor only manages the games they registered.
  const myGames = useMemo(
    () => games.filter((g) => address && g.vendor.toLowerCase() === address.toLowerCase()),
    [games, address]
  );

  const titles = {
    dashboard: "Dashboard",
    register: "Register Game",
    catalog: "My Catalog",
  } as const;

  return (
    <VendorShell active={view} onSelect={setView}>
      <div className="vendor__head">
        <h1 className="vendor__h1">{titles[view]}</h1>
        <span className="eyebrow">
          {status === "connected" ? truncateAddress(address!) : "Wallet not connected"}
        </span>
      </div>

      {view === "dashboard" && (
        <div className="kpi-grid">
          <Kpi label="My Titles" value={String(myGames.length)} />
          <Kpi label="Listed" value={String(myGames.filter((g) => g.isListed).length)} />
          <Kpi label="Delisted" value={String(myGames.filter((g) => !g.isListed).length)} />
          <Kpi label="Catalog Size" value={String(games.length)} />
        </div>
      )}

      {view === "register" && (
        <RegisterGameForm onSubmit={registerGame} pending={pending} />
      )}

      {view === "catalog" && <CatalogTable games={myGames} />}
    </VendorShell>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="kpi">
      <div className="kpi__label">{label}</div>
      <div className="kpi__val">{value}</div>
    </div>
  );
}
