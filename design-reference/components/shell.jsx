// Shared atoms — Navbar, ThemeToggle, Mascot, Toast region
const { useState, useEffect, useRef, useCallback, createContext, useContext } = React;

// ---- Mascot ----
// Inline SVG so currentColor / CSS color flow through (was PNG before).
function Mascot({ variant = 'filled', size = 80, style = {} }) {
  // variant kept for API compat — only one mascot now.
  return (
    <svg
      viewBox="0 0 280 660"
      style={{ height: size, width: 'auto', display: 'block', overflow: 'visible', ...style }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mascot"
      aria-label="Keychan">
      
      <g transform="translate(140, 0)" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 0,152 Q -26,150 -42,138 Q -56,124 -58,108 Q -60,90 -54,76 Q -46,60 -40,50 Q -36,38 -34,28 Q -32,22 -28,28 Q -24,38 -20,48 Q -14,58 -8,62 Q -3,65 0,66 Q 3,65 8,62 Q 14,58 20,48 Q 24,38 28,28 Q 32,22 34,28 Q 36,38 40,50 Q 46,60 54,76 Q 60,90 58,108 Q 56,124 42,138 Q 26,150 0,152 Z" strokeWidth="3" />
        <path d="M -8,149 Q 0,155 8,149" strokeWidth="1.5" opacity="0.35" />
        <path d="M -28,152 Q -52,138 -78,134 Q -108,130 -122,144 Q -138,160 -124,178 Q -110,194 -82,192 Q -56,188 -36,178 Q -24,168 -18,158" strokeWidth="2.8" />
        <path d="M -30,156 Q -48,148 -68,145 Q -90,142 -102,152 Q -114,164 -102,176 Q -88,186 -64,182 Q -44,176 -32,166" strokeWidth="1.2" opacity="0.4" />
        <path d="M 28,152 Q 52,138 78,134 Q 108,130 122,144 Q 138,160 124,178 Q 110,194 82,192 Q 56,188 36,178 Q 24,168 18,158" strokeWidth="2.8" />
        <path d="M 30,156 Q 48,148 68,145 Q 90,142 102,152 Q 114,164 102,176 Q 88,186 64,182 Q 44,176 32,166" strokeWidth="1.2" opacity="0.4" />
        <path d="M 0,146 Q 13,156 14,170 Q 14,184 7,196 Q 3,202 0,204 Q -3,202 -7,196 Q -14,184 -14,170 Q -13,156 0,146 Z" strokeWidth="2.5" />
        <path d="M 0,156 Q 6,163 6,173 Q 6,183 3,191 Q 1,195 0,196 Q -1,195 -3,191 Q -6,183 -6,173 Q -6,163 0,156 Z" strokeWidth="1" opacity="0.3" />
        <path d="M -5,204 Q -14,234 -18,266 Q -22,298 -14,324 Q -4,346 10,358 Q 18,368 15,388 Q 10,414 -2,438 Q -22,468 -40,498 Q -60,528 -52,556 Q -42,580 -20,590 Q 2,598 20,588 Q 36,576 38,556 Q 38,538 26,528 Q 12,520 2,532 Q -8,546 -2,564 Q 4,580 18,583" strokeWidth="2.8" />
        <path d="M 5,204 Q 14,234 18,266 Q 22,298 14,324 Q 4,346 -10,358 Q -16,368 -14,386 Q -10,404 -4,418 Q 2,430 6,438" strokeWidth="2.8" />
        <path d="M 18,583 L 22,596 L 20,602 L 34,602 L 34,636 L 20,636 L 20,602" strokeWidth="2.2" />
        <path d="M 34,610 L 42,610 L 42,616 L 34,616" strokeWidth="1.8" />
        <path d="M 34,622 L 40,622 L 40,628 L 34,628" strokeWidth="1.8" />
      </g>
    </svg>);

}

// Small brand mark for navbars/footers — same SVG, sized differently.
function MascotMark({ size = 28, style = {} }) {
  return <Mascot size={size} style={style} />;
}

// ---- Theme context ----
const ThemeCtx = createContext(null);
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('kc-theme') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('kc-theme', theme);
  }, [theme]);
  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>;
}
const useTheme = () => useContext(ThemeCtx);

// ---- Wallet context ----
const WalletCtx = createContext(null);
function WalletProvider({ children }) {
  const [wallet, setWallet] = useState({
    state: 'disconnected', // disconnected | connecting | connected | wrong-network
    address: null,
    keyBalance: 1250,
    network: 'sepolia'
  });

  function connect() {
    setWallet((w) => ({ ...w, state: 'connecting' }));
    setTimeout(() => {
      setWallet((w) => ({
        ...w,
        state: 'connected',
        address: '0x1234aB7E29f0c4d8B6c1c8E3aA9f5678D9012345'
      }));
    }, 900);
  }
  function disconnect() {
    setWallet({ state: 'disconnected', address: null, keyBalance: 0, network: 'sepolia' });
  }
  function spendKey(amount) {
    setWallet((w) => ({ ...w, keyBalance: Math.max(0, w.keyBalance - amount) }));
  }
  function setWrongNetwork() {
    setWallet((w) => ({ ...w, state: 'wrong-network' }));
  }
  function setCorrectNetwork() {
    setWallet((w) => ({ ...w, state: 'connected' }));
  }

  return <WalletCtx.Provider value={{ wallet, connect, disconnect, spendKey, setWrongNetwork, setCorrectNetwork }}>{children}</WalletCtx.Provider>;
}
const useWallet = () => useContext(WalletCtx);

// ---- Toast system ----
const ToastCtx = createContext(null);
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((toast) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, ...toast }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), toast.duration || 5000);
  }, []);
  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  return (
    <ToastCtx.Provider value={{ push, dismiss }}>
      {children}
      <div className="toast-region">
        {toasts.map((t) =>
        <div key={t.id} className={`toast toast--${t.type || 'info'}`}>
            <div className="toast__head">
              <span className="toast__title">{t.title}</span>
              <button className="toast__close" onClick={() => dismiss(t.id)} aria-label="Dismiss">×</button>
            </div>
            {t.msg ? <div className="toast__msg">{t.msg}</div> : null}
            {t.hash ? <a className="toast__hash" href={`https://sepolia.etherscan.io/tx/${t.hash}`} target="_blank" rel="noreferrer">tx: {t.hash.slice(0, 10)}…{t.hash.slice(-6)}</a> : null}
          </div>
        )}
      </div>
    </ToastCtx.Provider>);

}
const useToast = () => useContext(ToastCtx);

// ---- Icons (inline SVG) ----
const Icon = {
  search: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>,
  sun: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>,
  moon: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>,
  user: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a8 8 0 0 1 16 0v1" /></svg>,
  wallet: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M16 12h2" /></svg>,
  arrow: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  back: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>,
  store: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l1-5h16l1 5M3 9v11h18V9M3 9h18M8 13h8" /></svg>,
  library: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h6v16H4zM14 4h6v16h-6zM10 8h4M10 14h4" /></svg>,
  market: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M5 6v14h14V6M9 10v6M15 10v6" /></svg>,
  external: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 4h6v6M10 14L20 4M19 13v6H5V5h6" /></svg>
};

// ---- Navbar ----
function Navbar({ route, onNav, onOpenProfile, search, setSearch }) {
  const { theme, setTheme } = useTheme();
  const { wallet, connect } = useWallet();
  const tabs = [
  { id: 'store', label: 'Store' },
  { id: 'library', label: 'Library' },
  { id: 'marketplace', label: 'Marketplace' }];


  const truncAddr = wallet.address ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}` : null;

  return (
    <nav className="navbar">
      <a className="navbar__brand" onClick={() => onNav('store')} style={{ cursor: 'pointer' }}>
        <Mascot size={32} />
        <span>KeyChain</span>
      </a>
      <div className="navbar__tabs">
        {tabs.map((t) =>
        <button key={t.id} className={`navbar__tab ${route === t.id || route === 'detail' && t.id === 'store' ? 'navbar__tab--active' : ''}`}
        onClick={() => onNav(t.id)}>{t.label}</button>
        )}
      </div>
      <div className="navbar__right">
        <div className="navbar__search">
          <Icon.search />
          <input placeholder="Search games, vendors, tokens…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {wallet.state === 'disconnected' &&
        <button className="wallet-btn" onClick={connect}>
            <Icon.wallet /> Connect Wallet
          </button>
        }
        {wallet.state === 'connecting' &&
        <button className="wallet-btn" disabled>
            <span className="spinner" /> Connecting…
          </button>
        }
        {wallet.state === 'connected' &&
        <button className="wallet-btn connected" onClick={onOpenProfile}>
            <span className="wallet-dot" />
            <span>{truncAddr}</span>
            <span style={{ color: 'var(--accent-primary)' }}>· {wallet.keyBalance.toLocaleString()} KEY</span>
          </button>
        }
        {wallet.state === 'wrong-network' &&
        <button className="wallet-btn wrong">
            <span className="wallet-dot" />
            Switch to Sepolia
          </button>
        }
        <button className="icon-btn" aria-label="Toggle theme" data-comment-anchor="02d5e7adc5-svg-124-15" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
          {theme === 'light' ? <Icon.moon /> : <Icon.sun />}
        </button>
      </div>
    </nav>);

}

Object.assign(window, { Mascot, ThemeProvider, useTheme, WalletProvider, useWallet, ToastProvider, useToast, Icon, Navbar });