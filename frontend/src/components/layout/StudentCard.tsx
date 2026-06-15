"use client";

// Member Card modal opened from the navbar wallet button. Shows the connected
// wallet's identity: an editable display name (localStorage), role, address,
// KEY balance, owned game count, and join date, plus a disconnect action.
// Ported from design-reference/components/student-card.jsx.

import { useEffect, useRef, useState } from "react";
import { Mascot } from "@/components/Mascot";
import { useWallet } from "@/providers/WalletProvider";
import { useKeyCoin } from "@/hooks/useKeyCoin";
import { useGameToken } from "@/hooks/useGameToken";
import { formatKey, truncateAddress } from "@/lib/format";

export function StudentCard({ onClose }: { onClose: () => void }) {
  const { address, disconnect } = useWallet();
  const { balance } = useKeyCoin();
  const { getOwnedLicenses } = useGameToken();

  const [name, setName] = useState("Curator");
  const [editing, setEditing] = useState(false);
  const [joined, setJoined] = useState("—");
  const [ownedCount, setOwnedCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Name + join date persist locally (there is no on-chain profile).
  useEffect(() => {
    setName(localStorage.getItem("kc-name") || "Curator");
    let j = localStorage.getItem("kc-joined");
    if (!j) {
      j = new Date().toLocaleDateString();
      localStorage.setItem("kc-joined", j);
    }
    setJoined(j);
  }, []);

  useEffect(() => {
    if (address) getOwnedLicenses(address).then((ids) => setOwnedCount(ids.length));
  }, [address, getOwnedLicenses]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function commit() {
    localStorage.setItem("kc-name", name);
    setEditing(false);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="student-card" onClick={(e) => e.stopPropagation()}>
        <div className="student-card__head">
          <span className="student-card__title">KeyChain · Member Card</span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="student-card__body">
          <div className="student-card__avatar">
            <Mascot size={100} />
          </div>
          <div className="student-card__fields">
            <Field label="Name">
              {editing ? (
                <input
                  ref={inputRef}
                  className="student-card__field-input"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={commit}
                  onKeyDown={(e) => e.key === "Enter" && commit()}
                />
              ) : (
                <span className="student-card__val serif" style={{ cursor: "pointer" }} onClick={() => setEditing(true)}>
                  {name}
                </span>
              )}
            </Field>
            <Field label="Role"><span className="student-card__val">Customer</span></Field>
            <Field label="Wallet"><span className="student-card__val">{address ? truncateAddress(address) : "—"}</span></Field>
            <Field label="Balance"><span className="student-card__val">{formatKey(balance)} KEY</span></Field>
            <Field label="Games"><span className="student-card__val">{ownedCount} owned</span></Field>
            <Field label="Joined"><span className="student-card__val">{joined}</span></Field>
          </div>
        </div>

        <div className="student-card__stub">
          <div>
            <div className="eyebrow" style={{ color: "var(--text-secondary)" }}>Member since 2026</div>
            <div style={{ marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.18em", color: "var(--accent-primary)" }}>
              {address ? address.slice(0, 18) + "…" : "—"}
            </div>
          </div>
          <div className="student-card__stub-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>Edit Profile</button>
            <button type="button" className="btn btn-danger" onClick={() => { disconnect(); onClose(); }}>Disconnect</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="student-card__field">
      <span className="student-card__label">{label}</span>
      {children}
    </div>
  );
}
