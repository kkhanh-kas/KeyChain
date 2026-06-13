"use client";

// Read-only table of the vendor's registered games (real on-chain catalog).

import type { Game } from "@/hooks/useGameStore";
import { Badge } from "@/components/ui";
import { formatKey } from "@/lib/format";

export function CatalogTable({ games }: { games: Game[] }) {
  if (games.length === 0) {
    return <p style={{ color: "var(--text-secondary)" }}>No games registered yet.</p>;
  }
  return (
    <div className="data-table">
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Token ID</th>
            <th>Price</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {games.map((g) => (
            <tr key={g.id}>
              <td>{g.name}</td>
              <td className="mono">#{g.id}</td>
              <td className="mono num">{formatKey(g.price)} KEY</td>
              <td>
                <Badge tone={g.isListed ? "success" : "default"}>{g.isListed ? "Listed" : "Delisted"}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
