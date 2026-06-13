"use client";

// Landing — the entrance (no navbar). Celestial hero + features + how-it-works
// + tech stack + footer, wired to the global theme, real wallet, and router.
// Design reference: design-reference/pages/landing.jsx

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/providers/ThemeProvider";
import { useWallet } from "@/providers/WalletProvider";
import { Mascot } from "@/components/Mascot";
import { CelestialBackground } from "@/components/landing/CelestialBackground";

const FEATURES = [
  { title: "Own", subtitle: "True Digital Ownership", desc: "Every game license is an NFT on Ethereum. You own it — not the platform, not the publisher. Your key, your game, forever.", symbol: "◆" },
  { title: "Trade", subtitle: "Secondary Market", desc: "Resell your games on the open marketplace. Royalties are automatically distributed to developers through ERC-2981.", symbol: "◇" },
  { title: "Activate", subtitle: "Hardware-Bound Licenses", desc: "Bind your license to your machine with on-chain activation. Cryptographic proof that you own what you play.", symbol: "▣" },
  { title: "Earn", subtitle: "Automatic Royalties", desc: "Developers earn from every resale. Smart contracts handle the math. No middleman, no dispute, no delay.", symbol: "◈" },
];

const STEPS = [
  { num: "01", label: "Connect", desc: "A MetaMask wallet on Sepolia testnet. No account, no email." },
  { num: "02", label: "Browse", desc: "A gallery of games. Hover for the title and price. Click for the story." },
  { num: "03", label: "Buy", desc: "A single transaction. KEY leaves your wallet, a ticket arrives in your library." },
  { num: "04", label: "Play (or resell)", desc: "Activate the license to bind it, or list it on the Marketplace." },
];

const TECH = ["Ethereum", "Solidity", "Hardhat", "OpenZeppelin", "Next.js", "TypeScript", "ethers.js", "MetaMask", "ERC-1155", "ERC-2981", "ERC-20", "IPFS", "Sepolia Testnet", "TailwindCSS"];

export default function LandingPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { status, connect } = useWallet();
  const isDark = theme === "dark";

  const palette = {
    bg: isDark ? "#0D0D0D" : "#F5F2ED",
    bgSecondary: isDark ? "#1A1A1A" : "#EDEAE5",
    text: isDark ? "#EAEEF7" : "#2A4A82",
    textSecondary: isDark ? "#9AA6C0" : "#7384A8",
    accent: isDark ? "#3B82F6" : "#1E3A8A",
    border: isDark ? "#333333" : "#D4D0CB",
    faint: isDark ? "#F5F2ED" : "#1A1A1A",
  };

  // Reveal sections as they scroll into view.
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const refs = useRef<Record<string, HTMLElement | null>>({});
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setVisible((p) => ({ ...p, [e.target.id]: true }))),
      { threshold: 0.12 }
    );
    Object.values(refs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);
  const reveal = (id: string) => ({
    opacity: visible[id] ? 1 : 0,
    transform: visible[id] ? "translateY(0)" : "translateY(30px)",
    transition: "opacity 0.8s ease-out, transform 0.8s ease-out",
  });

  return (
    <div style={{ color: palette.text, minHeight: "100vh", overflowX: "hidden", position: "relative" }}>
      <CelestialBackground accent={palette.accent} border={palette.border} faint={palette.faint} isDark={isDark} />

      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle theme"
        style={{
          position: "fixed", top: 28, right: 28, zIndex: 100, width: 44, height: 44, borderRadius: "50%",
          border: `1.5px solid ${palette.border}`, background: isDark ? "#252525" : "#FFFFFF", color: palette.text,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
        }}
      >
        {isDark ? "☀" : "☾"}
      </button>

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* HERO */}
        <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "60px 24px 100px", textAlign: "center" }}>
          <div style={{ animation: "kc-fadeInUp 0.8s ease-out both", animationDelay: "0.2s", display: "flex", alignItems: "center", gap: 12, marginBottom: 40, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: palette.textSecondary }}>
            <span style={{ width: 32, height: 1, background: palette.accent, opacity: 0.6 }} />
            Decentralized Game Licensing
            <span style={{ width: 32, height: 1, background: palette.accent, opacity: 0.6 }} />
          </div>

          <div style={{ animation: "kc-fadeInUp 1s ease-out both", animationDelay: "0.4s", color: palette.accent }}>
            <div style={{ animation: "kc-float 6s ease-in-out infinite" }}>
              <Mascot size={160} />
            </div>
          </div>

          <h1 style={{ animation: "kc-fadeInUp 1s ease-out both", animationDelay: "0.6s", fontFamily: "var(--font-display)", fontSize: "clamp(56px, 10vw, 130px)", fontWeight: 900, lineHeight: 0.92, letterSpacing: "-0.02em", margin: "24px 0 0" }}>
            <span style={{ display: "block" }}>Key</span>
            <span style={{ display: "block", color: palette.accent }}>Chain</span>
          </h1>

          <p style={{ animation: "kc-fadeInUp 1s ease-out both", animationDelay: "0.8s", fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "clamp(16px, 2.2vw, 22px)", color: palette.textSecondary, marginTop: 28, maxWidth: 500, lineHeight: 1.7 }}>
            Every license is a key.<br />Every transfer is on-chain.
          </p>

          <div style={{ animation: "kc-fadeInUp 1s ease-out both", animationDelay: "1s", display: "flex", gap: 16, marginTop: 44, flexWrap: "wrap", justifyContent: "center" }}>
            <button type="button" className="btn btn-primary btn-lg" onClick={() => router.push("/store")}>Enter Store →</button>
            <button
              type="button"
              className="btn btn-secondary btn-lg"
              onClick={status === "disconnected" ? connect : undefined}
              disabled={status !== "disconnected"}
            >
              {status === "disconnected" ? "Connect Wallet" : status === "connecting" ? "Connecting…" : "✓ Wallet Connected"}
            </button>
          </div>
        </section>

        {/* DIVIDER */}
        <div style={{ display: "flex", justifyContent: "center", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, maxWidth: 600, width: "100%" }}>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${palette.border})` }} />
            <div style={{ color: palette.accent, opacity: 0.5, fontSize: 10, letterSpacing: "0.3em" }}>✦ ◇ ✦</div>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${palette.border})` }} />
          </div>
        </div>

        {/* FEATURES */}
        <section id="features" ref={(el) => { refs.current.features = el; }} style={{ ...reveal("features"), padding: "120px 24px", maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 72 }}>
            <div className="section-marker" style={{ justifyContent: "center", marginBottom: 16 }}>Core Principles</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 700 }}>What Makes KeyChain Different</h2>
            <p style={{ color: palette.textSecondary, maxWidth: 480, margin: "16px auto 0", lineHeight: 1.7 }}>
              A game store built on transparency, ownership, and fairness — powered by Ethereum smart contracts.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={{ background: palette.bgSecondary, border: `1px solid ${palette.border}`, borderRadius: 14, padding: "32px 24px" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: palette.accent, marginBottom: 14, opacity: 0.6 }}>{f.symbol}</div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{f.title}</h3>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: palette.accent, letterSpacing: "0.1em", textTransform: "uppercase" }}>{f.subtitle}</span>
                <p style={{ color: palette.textSecondary, fontSize: 14, lineHeight: 1.7, marginTop: 14 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* MARQUEE */}
        <div style={{ overflow: "hidden", padding: "44px 0", borderTop: `1px solid ${palette.border}`, borderBottom: `1px solid ${palette.border}` }}>
          <div style={{ display: "flex", animation: "kc-marquee 22s linear infinite", whiteSpace: "nowrap" }}>
            {[...Array(3)].map((_, gi) => (
              <div key={gi} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                {["OWN", "TRADE", "ACTIVATE", "EARN", "KEYCHAIN"].map((word, i) => (
                  <span key={`${gi}-${i}`} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 900, color: i === 4 ? palette.accent : palette.text, opacity: i === 4 ? 0.85 : 0.07, letterSpacing: "-0.02em", padding: "0 28px" }}>{word}</span>
                    <span style={{ color: palette.accent, opacity: 0.25, fontSize: 10, padding: "0 6px" }}>✦</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* HOW IT WORKS */}
        <section id="how" ref={(el) => { refs.current.how = el; }} style={{ ...reveal("how"), padding: "120px 24px", maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ marginBottom: 72, maxWidth: 600 }}>
            <div className="section-marker" style={{ marginBottom: 16 }}>How It Works</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 700, lineHeight: 1.1 }}>From a porcelain shelf<br />to your machine.</h2>
          </div>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", top: 28, left: "calc(12.5% + 28px)", right: "calc(12.5% + 28px)", borderTop: `2px dashed ${palette.border}` }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, position: "relative" }}>
              {STEPS.map((s) => (
                <div key={s.num} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", border: `1.5px solid ${palette.accent}`, background: palette.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: palette.accent, marginBottom: 20 }}>{s.num}</div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{s.label}</h3>
                  <p style={{ color: palette.textSecondary, fontSize: 14, lineHeight: 1.6, maxWidth: 220 }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TECH STACK */}
        <section id="tech" ref={(el) => { refs.current.tech = el; }} style={{ ...reveal("tech"), padding: "80px 24px 120px", maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div className="section-marker" style={{ justifyContent: "center", marginBottom: 16 }}>Built With</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700 }}>Technology Stack</h2>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10 }}>
            {TECH.map((t) => (
              <span key={t} style={{ fontFamily: "var(--font-mono)", fontSize: 12, padding: "8px 18px", border: `1px solid ${palette.border}`, borderRadius: 24, color: palette.textSecondary, background: palette.bgSecondary }}>{t}</span>
            ))}
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ borderTop: `1px solid ${palette.border}`, padding: "48px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div style={{ color: palette.accent, opacity: 0.35 }}><Mascot size={56} /></div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, letterSpacing: "0.1em" }}>KEYCHAIN</p>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 13, color: palette.textSecondary, marginTop: 6, fontStyle: "italic" }}>Every license is a key. Every transfer is on-chain.</p>
          </div>
          <div style={{ display: "flex", gap: 20, fontSize: 12, color: palette.textSecondary, fontFamily: "var(--font-mono)" }}>
            <span>Sepolia Testnet</span><span style={{ opacity: 0.3 }}>·</span><span>Research Prototype</span><span style={{ opacity: 0.3 }}>·</span><span>2026</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
