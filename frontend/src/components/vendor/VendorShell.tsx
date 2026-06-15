"use client";

// Vendor portal shell: a left sidebar with its own brand and section nav, plus
// the main content slot. Separate from the user-facing Navbar by design.
// Design reference: design-reference/pages/vendor.jsx

import Link from "next/link";
import { Mascot } from "@/components/Mascot";

export type VendorView = "dashboard" | "register" | "catalog";

const NAV: { id: VendorView; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "register", label: "Register Game" },
  { id: "catalog", label: "My Catalog" },
];

interface VendorShellProps {
  active: VendorView;
  onSelect: (view: VendorView) => void;
  children: React.ReactNode;
}

export function VendorShell({ active, onSelect, children }: VendorShellProps) {
  return (
    <div className="vendor page-shell">
      <aside className="vendor__side">
        <Link href="/store" className="vendor__brand">
          <Mascot size={24} />
          <span>KeyChain<small>Vendor Portal</small></span>
        </Link>
        {NAV.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`vendor__link ${active === item.id ? "active" : ""}`}
            onClick={() => onSelect(item.id)}
          >
            {item.label}
          </button>
        ))}
        <Link href="/store" className="vendor__link vendor__link--exit">← Back to KeyChain</Link>
      </aside>
      <main className="vendor__main">{children}</main>
    </div>
  );
}
