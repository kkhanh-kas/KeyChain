/**
 * Landing Page — "/"
 *
 * Design reference: design-reference/pages/landing.jsx
 * Design brief: Section 5.1
 *
 * Structure:
 *   Hero (Keychan mascot + tagline + CTA)
 *   → Feature highlights (Own · Trade · Activate · Earn)
 *   → How it works (Connect → Buy → Activate)
 *   → Footer
 *
 * No navbar on this page — the landing IS the entrance.
 * Navbar appears after user clicks "Enter Store →".
 */

export default function LandingPage() {
  return (
    <main>
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-display)",
          color: "var(--text-primary)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "var(--text-hero)", marginBottom: "1rem" }}>
            KeyChain
          </h1>
          <p
            style={{
              fontSize: "var(--text-xl)",
              color: "var(--text-secondary)",
            }}
          >
            Every license is a key. Every transfer is on-chain.
          </p>
          <p
            style={{
              marginTop: "2rem",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-body)",
            }}
          >
            🚧 Frontend scaffold — implement from design-reference/pages/landing.jsx
          </p>
        </div>
      </section>
    </main>
  );
}
