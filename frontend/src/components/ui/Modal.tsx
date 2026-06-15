"use client";

// Modal primitive: renders nothing when closed. Clicking the backdrop closes it;
// clicks inside the panel are stopped from bubbling. Rendered through a portal to
// document.body so a fixed-position backdrop covers the whole viewport even when
// the trigger lives inside a transformed/filtered ancestor (e.g. the navbar).

import { useEffect } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {title ? (
          <div className="modal__head">
            <span className="modal__title">{title}</span>
            <button
              type="button"
              className="modal__close"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        ) : null}
        <div className="modal__body">{children}</div>
      </div>
    </div>,
    document.body
  );
}
