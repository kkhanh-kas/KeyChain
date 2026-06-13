"use client";

// Register a new game on-chain. The cover image and metadata are uploaded to
// IPFS via Pinata first (see lib/pinata), and the resulting metadata CID is what
// goes on-chain. onSubmit's signature is unchanged so the page need not change.

import { useState } from "react";
import { Button } from "@/components/ui";
import { parseKey } from "@/lib/format";
import { uploadFile, uploadJson } from "@/lib/pinata";
import { useWallet } from "@/providers/WalletProvider";
import { useToast } from "@/providers/ToastProvider";
import type { GameMetadata } from "@/lib/ipfs";

interface RegisterGameFormProps {
  onSubmit: (name: string, price: bigint, royaltyBps: number, uri: string) => Promise<unknown>;
  pending: boolean;
}

export function RegisterGameForm({ onSubmit, pending }: RegisterGameFormProps) {
  const { address } = useWallet();
  const { push } = useToast();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [royalty, setRoyalty] = useState("5");
  const [genre, setGenre] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const valid = name && price && cover && Number(royalty) >= 0 && Number(royalty) <= 100;

  async function submit() {
    if (!cover) return;
    const royaltyBps = Math.round(Number(royalty) * 100);
    setUploading(true);
    try {
      const image = await uploadFile(cover);
      const metadata: GameMetadata = {
        name,
        description,
        image,
        attributes: { genre, vendor: address ?? "", royaltyBps },
      };
      const metadataUri = await uploadJson(metadata);
      await onSubmit(name, parseKey(price), royaltyBps, metadataUri);
      setName("");
      setPrice("");
      setRoyalty("5");
      setGenre("");
      setDescription("");
      setCover(null);
    } catch (err) {
      push({ type: "error", title: "Upload failed", msg: (err as Error).message });
    } finally {
      setUploading(false);
    }
  }

  const busy = uploading || pending;

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
          <label htmlFor="g-genre">Genre</label>
          <input id="g-genre" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Racing" />
        </div>
        <div className="form-field">
          <label htmlFor="g-cover">Cover image</label>
          <input id="g-cover" type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
        </div>
        <div className="form-field">
          <label htmlFor="g-desc">Description</label>
          <textarea id="g-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A quiet racer." />
        </div>
      </div>
      <div style={{ marginTop: 18 }}>
        <Button variant="primary" large disabled={!valid || busy} onClick={submit}>
          {uploading ? (
            <><span className="spinner" /> Uploading to IPFS…</>
          ) : pending ? (
            <><span className="spinner" /> Deploying…</>
          ) : (
            "Register game"
          )}
        </Button>
      </div>
    </div>
  );
}
