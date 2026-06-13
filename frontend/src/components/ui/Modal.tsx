"use client";

// Modal primitive: renders nothing when closed. Clicking the backdrop closes it;
// clicks inside the panel are stopped from bubbling.

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;
  return (
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
    </div>
  );
}
