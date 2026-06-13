"use client";

// Register a new game on-chain. Metadata CID is entered manually for now; the
// Pinata upload flow lands in Priority 3 and will replace this field.

import { useState } from "react";
import { Button } from "@/components/ui";
import { parseKey } from "@/lib/format";

interface RegisterGameFormProps {
  onSubmit: (name: string, price: bigint, royaltyBps: number, uri: string) => Promise<unknown>;
  pending: boolean;
}

export function RegisterGameForm({ onSubmit, pending }: RegisterGameFormProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [royalty, setRoyalty] = useState("5");
  const [uri, setUri] = useState("");

  const valid = name && price && uri && Number(royalty) >= 0 && Number(royalty) <= 100;

  async function submit() {
    await onSubmit(name, parseKey(price), Math.round(Number(royalty) * 100), uri.trim());
    setName("");
    setPrice("");
    setRoyalty("5");
    setUri("");
  }

  return (
    <div className="section-card">
      <h3>Register a game</h3>
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="g-name">Title</label>
          <input id="g-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Celadon Drift" />
        </div>
        <div className="form-field">
          <label htmlFor="g-price">Price (KEY)</label>
          <input id="g-price" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="300" />
        </div>
        <div className="form-field">
          <label htmlFor="g-royalty">Royalty (%)</label>
          <input id="g-royalty" type="number" min="0" max="100" value={royalty} onChange={(e) => setRoyalty(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="g-uri">Metadata IPFS CID</label>
          <input id="g-uri" value={uri} onChange={(e) => setUri(e.target.value)} placeholder="ipfs://bafy… (Pinata upload in Priority 3)" />
        </div>
      </div>
      <div style={{ marginTop: 18 }}>
        <Button variant="primary" large disabled={!valid || pending} onClick={submit}>
          {pending ? <><span className="spinner" /> Deploying…</> : "Register game"}
        </Button>
      </div>
    </div>
  );
}
