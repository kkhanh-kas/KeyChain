// Library — boarding pass tickets

function Barcode({ count = 38, h = 32 }) {
  const widths = [];
  for (let i = 0; i < count; i++) {
    const w = 1 + Math.round((Math.sin(i * 1.7) * 0.5 + 0.5) * 3);
    widths.push(w);
  }
  return (
    <div className="ticket__barcode" style={{ height: h }}>
      {widths.map((w, i) => <span key={i} style={{ width: w, opacity: i % 5 === 0 ? 1 : 0.85 }}/>)}
    </div>
  );
}

function Ticket({ item, onActivate, onResell, onCancelListing, onOpen }) {
  const cover = window.KC_COVERS.getCover(item.art, item.id.charCodeAt(1));
  const status = item.status; // active | inactive | listed

  return (
    <article className="ticket">
      <div className="ticket__main">
        <div className="ticket__cover" style={{ backgroundImage: `url("${cover}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}/>
        <div className="ticket__details">
          <div className="ticket__genre">{item.genre.toUpperCase()} · {item.vendor}</div>
          <div className="ticket__game-title">{item.title}</div>
          <div className="ticket__meta-row">
            <div className="ticket__meta-item">
              <div className="ticket__meta-key">Purchase Date</div>
              <div className="ticket__meta-val">{item.purchaseDate}</div>
            </div>
            <div className="ticket__meta-item">
              <div className="ticket__meta-key">Token ID</div>
              <div className="ticket__meta-val">{item.tokenId}</div>
            </div>
            <div className="ticket__meta-item">
              <div className="ticket__meta-key">License</div>
              <div className="ticket__meta-val">{item.license}</div>
            </div>
            {status === 'active' && (
              <div className="ticket__meta-item">
                <div className="ticket__meta-key">Bound to</div>
                <div className="ticket__meta-val" style={{ color: 'var(--success)' }}>{item.machineHash}</div>
              </div>
            )}
            {status === 'listed' && (
              <div className="ticket__meta-item">
                <div className="ticket__meta-key">Listed at</div>
                <div className="ticket__meta-val" style={{ color: 'var(--accent-primary)' }}>{item.askPrice} KEY</div>
              </div>
            )}
          </div>
          <div className="ticket__actions">
            {status === 'inactive' && (
              <>
                <button className="btn btn-primary" onClick={() => onActivate(item)}>Activate</button>
                <button className="btn btn-secondary" onClick={() => onResell(item)}>Resell</button>
              </>
            )}
            {status === 'active' && (
              <>
                <button className="btn btn-primary" disabled>✓ Activated</button>
                <button className="btn btn-secondary" onClick={() => onResell(item)}>Resell</button>
              </>
            )}
            {status === 'listed' && (
              <>
                <button className="btn btn-primary" onClick={() => onActivate(item)}>Activate</button>
                <button className="btn btn-danger" onClick={() => onCancelListing(item)}>Cancel Listing</button>
              </>
            )}
            <button className="btn btn-ghost" onClick={() => onOpen(item)}>View on chain <Icon.external/></button>
          </div>
        </div>

        <span className={`ticket__status ticket__status--${status}`}>
          <span className="ticket__status-dot"/>
          {status === 'active' ? 'Active' : status === 'listed' ? 'Listed' : 'Inactive'}
        </span>
      </div>

      <div className="ticket__stub">
        <div>
          <div className="ticket__stub-row">
            <span>Boarding Pass</span>
            <strong className="ticket__stub-no">№ {item.tokenId.replace('#', '')}</strong>
          </div>
          <div className="ticket__stub-row">
            <span>Gate</span>
            <strong>Sepolia Testnet</strong>
          </div>
          <div className="ticket__stub-row">
            <span>Class</span>
            <strong>{item.license}</strong>
          </div>
        </div>
        <Barcode/>
        <div className="ticket__stub-row" style={{ marginBottom: 0 }}>
          <span>Passenger</span>
          <strong>0x1234…5678</strong>
        </div>
      </div>
    </article>
  );
}

function Library({ items, onActivate, onResell, onCancelListing, onOpen, onGotoStore }) {
  if (!items.length) {
    return (
      <div className="library page-shell">
        <div className="empty">
          <Mascot variant="line" size={160}/>
          <div className="empty__title">No games yet.</div>
          <div className="empty__msg">Your collection starts at the Store.</div>
          <button className="btn btn-primary btn-lg" onClick={onGotoStore}>Visit the Store <Icon.arrow/></button>
        </div>
      </div>
    );
  }
  return (
    <div className="library page-shell">
      <div className="library__head">
        <div>
          <div className="section-marker">Your Library</div>
          <h1 className="library__title" style={{ marginTop: 12 }}>Tickets.</h1>
        </div>
        <div className="library__count">{items.length} owned · {items.filter(i => i.status === 'active').length} active</div>
      </div>
      {items.map(item => (
        <Ticket key={item.tokenId} item={item}
          onActivate={onActivate} onResell={onResell}
          onCancelListing={onCancelListing} onOpen={onOpen}/>
      ))}
    </div>
  );
}

window.Library = Library;
