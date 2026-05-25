/**
 * Vendor Portal — "/vendor"
 *
 * Design reference: design-reference/pages/vendor.jsx
 * Design brief: Section 5.6
 *
 * Separate shell — no shared navbar with user-facing pages
 * Layout: Sidebar nav + main content area
 *
 * Sections:
 *   - Dashboard: revenue overview, total sales
 *   - Game Management: register new game, edit existing
 *   - Revenue: per-game breakdown, royalty income
 *
 * Access control: requires VENDOR_ROLE on-chain
 * Data source: useGameStore() for catalog, contract events for revenue
 */

export default function VendorPage() {
  return (
    <main>
      <p style={{ padding: "2rem", color: "var(--text-secondary)" }}>
        🚧 Vendor portal — implement from design-reference/pages/vendor.jsx
      </p>
    </main>
  );
}
