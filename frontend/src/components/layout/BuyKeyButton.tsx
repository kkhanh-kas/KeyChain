"use client";

// Wallet KEY balance chip + a modal to buy KEY with ETH. Without this there is
// no way to acquire KEY in the app, so every purchase reverts with
// ERC20InsufficientBalance. Uses the existing useKeyCoin hook.

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui";
import { useKeyCoin } from "@/hooks/useKeyCoin";
import { formatKey } from "@/lib/format";

export function BuyKeyButton() {
  const { balance, buyKeyCoin, pending } = useKeyCoin();
  const [open, setOpen] = useState(false);
  const [eth, setEth] = useState("");

  const valid = Number(eth) > 0;

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
        <div className="form-field">
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
