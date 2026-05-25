/**
 * Marketplace Page — "/marketplace"
 *
 * Design reference: design-reference/pages/store.jsx (Marketplace component)
 * Design brief: Section 5.5
 *
 * Layout: Grid of resale listing cards
 * Data source: useMarketplace().getListings()
 * Actions: buyLicense() with automatic royalty distribution
 *
 * Each listing shows: game cover, asking price, seller address,
 * original price vs asking price, royalty % transparent
 */

export default function MarketplacePage() {
  return (
    <main style={{ paddingTop: "var(--navbar-height)" }}>
      <p style={{ padding: "2rem", color: "var(--text-secondary)" }}>
        🚧 Marketplace page — implement from design reference
      </p>
    </main>
  );
}
