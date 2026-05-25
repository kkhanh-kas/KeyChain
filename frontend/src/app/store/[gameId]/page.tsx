/**
 * Game Detail Page — "/store/[gameId]"
 *
 * Design reference: design-reference/pages/store.jsx (GameDetail component)
 * Design brief: Section 5.3
 *
 * Layout: Editorial — hero cover art + game info + Buy Now CTA
 * Data source: useGameStore().getGameInfo(gameId)
 * Actions: purchaseLicense() → redirect to /library
 */

export default function GameDetailPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  return (
    <main style={{ paddingTop: "var(--navbar-height)" }}>
      <p style={{ padding: "2rem", color: "var(--text-secondary)" }}>
        🚧 Game detail page — implement from design-reference/pages/store.jsx (GameDetail)
      </p>
    </main>
  );
}
