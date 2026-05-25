/**
 * Store Page — "/store"
 *
 * Design reference: design-reference/pages/store.jsx
 * Design brief: Section 5.2
 *
 * Layout: Marquee strip (left 1/3) + Game gallery grid (right 2/3)
 * Data source: useGameStore().getGameCatalog() — on-chain game catalog
 * Click behavior: navigates to /store/[gameId] for detail page
 */

export default function StorePage() {
  return (
    <main style={{ paddingTop: "var(--navbar-height)" }}>
      <p style={{ padding: "2rem", color: "var(--text-secondary)" }}>
        🚧 Store page — implement from design-reference/pages/store.jsx
      </p>
    </main>
  );
}
