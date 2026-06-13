"use client";

// App navbar: brand, route tabs, search, theme toggle, and the wallet button
// whose appearance follows useWallet().status. Ported from
// design-reference/components/shell.jsx to Next routing.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mascot } from "@/components/Mascot";
import { useWallet } from "@/providers/WalletProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { truncateAddress } from "@/lib/format";

const TABS = [
  { href: "/store", label: "Store" },
  { href: "/library", label: "Library" },
  { href: "/marketplace", label: "Marketplace" },
];

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { status, address, switchNetwork, connect } = useWallet();

  // Landing is the entrance and the Vendor portal has its own shell; no navbar.
  if (pathname === "/" || pathname.startsWith("/vendor")) return null;

  return (
    <nav className="navbar">
      <Link href="/store" className="navbar__brand">
        <Mascot size={32} />
        <span>KeyChain</span>
      </Link>

      <div className="navbar__tabs">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`navbar__tab ${active ? "navbar__tab--active" : ""}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <div className="navbar__right">
        <div className="navbar__search">
          <input placeholder="Search games, vendors, tokens…" />
        </div>

        {status === "disconnected" && (
          <button type="button" className="wallet-btn" onClick={connect}>
            Connect Wallet
          </button>
        )}
        {status === "connecting" && (
          <button type="button" className="wallet-btn" disabled>
            <span className="spinner" /> Connecting…
          </button>
        )}
        {status === "connected" && address && (
          <span className="wallet-btn connected">
            <span className="wallet-dot" />
            {truncateAddress(address)}
          </span>
        )}
        {status === "wrong-network" && (
          <button type="button" className="wallet-btn wrong" onClick={switchNetwork}>
            <span className="wallet-dot" />
            Switch network
          </button>
        )}

        <button type="button" className="icon-btn" aria-label="Toggle theme" onClick={toggleTheme}>
          {theme === "light" ? <MoonIcon /> : <SunIcon />}
        </button>
      </div>
    </nav>
  );
}
