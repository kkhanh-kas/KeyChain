// Vendor Portal — separate, clean dashboard shell
function Vendor({ onExit }) {
  const [route, setRoute] = useState('dashboard');
  return (
    <div className="vendor page-shell">
      <aside className="vendor__side">
        <div className="vendor__brand">
          <Mascot size={26} />
          <div>KeyChain<br/><small>Vendor Portal</small></div>
        </div>
        {[
          ['dashboard', 'Dashboard'],
          ['register', 'Register Game'],
          ['revenue', 'Revenue Monitor'],
          ['catalog', 'My Catalog'],
          ['settings', 'Settings'],
        ].map(([id, label]) => (
          <button key={id} className={`vendor__link ${route === id ? 'active' : ''}`} onClick={() => setRoute(id)}>
            {label}
          </button>
        ))}
        <div style={{ marginTop: 'auto', paddingTop: 24, borderTop: '1px solid var(--border)', marginTop: 24 }}>
          <button className="vendor__link" onClick={onExit}>← Back to KeyChain</button>
        </div>
      </aside>
      <main className="vendor__main">
        {route === 'dashboard' && <VendorDashboard/>}
        {route === 'register' && <VendorRegister/>}
        {route === 'revenue' && <VendorRevenue/>}
        {route === 'catalog' && <VendorCatalog/>}
        {route === 'settings' && (
          <>
            <div className="vendor__head"><h1 className="vendor__h1">Settings</h1></div>
            <div className="section-card"><h3>Studio profile</h3><p style={{ color: 'var(--text-secondary)' }}>Coming soon. Settings live here when implemented.</p></div>
          </>
        )}
      </main>
    </div>
  );
}

function VendorDashboard() {
  return (
    <>
      <div className="vendor__head">
        <div>
          <div className="section-marker">Studio · Bell Tower Games</div>
          <h1 className="vendor__h1" style={{ marginTop: 8 }}>Good afternoon.</h1>
        </div>
        <div className="eyebrow">Last sync · 2 min ago</div>
      </div>
      <div className="kpi-grid">
        <div className="kpi"><div className="kpi__label">Sales · 30d</div><div className="kpi__val">128</div><div className="kpi__delta">+14% vs prev</div></div>
        <div className="kpi"><div className="kpi__label">Revenue · 30d</div><div className="kpi__val">68.2k <small style={{ fontSize: 14, fontFamily: 'var(--font-mono)' }}>KEY</small></div><div className="kpi__delta">+9%</div></div>
        <div className="kpi"><div className="kpi__label">Royalties · 30d</div><div className="kpi__val">4.8k <small style={{ fontSize: 14, fontFamily: 'var(--font-mono)' }}>KEY</small></div><div className="kpi__delta">+22%</div></div>
        <div className="kpi"><div className="kpi__label">Active titles</div><div className="kpi__val">3</div><div className="kpi__delta" style={{ color: 'var(--text-secondary)' }}>—</div></div>
      </div>

      <div className="section-card">
        <h3>Recent transactions</h3>
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Game</th>
                <th>Buyer</th>
                <th>Amount</th>
                <th>Tx</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Primary sale', 'Crow & Crown', '0x9af2…01ce', '540 KEY', '0xa12b…ff80', '12 min ago'],
                ['Resale royalty', 'Marble Provinces', '0x71d4…22ab', '+72 KEY', '0xb44c…1a90', '38 min ago'],
                ['Primary sale', 'Crow & Crown', '0x4e80…aaa9', '540 KEY', '0xc01a…bb02', '2 h ago'],
                ['Resale royalty', 'Crow & Crown', '0x88aa…1f23', '+54 KEY', '0xd9b1…7777', '4 h ago'],
                ['Primary sale', 'Marble Provinces', '0xa01c…cd34', '720 KEY', '0xe120…be12', '6 h ago'],
              ].map((row, i) => (
                <tr key={i}>
                  <td>{row[0]}</td>
                  <td style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{row[1]}</td>
                  <td className="mono">{row[2]}</td>
                  <td className="num">{row[3]}</td>
                  <td className="mono">{row[4]}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{row[5]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function VendorRegister() {
  const [price, setPrice] = useState(420);
  const [royalty, setRoyalty] = useState(8);
  return (
    <>
      <div className="vendor__head"><h1 className="vendor__h1">Register Game</h1></div>
      <div className="section-card">
        <h3>Title metadata</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <Field label="Game title" placeholder="The Iron Garden"/>
          <Field label="Genre" placeholder="Action"/>
          <Field label="Studio" placeholder="Bronze Foundry"/>
          <Field label="IPFS cover (CID)" placeholder="bafybeigdyrz…" mono/>
          <Field label="IPFS metadata (CID)" placeholder="bafkreigh2akiscai…" mono full/>
          <Field label="Description" multiline placeholder="A short editorial about the game…" full/>
        </div>
      </div>
      <div className="section-card">
        <h3>Economics</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>List price · KEY</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <input type="range" min="50" max="2000" step="10" value={price} onChange={e => setPrice(+e.target.value)} style={{ flex: 1 }}/>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--accent-primary)' }}>{price}</span>
            </div>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Resale royalty · %</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <input type="range" min="0" max="20" step="1" value={royalty} onChange={e => setRoyalty(+e.target.value)} style={{ flex: 1 }}/>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--accent-primary)' }}>{royalty}%</span>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
          <button className="btn btn-primary btn-lg">Deploy to Sepolia</button>
          <button className="btn btn-secondary btn-lg">Save Draft</button>
        </div>
      </div>
    </>
  );
}

function VendorRevenue() {
  return (
    <>
      <div className="vendor__head"><h1 className="vendor__h1">Revenue Monitor</h1></div>
      <div className="kpi-grid">
        <div className="kpi"><div className="kpi__label">Lifetime sales</div><div className="kpi__val">1,824</div></div>
        <div className="kpi"><div className="kpi__label">Lifetime revenue</div><div className="kpi__val">912k <small style={{ fontSize: 14, fontFamily: 'var(--font-mono)' }}>KEY</small></div></div>
        <div className="kpi"><div className="kpi__label">Avg royalty</div><div className="kpi__val">8.4%</div></div>
        <div className="kpi"><div className="kpi__label">Last withdrawal</div><div className="kpi__val">May 12</div></div>
      </div>
      <div className="section-card">
        <h3>Revenue (last 12 weeks)</h3>
        <RevenueChart/>
      </div>
    </>
  );
}

function VendorCatalog() {
  const titles = [
    { title: 'Crow & Crown', price: 540, royalty: 10, sales: 612, status: 'Active' },
    { title: 'Marble Provinces', price: 720, royalty: 12, sales: 488, status: 'Active' },
    { title: 'Quiet Calligraphy Club', price: 180, royalty: 5, sales: 724, status: 'Active' },
  ];
  return (
    <>
      <div className="vendor__head"><h1 className="vendor__h1">My Catalog</h1></div>
      <div className="data-table">
        <table>
          <thead>
            <tr><th>Title</th><th>Price</th><th>Royalty</th><th>Sales</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {titles.map((t, i) => (
              <tr key={i}>
                <td style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>{t.title}</td>
                <td className="num">{t.price} KEY</td>
                <td>{t.royalty}%</td>
                <td className="mono">{t.sales}</td>
                <td><span style={{ color: 'var(--success)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>● {t.status}</span></td>
                <td><button className="btn btn-ghost">Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Field({ label, placeholder, mono, full, multiline }) {
  const wrap = { gridColumn: full ? '1 / -1' : 'auto' };
  return (
    <div style={wrap}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>{label}</div>
      {multiline ? (
        <textarea placeholder={placeholder} rows={3}
          style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-primary)', color: 'var(--text-primary)', resize: 'vertical', fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)' }}/>
      ) : (
        <input placeholder={placeholder}
          style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)' }}/>
      )}
    </div>
  );
}

function RevenueChart() {
  // simple inline bar/line chart
  const data = [12, 18, 14, 22, 26, 19, 28, 31, 24, 34, 38, 42];
  const max = Math.max(...data);
  const w = 720, h = 220, pad = 30;
  const stepX = (w - pad * 2) / (data.length - 1);
  const points = data.map((v, i) => [pad + i * stepX, h - pad - (v / max) * (h - pad * 2)]);
  const path = points.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }}>
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="var(--border)"/>
      {[0.25, 0.5, 0.75].map(t => (
        <line key={t} x1={pad} y1={h - pad - t * (h - pad * 2)} x2={w - pad} y2={h - pad - t * (h - pad * 2)} stroke="var(--border)" strokeDasharray="2 4" opacity="0.6"/>
      ))}
      <path d={path} stroke="var(--accent-primary)" strokeWidth="2" fill="none"/>
      <path d={`${path} L ${w - pad} ${h - pad} L ${pad} ${h - pad} Z`} fill="var(--accent-soft)"/>
      {points.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="4" fill="var(--bg-primary)" stroke="var(--accent-primary)" strokeWidth="2"/>
      ))}
      {data.map((_, i) => (
        <text key={i} x={pad + i * stepX} y={h - 8} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill="var(--text-secondary)">W{i+1}</text>
      ))}
    </svg>
  );
}

window.Vendor = Vendor;
