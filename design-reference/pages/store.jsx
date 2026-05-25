// Store + Game Detail + Marketplace
function GameCard({ game, paletteIdx, onOpen, resale, addPrice, addSeller }) {
  const cover = window.KC_COVERS.getCover(game.art, paletteIdx);
  const displayPrice = addPrice ?? game.price;
  return (
    <div className="game-card" onClick={() => onOpen(game)}>
      {resale && <span className="game-card__badge game-card__badge--resale">Resale</span>}
      <div className="game-card__cover" style={{ backgroundImage: `url("${cover}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}/>
      <div className="game-card__overlay">
        <div className="game-card__meta">
          <span className="mono">{game.genre.toUpperCase()}</span>
          {resale && <span>· seller {addSeller}</span>}
        </div>
        <div className="game-card__title">{game.title}</div>
        <div className="game-card__price">
          <span className="game-card__price-val">{displayPrice} KEY</span>
          <span className="game-card__cta">View <Icon.arrow/></span>
        </div>
      </div>
    </div>
  );
}

function Marquee() {
  // Two copies of the same set so the loop is seamless.
  const games = window.KC_DATA.GAMES;
  const items = [...games, ...games];
  return (
    <aside className="marquee">
      <div className="marquee__head">
        <span>NOW SHOWING</span>
        <span>青花 · GALLERY</span>
      </div>
      <div className="marquee__track">
        {items.map((g, i) => (
          <div className="marquee__item" key={i}
            style={{ backgroundImage: `url("${window.KC_COVERS.getCover(g.art, i)}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}/>
        ))}
      </div>
    </aside>
  );
}

function Store({ onOpen, search }) {
  const [filter, setFilter] = useState('All');
  const games = window.KC_DATA.GAMES;
  const genres = ['All', ...Array.from(new Set(games.map(g => g.genre)))];
  const filtered = games.filter(g => (filter === 'All' || g.genre === filter) && (
    !search || g.title.toLowerCase().includes(search.toLowerCase()) || g.vendor.toLowerCase().includes(search.toLowerCase())
  ));

  return (
    <div className="store page-shell">
      <Marquee/>
      <main className="store__main">
        <div className="store__head">
          <div>
            <div className="section-marker">The Gallery</div>
            <h1 className="store__title" style={{ marginTop: 12 }}>Store.</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: 8, maxWidth: 560 }}>
              A short, curated shelf. Every cover is the work of its studio. Hover for the price; click for the story.
            </p>
          </div>
          <div className="store__filters">
            {genres.map(g => (
              <button key={g} className={`chip ${filter === g ? 'chip--active' : ''}`} onClick={() => setFilter(g)}>{g}</button>
            ))}
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="empty">
            <Mascot variant="line" size={140}/>
            <div className="empty__title">Keychan looked everywhere.</div>
            <div className="empty__msg">Nothing found for "{search}". Try a different name.</div>
          </div>
        ) : (
          <div className="gallery">
            {filtered.map((g, i) => <GameCard key={g.id} game={g} paletteIdx={i} onOpen={onOpen}/>)}
          </div>
        )}
      </main>
    </div>
  );
}

function GameDetail({ game, onBack, onBuy, owned }) {
  const cover = window.KC_COVERS.getCover(game.art, game.id.charCodeAt(1));
  const { wallet } = useWallet();
  const [buying, setBuying] = useState(false);
  const canBuy = wallet.state === 'connected' && wallet.keyBalance >= game.price && !owned;

  function buy() {
    setBuying(true);
    setTimeout(() => {
      onBuy(game);
      setBuying(false);
    }, 1200);
  }

  return (
    <div className="detail page-shell">
      <a className="detail__back" onClick={onBack}><Icon.back/> Back to store</a>
      <div className="detail__hero">
        <div className="detail__cover" style={{ backgroundImage: `url("${cover}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}/>
        <div className="detail__info">
          <span className="detail__genre">{game.genre} · {game.vendor}</span>
          <h1 className="detail__title">{game.title}</h1>
          <p className="detail__desc lead">{game.blurb}</p>
          <div className="divider-bar"/>
          <p className="detail__desc">{game.desc}</p>

          <div className="detail__buybar">
            <div>
              <div className="detail__price-label">List price</div>
              <div className="detail__price">{game.price}<small>KEY</small></div>
              <div className="eyebrow" style={{ marginTop: 4 }}>Includes {game.royalty}% royalty to {game.vendor}</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary btn-lg" onClick={onBack}>Cancel</button>
              {owned
                ? <button className="btn btn-primary btn-lg" disabled>Owned in Library</button>
                : <button className="btn btn-primary btn-lg" disabled={!canBuy || buying} onClick={buy}>
                    {buying ? <><span className="spinner"/> Confirming…</> : <>Buy Now · {game.price} KEY</>}
                  </button>}
            </div>
          </div>

          <div className="detail__meta-grid">
            <div className="detail__meta">
              <div className="detail__meta-label">Token Standard</div>
              <div className="detail__meta-val">ERC-721 · ERC-2981</div>
            </div>
            <div className="detail__meta">
              <div className="detail__meta-label">License Type</div>
              <div className="detail__meta-val serif">Perpetual</div>
            </div>
            <div className="detail__meta">
              <div className="detail__meta-label">Token Suffix</div>
              <div className="detail__meta-val">#{game.tokenSuffix}</div>
            </div>
            <div className="detail__meta">
              <div className="detail__meta-label">Royalty</div>
              <div className="detail__meta-val">{game.royalty}% to vendor</div>
            </div>
            <div className="detail__meta">
              <div className="detail__meta-label">IPFS Metadata</div>
              <div className="detail__meta-val">ipfs://bafybe…{game.tokenSuffix}</div>
            </div>
            <div className="detail__meta">
              <div className="detail__meta-label">Network</div>
              <div className="detail__meta-val">Sepolia · ChainID 11155111</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Marketplace({ onOpen, search }) {
  const listings = window.KC_DATA.MARKETPLACE_LISTINGS.filter(g =>
    !search || g.title.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="store page-shell" style={{ gridTemplateColumns: '1fr' }}>
      <main className="store__main">
        <div className="store__head">
          <div>
            <div className="section-marker">Second-hand Wing</div>
            <h1 className="store__title" style={{ marginTop: 12 }}>Marketplace.</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: 8, maxWidth: 620 }}>
              Licenses listed by other holders. Each resale pays a royalty to the original studio. Prices float; the keys are real.
            </p>
          </div>
          <div className="store__filters">
            <span className="chip chip--active">All</span>
            <span className="chip">Under 300 KEY</span>
            <span className="chip">Newest</span>
            <span className="chip">Lowest royalty</span>
          </div>
        </div>
        {listings.length === 0 ? (
          <div className="empty">
            <Mascot variant="line" size={140}/>
            <div className="empty__title">Nothing listed for resale.</div>
            <div className="empty__msg">When holders list a game, it'll appear here. Check back in a bit.</div>
          </div>
        ) : (
          <div className="gallery" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {listings.map((g, i) => <GameCard key={g.listingId} game={g} paletteIdx={i + 3} onOpen={onOpen} resale addPrice={g.askPrice} addSeller={g.seller}/>)}
          </div>
        )}
      </main>
    </div>
  );
}

Object.assign(window, { Store, GameDetail, Marketplace });
