"use client";

// Wallet KEY balance chip + a modal to buy KEY with ETH. Without this there is
// no way to acquire KEY in the app, so every purchase reverts with
// ERC20InsufficientBalance. Shows the current balance, quick ETH presets, and a
// live estimate of KEY received (from the on-chain rate).

import { useState } from "react";
import { parseEther } from "ethers";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui";
import { useKeyCoin } from "@/hooks/useKeyCoin";
import { formatKey } from "@/lib/format";

const PRESETS = ["0.01", "0.05", "0.1"];

export function BuyKeyButton() {
  const { balance, rate, buyKeyCoin, pending } = useKeyCoin();
  const [open, setOpen] = useState(false);
  const [eth, setEth] = useState("");

  const valid = Number(eth) > 0;

  // KEY received = ETH (wei) * rate. Guard parseEther against bad input.
  let estimate = BigInt(0);
  if (valid && rate > BigInt(0)) {
    try {
      estimate = parseEther(eth) * rate;
    } catch {
      estimate = BigInt(0);
    }
  }

  async function buy() {
    await buyKeyCoin(eth);
    setEth("");
    setOpen(false);
  }

  return (
    <>
      <button type="button" className="wallet-btn" onClick={() => setOpen(true)}>
        {formatKey(balance)} KEY
        <span className="key-buy-plus">+</span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Buy KEY">
        <div className="buykey-stat">
          <span>Current balance</span>
          <strong>{formatKey(balance)} KEY</strong>
        </div>

        <div className="form-field" style={{ marginTop: 16 }}>
          <label htmlFor="buy-eth">Amount of ETH to spend</label>
          <input
            id="buy-eth"
            type="number"
            min="0"
            step="0.001"
            value={eth}
            onChange={(e) => setEth(e.target.value)}
            placeholder="0.01"
          />
        </div>

        <div className="buykey-presets">
          {PRESETS.map((p) => (
            <button
              type="button"
              key={p}
              className={`chip ${eth === p ? "chip--active" : ""}`}
              onClick={() => setEth(p)}
            >
              {p} ETH
            </button>
          ))}
        </div>

        {estimate > BigInt(0) && (
          <div className="buykey-stat" style={{ marginTop: 14 }}>
            <span>You receive</span>
            <strong>≈ {formatKey(estimate)} KEY</strong>
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          <Button variant="primary" large disabled={!valid || pending} onClick={buy}>
            {pending ? (
              <><span className="spinner" /> Buying…</>
            ) : (
              "Buy KEY"
            )}
          </Button>
        </div>
      </Modal>
    </>
  );
}
