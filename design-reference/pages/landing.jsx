// Landing page — official version from upload, ported verbatim.
// Minimal wiring: onEnter routes to store, Connect Wallet uses the app's wallet context,
// theme bridges to the global ThemeProvider so it persists across pages.
const { useState: useStateLanding, useEffect: useEffectLanding, useRef: useRefLanding } = React;

/* ═══════════════════════════════════════════════
   KEYCHAN MASCOT — Faithful to original artwork
   Cat from behind + bow + body + tail→key
   ═══════════════════════════════════════════════ */
const KeychanMascot = ({ className = "", size = 400, color }) => (
  <svg viewBox="0 0 280 660" width={size * 0.42} height={size} className={className} fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color }}>
    <g transform="translate(140, 0)" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      {/* HEAD */}
      <path d="M 0,152 Q -26,150 -42,138 Q -56,124 -58,108 Q -60,90 -54,76 Q -46,60 -40,50 Q -36,38 -34,28 Q -32,22 -28,28 Q -24,38 -20,48 Q -14,58 -8,62 Q -3,65 0,66 Q 3,65 8,62 Q 14,58 20,48 Q 24,38 28,28 Q 32,22 34,28 Q 36,38 40,50 Q 46,60 54,76 Q 60,90 58,108 Q 56,124 42,138 Q 26,150 0,152 Z" strokeWidth="3"/>
      <path d="M -8,149 Q 0,155 8,149" strokeWidth="1.5" opacity="0.35"/>
      {/* BOW LEFT */}
      <path d="M -28,152 Q -52,138 -78,134 Q -108,130 -122,144 Q -138,160 -124,178 Q -110,194 -82,192 Q -56,188 -36,178 Q -24,168 -18,158" strokeWidth="2.8"/>
      <path d="M -30,156 Q -48,148 -68,145 Q -90,142 -102,152 Q -114,164 -102,176 Q -88,186 -64,182 Q -44,176 -32,166" strokeWidth="1.2" opacity="0.4"/>
      {/* BOW RIGHT */}
      <path d="M 28,152 Q 52,138 78,134 Q 108,130 122,144 Q 138,160 124,178 Q 110,194 82,192 Q 56,188 36,178 Q 24,168 18,158" strokeWidth="2.8"/>
      <path d="M 30,156 Q 48,148 68,145 Q 90,142 102,152 Q 114,164 102,176 Q 88,186 64,182 Q 44,176 32,166" strokeWidth="1.2" opacity="0.4"/>
      {/* BOW KNOT */}
      <path d="M 0,146 Q 13,156 14,170 Q 14,184 7,196 Q 3,202 0,204 Q -3,202 -7,196 Q -14,184 -14,170 Q -13,156 0,146 Z" strokeWidth="2.5"/>
      <path d="M 0,156 Q 6,163 6,173 Q 6,183 3,191 Q 1,195 0,196 Q -1,195 -3,191 Q -6,183 -6,173 Q -6,163 0,156 Z" strokeWidth="1" opacity="0.3"/>
      {/* BODY LEFT → TAIL */}
      <path d="M -5,204 Q -14,234 -18,266 Q -22,298 -14,324 Q -4,346 10,358 Q 18,368 15,388 Q 10,414 -2,438 Q -22,468 -40,498 Q -60,528 -52,556 Q -42,580 -20,590 Q 2,598 20,588 Q 36,576 38,556 Q 38,538 26,528 Q 12,520 2,532 Q -8,546 -2,564 Q 4,580 18,583" strokeWidth="2.8"/>
      {/* BODY RIGHT */}
      <path d="M 5,204 Q 14,234 18,266 Q 22,298 14,324 Q 4,346 -10,358 Q -16,368 -14,386 Q -10,404 -4,418 Q 2,430 6,438" strokeWidth="2.8"/>
      {/* KEY */}
      <path d="M 18,583 L 22,596 L 20,602 L 34,602 L 34,636 L 20,636 L 20,602" strokeWidth="2.2"/>
      <path d="M 34,610 L 42,610 L 42,616 L 34,616" strokeWidth="1.8"/>
      <path d="M 34,622 L 40,622 L 40,628 L 34,628" strokeWidth="1.8"/>
    </g>
  </svg>
);

/* ═══════════════════════════════════════════════
   CELESTIAL DECORATIVE ELEMENTS
   ═══════════════════════════════════════════════ */
const Star4 = ({ x, y, size = 12, opacity = 0.3, color }) => (
  <g transform={`translate(${x}, ${y})`} fill="none" stroke={color} strokeWidth="1" opacity={opacity}>
    <path d={`M0,${-size} L${size*0.15},${-size*0.15} L${size},0 L${size*0.15},${size*0.15} L0,${size} L${-size*0.15},${size*0.15} L${-size},0 L${-size*0.15},${-size*0.15} Z`} fill={color} fillOpacity="0.15"/>
  </g>
);

const Star6 = ({ x, y, size = 8, opacity = 0.25, color }) => (
  <g transform={`translate(${x}, ${y})`} fill={color} opacity={opacity}>
    <circle r={size * 0.15} fill={color}/>
    <path d={`M0,${-size} L${size*0.22},${-size*0.22} L${size},0 L${size*0.22},${size*0.22} L0,${size} L${-size*0.22},${size*0.22} L${-size},0 L${-size*0.22},${-size*0.22} Z`} fill="none" stroke={color} strokeWidth="0.8"/>
  </g>
);

const CrescentMoon = ({ x, y, size = 24, opacity = 0.2, color, rotate = 0 }) => (
  <g transform={`translate(${x}, ${y}) rotate(${rotate})`} fill="none" stroke={color} strokeWidth="1.2" opacity={opacity}>
    <path d={`M${size*0.3},${-size} A${size},${size} 0 1,1 ${size*0.3},${size} A${size*0.7},${size*0.7} 0 1,0 ${size*0.3},${-size}`}/>
  </g>
);

const ConstellationDots = ({ points, opacity = 0.2, color }) => (
  <g opacity={opacity}>
    {points.map((p, i) => (
      <circle key={`dot-${i}`} cx={p[0]} cy={p[1]} r={1.8} fill={color}/>
    ))}
    {points.slice(0, -1).map((p, i) => (
      <line key={`line-${i}`} x1={p[0]} y1={p[1]} x2={points[i+1][0]} y2={points[i+1][1]} stroke={color} strokeWidth="0.6" strokeDasharray="3,4"/>
    ))}
  </g>
);

const TarotFrame = ({ x, y, width = 60, height = 95, opacity = 0.08, color, rotate = 0 }) => (
  <g transform={`translate(${x}, ${y}) rotate(${rotate})`} fill="none" stroke={color} strokeWidth="1" opacity={opacity}>
    <rect x={-width/2} y={-height/2} width={width} height={height} rx={4}/>
    <rect x={-width/2+4} y={-height/2+4} width={width-8} height={height-8} rx={2}/>
    <circle cy={0} cx={0} r={width*0.25}/>
    <path d={`M0,${-height/2+12} L0,${-height/2+20}`} strokeWidth="0.8"/>
    <path d={`M0,${height/2-12} L0,${height/2-20}`} strokeWidth="0.8"/>
  </g>
);

const CelestialBackground = ({ theme, isDark }) => {
  const starColor = theme.accent;
  const faintColor = isDark ? "#F5F2ED" : "#1A1A1A";

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
      <svg width="100%" height="100%" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", top: 0, left: 0 }}>
        <circle cx="1200" cy="120" r="280" stroke={theme.border} strokeWidth="0.8" fill="none" opacity="0.4"/>
        <circle cx="1200" cy="120" r="260" stroke={theme.border} strokeWidth="0.4" fill="none" opacity="0.25" strokeDasharray="4,6"/>
        <circle cx="-50" cy="700" r="200" stroke={theme.border} strokeWidth="0.8" fill="none" opacity="0.3"/>

        <TarotFrame x={120} y={180} rotate={-15} opacity={0.07} color={faintColor}/>
        <TarotFrame x={1300} y={650} rotate={12} opacity={0.06} color={faintColor} width={50} height={80}/>
        <TarotFrame x={1100} y={350} rotate={-8} opacity={0.05} color={starColor} width={45} height={72}/>

        <Star4 x={200} y={100} size={16} opacity={0.2} color={starColor}/>
        <Star4 x={1350} y={200} size={10} opacity={0.25} color={starColor}/>
        <Star4 x={900} y={80} size={8} opacity={0.18} color={starColor}/>
        <Star4 x={400} y={750} size={14} opacity={0.15} color={starColor}/>
        <Star4 x={1050} y={800} size={11} opacity={0.2} color={starColor}/>
        <Star4 x={680} y={150} size={6} opacity={0.3} color={starColor}/>
        <Star4 x={50} y={400} size={9} opacity={0.15} color={starColor}/>

        <Star6 x={320} y={250} size={5} opacity={0.3} color={starColor}/>
        <Star6 x={1250} y={480} size={4} opacity={0.25} color={starColor}/>
        <Star6 x={750} y={680} size={6} opacity={0.2} color={starColor}/>
        <Star6 x={550} y={120} size={3} opacity={0.35} color={starColor}/>
        <Star6 x={1100} y={150} size={5} opacity={0.22} color={starColor}/>
        <Star6 x={180} y={600} size={4} opacity={0.28} color={starColor}/>

        <CrescentMoon x={1320} y={380} size={28} opacity={0.12} color={starColor} rotate={-30}/>
        <CrescentMoon x={100} y={320} size={18} opacity={0.1} color={faintColor} rotate={45}/>

        <ConstellationDots points={[[280,320],[310,290],[350,300],[370,270],[410,280]]} opacity={0.15} color={starColor}/>
        <ConstellationDots points={[[1050,550],[1090,530],[1080,570],[1120,560]]} opacity={0.12} color={starColor}/>
        <ConstellationDots points={[[600,780],[640,760],[660,790],[700,770],[720,800]]} opacity={0.1} color={faintColor}/>
        <ConstellationDots points={[[800,100],[830,130],[870,110],[860,80]]} opacity={0.12} color={starColor}/>

        <ellipse cx="720" cy="450" rx="600" ry="180" stroke={theme.border} strokeWidth="0.4" fill="none" opacity="0.12" transform="rotate(-8, 720, 450)"/>
        <ellipse cx="720" cy="450" rx="500" ry="140" stroke={theme.border} strokeWidth="0.3" fill="none" opacity="0.08" transform="rotate(-8, 720, 450)" strokeDasharray="6,10"/>

        {[
          [130,80],[250,450],[380,180],[500,650],[620,90],[740,380],[860,700],[980,160],
          [1100,600],[1220,280],[1340,720],[70,550],[440,380],[660,520],[820,240],[1000,440],
          [160,720],[340,580],[520,340],[700,620],[880,120],[1060,380],[1240,80],[1380,520],
        ].map(([cx, cy], i) => (
          <circle key={`star-${i}`} cx={cx} cy={cy} r={0.8 + (i % 3) * 0.4} fill={starColor} opacity={0.1 + (i % 5) * 0.04}/>
        ))}
      </svg>

      <div style={{ position: "absolute", top: "10%", left: "10%", width: 300, height: 300, borderRadius: "50%", background: theme.accent, opacity: isDark ? 0.04 : 0.03, filter: "blur(100px)" }}/>
      <div style={{ position: "absolute", bottom: "15%", right: "15%", width: 350, height: 350, borderRadius: "50%", background: theme.accent, opacity: isDark ? 0.06 : 0.04, filter: "blur(120px)" }}/>
      <div style={{ position: "absolute", top: "50%", left: "55%", width: 200, height: 200, borderRadius: "50%", background: theme.accent, opacity: isDark ? 0.03 : 0.02, filter: "blur(80px)" }}/>
    </div>
  );
};

/* ═══════════════════════════════════════════════
   MAIN LANDING PAGE
   ═══════════════════════════════════════════════ */
function Landing({ onEnter }) {
  // Bridge to the global theme context so toggling here persists across pages.
  const { theme: globalTheme, setTheme: setGlobalTheme } = useTheme();
  const { wallet, connect } = useWallet();
  const isDark = globalTheme === 'dark';
  const setIsDark = (next) => setGlobalTheme(typeof next === 'function' ? (next(isDark) ? 'dark' : 'light') : (next ? 'dark' : 'light'));

  const [isVisible, setIsVisible] = useStateLanding({});
  const sectionRefs = useRefLanding({});

  useEffectLanding(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible((prev) => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.12 }
    );
    Object.values(sectionRefs.current).forEach((ref) => { if (ref) observer.observe(ref); });
    return () => observer.disconnect();
  }, []);

  const theme = {
    bg: isDark ? "#0D0D0D" : "#F5F2ED",
    bgSecondary: isDark ? "#1A1A1A" : "#EDEAE5",
    bgTertiary: isDark ? "#252525" : "#FFFFFF",
    text: isDark ? "#EAEEF7" : "#2A4A82",
    textSecondary: isDark ? "#9AA6C0" : "#7384A8",
    accent: isDark ? "#3B82F6" : "#1E3A8A",
    accentHover: isDark ? "#60A5FA" : "#1E40AF",
    border: isDark ? "#333333" : "#D4D0CB",
    accentLight: isDark ? "rgba(59,130,246,0.1)" : "rgba(30,58,138,0.06)",
  };

  const features = [
    { title: "Own", subtitle: "True Digital Ownership", desc: "Every game license is an NFT on Ethereum. You own it — not the platform, not the publisher. Your key, your game, forever.", symbol: "◆" },
    { title: "Trade", subtitle: "Secondary Market", desc: "Resell your games on the open marketplace. Royalties are automatically distributed to developers through ERC-2981.", symbol: "◇" },
    { title: "Activate", subtitle: "Hardware-Bound Licenses", desc: "Bind your license to your machine with on-chain activation. Cryptographic proof that you own what you play.", symbol: "▣" },
    { title: "Earn", subtitle: "Automatic Royalties", desc: "Developers earn from every resale. Smart contracts handle the math. No middleman, no dispute, no delay.", symbol: "◈" },
  ];

  const steps = [
    { num: "01", label: "Connect", desc: "A MetaMask wallet on Sepolia testnet. No account, no email." },
    { num: "02", label: "Browse", desc: "A gallery of games. Hover for the title and price. Click for the story." },
    { num: "03", label: "Buy", desc: "A single transaction. KEY leaves your wallet, a ticket arrives in your library." },
    { num: "04", label: "Play (or resell)", desc: "Activate the license to bind it, or list it on the Marketplace." },
  ];

  const sectionStyle = (id) => ({
    opacity: isVisible[id] ? 1 : 0,
    transform: isVisible[id] ? "translateY(0)" : "translateY(30px)",
    transition: "opacity 0.8s ease-out, transform 0.8s ease-out",
  });

  return (
    <div style={{ color: theme.text, minHeight: "100vh", fontFamily: "'Inter', 'Helvetica Neue', system-ui, sans-serif", transition: "background 0.5s ease, color 0.5s ease", overflowX: "hidden" }}>

      <style>{`
        @keyframes kc-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes kc-fadeInUp { from { opacity: 0; transform: translateY(35px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes kc-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .kc-feature-card { transition: all 0.3s ease; }
        .kc-feature-card:hover { transform: translateY(-4px) !important; box-shadow: 0 8px 32px ${isDark ? 'rgba(59,130,246,0.12)' : 'rgba(30,58,138,0.1)'} !important; border-color: ${theme.accent} !important; }
        .kc-cta-btn { transition: all 0.25s ease; }
        .kc-cta-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 24px ${isDark ? 'rgba(59,130,246,0.3)' : 'rgba(30,58,138,0.25)'}; }
        .kc-ghost-btn { transition: all 0.25s ease; }
        .kc-ghost-btn:hover { background: ${theme.accentLight} !important; border-color: ${theme.accent} !important; }
        .kc-theme-toggle { transition: all 0.3s ease; }
        .kc-theme-toggle:hover { background: ${theme.accentLight} !important; transform: scale(1.08); }
        .kc-step-circle { transition: all 0.3s ease; }
        .kc-step-col:hover .kc-step-circle { background: ${theme.accent} !important; color: #fff !important; border-color: ${theme.accent} !important; }
        .kc-landing-root *, .kc-landing-root *::before, .kc-landing-root *::after { box-sizing: border-box; }
        .kc-landing-root ::selection { background: ${theme.accent}; color: white; }
      `}</style>

      <div className="kc-landing-root" style={{ position: "relative" }}>
        {/* Celestial background — spans the whole landing, fixed so it stays behind every section */}
        <CelestialBackground theme={theme} isDark={isDark} />

        {/* THEME TOGGLE */}
        <button
          className="kc-theme-toggle"
          onClick={() => setIsDark(!isDark)}
          style={{
            position: "fixed", top: 28, right: 28, zIndex: 100,
            width: 44, height: 44, borderRadius: "50%",
            border: `1.5px solid ${theme.border}`,
            background: theme.bgTertiary, color: theme.text,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
            boxShadow: isDark ? "0 2px 12px rgba(0,0,0,0.4)" : "0 2px 12px rgba(0,0,0,0.08)",
          }}
          aria-label="Toggle theme"
        >
          {isDark ? "☀" : "☾"}
        </button>

        {/* HERO */}
        <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", position: "relative", padding: "60px 24px 100px", overflow: "hidden", zIndex: 1 }}>
          <div style={{
            animation: "kc-fadeInUp 0.8s ease-out both", animationDelay: "0.2s",
            display: "flex", alignItems: "center", gap: 12,
            marginBottom: 40, letterSpacing: "0.2em",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            color: theme.textSecondary, textTransform: "uppercase",
            position: "relative", zIndex: 1,
          }}>
            <span style={{ display: "inline-block", width: 32, height: "1px", background: theme.accent, opacity: 0.6 }}/>
            Decentralized Game Licensing
            <span style={{ display: "inline-block", width: 32, height: "1px", background: theme.accent, opacity: 0.6 }}/>
          </div>

          <div style={{ animation: "kc-fadeInUp 1s ease-out both", animationDelay: "0.4s", position: "relative", zIndex: 1 }}>
            <div style={{ color: theme.accent, animation: "kc-float 6s ease-in-out infinite", display: "flex", justifyContent: "center" }}>
              <KeychanMascot size={160} color={theme.accent} />
            </div>
          </div>

          <div style={{ animation: "kc-fadeInUp 1s ease-out both", animationDelay: "0.6s", position: "relative", zIndex: 1 }}>
            <h1 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "clamp(56px, 10vw, 130px)",
              fontWeight: 900, lineHeight: 0.92, textAlign: "center",
              letterSpacing: "-0.02em", marginTop: 24, margin: "24px 0 0",
            }}>
              <span style={{ display: "block" }}>Key</span>
              <span style={{ display: "block", color: theme.accent }}>Chain</span>
            </h1>
          </div>

          <p style={{
            animation: "kc-fadeInUp 1s ease-out both", animationDelay: "0.8s",
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "clamp(16px, 2.2vw, 22px)", fontWeight: 400,
            color: theme.textSecondary, textAlign: "center",
            marginTop: 28, maxWidth: 500, lineHeight: 1.7,
            fontStyle: "italic", position: "relative", zIndex: 1,
          }}>
            Every license is a key.<br/>Every transfer is on-chain.
          </p>

          <div style={{
            animation: "kc-fadeInUp 1s ease-out both", animationDelay: "1s",
            display: "flex", gap: 16, marginTop: 44, flexWrap: "wrap", justifyContent: "center",
            position: "relative", zIndex: 1,
          }}>
            <button className="kc-cta-btn" onClick={onEnter} style={{
              padding: "14px 36px", borderRadius: 8,
              background: theme.accent, color: "#FFFFFF",
              border: "none", cursor: "pointer",
              fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600,
              letterSpacing: "0.04em",
            }}>
              Enter Store →
            </button>
            <button className="kc-ghost-btn"
              onClick={wallet.state === 'disconnected' ? connect : undefined}
              disabled={wallet.state !== 'disconnected'}
              style={{
                padding: "14px 36px", borderRadius: 8,
                background: "transparent", color: theme.text,
                border: `1.5px solid ${theme.border}`,
                cursor: wallet.state === 'disconnected' ? "pointer" : "default",
                fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500,
                letterSpacing: "0.04em",
                opacity: wallet.state !== 'disconnected' && wallet.state !== 'connecting' ? 0.7 : 1,
              }}>
              {wallet.state === 'disconnected' ? 'Connect Wallet'
                : wallet.state === 'connecting' ? 'Connecting…'
                : '✓ Wallet Connected'}
            </button>
          </div>
        </section>

        {/* PORCELAIN DIVIDER */}
        <div style={{ width: "100%", display: "flex", justifyContent: "center", padding: "0 24px", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, maxWidth: 600, width: "100%" }}>
            <div style={{ flex: 1, height: "1px", background: `linear-gradient(to right, transparent, ${theme.border})` }}/>
            <div style={{ color: theme.accent, opacity: 0.5, fontSize: 10, letterSpacing: "0.3em" }}>✦ ◇ ✦</div>
            <div style={{ flex: 1, height: "1px", background: `linear-gradient(to left, transparent, ${theme.border})` }}/>
          </div>
        </div>

        {/* FEATURES */}
        <section
          id="features"
          ref={(el) => (sectionRefs.current["features"] = el)}
          style={{ ...sectionStyle("features"), padding: "120px 24px", maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}
        >
          <div style={{ textAlign: "center", marginBottom: 72 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginBottom: 16 }}>
              <span style={{ width: 28, height: "1px", background: theme.accent, opacity: 0.5 }}/>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: theme.accent, letterSpacing: "0.2em", textTransform: "uppercase" }}>
                Core Principles
              </span>
              <span style={{ width: 28, height: "1px", background: theme.accent, opacity: 0.5 }}/>
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 700, letterSpacing: "-0.01em" }}>
              What Makes KeyChain Different
            </h2>
            <p style={{ color: theme.textSecondary, maxWidth: 480, margin: "16px auto 0", fontSize: 15, lineHeight: 1.7 }}>
              A game store built on transparency, ownership, and fairness — powered by Ethereum smart contracts.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {features.map((f) => (
              <div
                key={f.title}
                className="kc-feature-card"
                style={{
                  background: theme.bgSecondary,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 14, padding: "32px 24px",
                  cursor: "default",
                }}
              >
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: theme.accent, marginBottom: 14, opacity: 0.6 }}>
                  {f.symbol}
                </div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
                  {f.title}
                </h3>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: theme.accent, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  {f.subtitle}
                </span>
                <p style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 1.7, marginTop: 14 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* MARQUEE DIVIDER */}
        <div style={{ overflow: "hidden", padding: "44px 0", borderTop: `1px solid ${theme.border}`, borderBottom: `1px solid ${theme.border}`, position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", animation: "kc-marquee 22s linear infinite", whiteSpace: "nowrap" }}>
            {[...Array(3)].map((_, gi) => (
              <div key={gi} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                {["OWN", "TRADE", "ACTIVATE", "EARN", "KEYCHAIN"].map((word, i) => (
                  <span key={`${gi}-${i}`} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                    <span style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 900,
                      color: i === 4 ? theme.accent : theme.text,
                      opacity: i === 4 ? 0.85 : 0.07,
                      letterSpacing: "-0.02em", padding: "0 28px",
                    }}>
                      {word}
                    </span>
                    <span style={{ color: theme.accent, opacity: 0.25, fontSize: 10, padding: "0 6px" }}>✦</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* HOW IT WORKS */}
        <section
          id="howItWorks"
          ref={(el) => (sectionRefs.current["howItWorks"] = el)}
          style={{ ...sectionStyle("howItWorks"), padding: "120px 24px", maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}
        >
          <div style={{ marginBottom: 72, maxWidth: 600 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ width: 28, height: "1px", background: theme.accent }}/>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: theme.accent, letterSpacing: "0.2em", textTransform: "uppercase" }}>
                How It Works
              </span>
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 700, lineHeight: 1.1 }}>
              From a porcelain shelf<br/>to your machine.
            </h2>
          </div>

          <div style={{ position: "relative" }}>
            <div style={{
              position: "absolute", top: 28, left: "calc(12.5% + 28px)", right: "calc(12.5% + 28px)",
              height: "1px", borderTop: `2px dashed ${theme.border}`,
              zIndex: 0,
            }}/>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, position: "relative", zIndex: 1 }}>
              {steps.map((step) => (
                <div key={step.num} className="kc-step-col" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", cursor: "default" }}>
                  <div className="kc-step-circle" style={{
                    width: 56, height: 56, borderRadius: "50%",
                    border: `1.5px solid ${theme.accent}`,
                    background: theme.bg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700,
                    color: theme.accent, marginBottom: 20,
                  }}>
                    {step.num}
                  </div>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                    {step.label}
                  </h3>
                  <p style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 1.6, maxWidth: 220 }}>
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TECH STACK */}
        <section
          id="techStack"
          ref={(el) => (sectionRefs.current["techStack"] = el)}
          style={{ ...sectionStyle("techStack"), padding: "80px 24px 120px", maxWidth: 900, margin: "0 auto", position: "relative", zIndex: 1 }}
        >
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginBottom: 16 }}>
              <span style={{ width: 28, height: "1px", background: theme.accent, opacity: 0.5 }}/>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: theme.accent, letterSpacing: "0.2em", textTransform: "uppercase" }}>
                Built With
              </span>
              <span style={{ width: 28, height: "1px", background: theme.accent, opacity: 0.5 }}/>
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700 }}>
              Technology Stack
            </h2>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10 }}>
            {[
              "Ethereum", "Solidity", "Hardhat", "OpenZeppelin",
              "Next.js", "TypeScript", "ethers.js", "MetaMask",
              "ERC-1155", "ERC-2981", "ERC-20", "IPFS",
              "Sepolia Testnet", "TailwindCSS",
            ].map((tech) => (
              <span key={tech} style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12, padding: "8px 18px",
                border: `1px solid ${theme.border}`,
                borderRadius: 24, color: theme.textSecondary,
                background: theme.bgSecondary,
                letterSpacing: "0.02em",
              }}>
                {tech}
              </span>
            ))}
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{
          borderTop: `1px solid ${theme.border}`,
          padding: "48px 24px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
          position: "relative", zIndex: 1,
        }}>
          <div style={{ color: theme.accent, opacity: 0.35 }}>
            <KeychanMascot size={56} color={theme.accent} />
          </div>

          <div style={{ textAlign: "center" }}>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, letterSpacing: "0.1em" }}>
              KEYCHAIN
            </p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, color: theme.textSecondary, marginTop: 6, fontStyle: "italic" }}>
              Every license is a key. Every transfer is on-chain.
            </p>
          </div>

          <div style={{ display: "flex", gap: 20, fontSize: 12, color: theme.textSecondary, fontFamily: "'JetBrains Mono', monospace" }}>
            <span>Sepolia Testnet</span>
            <span style={{ opacity: 0.3 }}>·</span>
            <span>Research Prototype</span>
            <span style={{ opacity: 0.3 }}>·</span>
            <span>2026</span>
          </div>

          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: theme.textSecondary, opacity: 0.4, marginTop: 4 }}>
            Built as an academic research project — not for production use
          </p>
        </footer>
      </div>
    </div>
  );
}

window.Landing = Landing;
