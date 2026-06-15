"use client";

// Boarding-pass ticket for one owned license. Presentational: the Library page
// resolves status/metadata and passes the action handlers.
// Design reference: design-reference/pages/library.jsx (Ticket component)

import { Button } from "@/components/ui";
import { formatKey } from "@/lib/format";

export type LicenseStatus = "active" | "inactive" | "listed";

interface LicenseTicketProps {
  tokenId: number;
  title: string;
  genre: string;
  cover: string | null;
  status: LicenseStatus;
  askPrice?: bigint; // present when listed
  passenger?: string; // truncated wallet address for the stub
  busy?: boolean;
  onActivate?: () => void;
  onDeactivate?: () => void;
  onResell?: () => void;
  onCancelListing?: () => void;
  onViewChain?: () => void;
}

// Deterministic barcode bars so the stub reads like a real ticket.
function Barcode({ count = 38 }: { count?: number }) {
  return (
    <div className="ticket__barcode">
      {Array.from({ length: count }, (_, i) => {
        const w = 1 + Math.round((Math.sin(i * 1.7) * 0.5 + 0.5) * 3);
        return <span key={i} style={{ width: w, opacity: i % 5 === 0 ? 1 : 0.85 }} />;
      })}
    </div>
  );
}

const STATUS_LABEL: Record<LicenseStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  listed: "Listed",
};

export function LicenseTicket({
  tokenId,
  title,
  genre,
  cover,
  status,
  askPrice,
  passenger,
  busy,
  onActivate,
  onDeactivate,
  onResell,
  onCancelListing,
  onViewChain,
}: LicenseTicketProps) {
  return (
    <article className="ticket">
      <div className="ticket__main">
        <div
          className="ticket__cover"
          style={cover ? { backgroundImage: `url("${cover}")` } : { background: "var(--accent-soft)" }}
        />
        <div className="ticket__details">
          <div className="ticket__genre">{genre.toUpperCase()}</div>
          <div className="ticket__game-title">{title}</div>
          <div className="ticket__meta-row">
            <div>
              <div className="ticket__meta-key">Token ID</div>
              <div className="ticket__meta-val">#{tokenId}</div>
            </div>
            <div>
              <div className="ticket__meta-key">License</div>
              <div className="ticket__meta-val">Perpetual</div>
            </div>
            {status === "active" && (
              <div>
                <div className="ticket__meta-key">Bound to</div>
                <div className="ticket__meta-val" style={{ color: "var(--success)" }}>This device</div>
              </div>
            )}
            {status === "listed" && askPrice !== undefined && (
              <div>
                <div className="ticket__meta-key">Listed at</div>
                <div className="ticket__meta-val" style={{ color: "var(--accent-primary)" }}>{formatKey(askPrice)} KEY</div>
              </div>
            )}
          </div>

          <div className="ticket__actions">
            {status === "inactive" && (
              <>
                <Button variant="primary" disabled={busy} onClick={onActivate}>Activate</Button>
                <Button variant="secondary" disabled={busy} onClick={onResell}>Resell</Button>
              </>
            )}
            {status === "active" && (
              <>
                <Button variant="secondary" disabled={busy} onClick={onDeactivate}>Deactivate</Button>
                <Button variant="secondary" disabled={busy} onClick={onResell}>Resell</Button>
              </>
            )}
            {status === "listed" && (
              <Button variant="danger" disabled={busy} onClick={onCancelListing}>Cancel Listing</Button>
            )}
            <Button variant="ghost" onClick={onViewChain}>View on chain</Button>
          </div>
        </div>

        <span className={`ticket__status ticket__status--${status}`}>
          <span className="ticket__status-dot" />
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div className="ticket__stub">
        <div>
          <div className="ticket__stub-row">
            <span>Boarding Pass</span>
            <strong className="ticket__stub-no">№ {tokenId}</strong>
          </div>
          <div className="ticket__stub-row">
            <span>Gate</span>
            <strong>Sepolia Testnet</strong>
          </div>
          <div className="ticket__stub-row">
            <span>Class</span>
            <strong>Perpetual</strong>
          </div>
        </div>
        <Barcode />
        {passenger && (
          <div className="ticket__stub-row" style={{ marginBottom: 0 }}>
            <span>Passenger</span>
            <strong>{passenger}</strong>
          </div>
        )}
      </div>
    </article>
  );
}
