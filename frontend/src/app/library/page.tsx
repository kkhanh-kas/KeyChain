/**
 * Library Page — "/library"
 *
 * Design reference: design-reference/pages/library.jsx
 * Design brief: Section 5.4
 *
 * Layout: Vertical scroll of "ticket cards" (boarding pass metaphor)
 * Data source: useGameToken().getOwnedLicenses(walletAddress)
 * Actions: activate(), resell(), viewOnChain()
 *
 * Status badges: active (green), inactive (gray), listed (blue)
 * Empty state: Keychan mascot + "No games in your library yet"
 */

export default function LibraryPage() {
  return (
    <main style={{ paddingTop: "var(--navbar-height)" }}>
      <p style={{ padding: "2rem", color: "var(--text-secondary)" }}>
        🚧 Library page — implement from design-reference/pages/library.jsx
      </p>
    </main>
  );
}
