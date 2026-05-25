// Main app — route state, tweaks, page composition
const { useState: useStateApp, useEffect: useEffectApp, useMemo } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#1E3A8A",
  "fontDisplay": "Playfair Display",
  "marqueeSpeed": 36,
  "showSeal": true,
  "denseGallery": false
}/*EDITMODE-END*/;

function applyTweaks(t) {
  const root = document.documentElement;
  if (document.documentElement.getAttribute('data-theme') !== 'dark') {
    root.style.setProperty('--accent-primary', t.accent);
    root.style.setProperty('--accent-hover', t.accent);
    root.style.setProperty('--accent-soft', t.accent + '14');
  }
  document.body.style.setProperty('font-family', 'var(--font-body)');
  root.style.setProperty('--font-display', `'${t.fontDisplay}', Georgia, serif`);

  // CSS-level rules for marquee speed / dense gallery / seal
  let style = document.getElementById('kc-tweak-style');
  if (!style) { style = document.createElement('style'); style.id = 'kc-tweak-style'; document.head.appendChild(style); }
  style.textContent = `
    .marquee__track { animation-duration: ${t.marqueeSpeed}s !important; }
    .gallery { grid-template-columns: repeat(${t.denseGallery ? 4 : 3}, 1fr) !important; }
    .landing__seal { display: ${t.showSeal ? 'flex' : 'none'} !important; }
  `;
}

function App() {
  const [route, setRoute] = useStateApp('landing');
  const [detailGame, setDetailGame] = useStateApp(null);
  const [profileOpen, setProfileOpen] = useStateApp(false);
  const [search, setSearch] = useStateApp('');
  const [library, setLibrary] = useStateApp(() => window.KC_DATA.LIBRARY_INITIAL.map(x => ({...x})));
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const { push } = useToast();
  const { wallet, spendKey } = useWallet();

  useEffectApp(() => { applyTweaks(tweaks); }, [tweaks]);

  function openGame(g) {
    setDetailGame(g);
    setRoute('detail');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  function nav(r) {
    setRoute(r);
    setDetailGame(null);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function buyGame(game) {
    if (library.find(x => x.id === game.id)) {
      push({ type: 'info', title: 'Already in library', msg: 'You already own this title.' });
      return;
    }
    const hash = '0x' + Math.random().toString(16).slice(2, 14) + Math.random().toString(16).slice(2, 14);
    spendKey(game.price);
    const newItem = {
      ...game,
      tokenId: '#' + String(Math.floor(Math.random() * 9000) + 1000),
      purchaseDate: new Date().toISOString().slice(0,10),
      status: 'inactive',
      license: 'Perpetual',
    };
    setLibrary(L => [newItem, ...L]);
    push({ type: 'success', title: 'Purchase confirmed', msg: `${game.title} is now in your library.`, hash });
    setTimeout(() => nav('library'), 400);
  }
  function activate(item) {
    const hash = '0x7a4b' + Math.random().toString(16).slice(2, 8) + 'f201';
    setLibrary(L => L.map(x => x.tokenId === item.tokenId ? { ...x, status: 'active', machineHash: hash } : x));
    push({ type: 'success', title: 'License activated', msg: `${item.title} bound to this machine.`, hash });
  }
  function resell(item) {
    const ask = Math.round(item.price * 0.7);
    setLibrary(L => L.map(x => x.tokenId === item.tokenId ? { ...x, status: 'listed', askPrice: ask } : x));
    push({ type: 'info', title: 'Listed on Marketplace', msg: `${item.title} listed for ${ask} KEY.` });
  }
  function cancelListing(item) {
    setLibrary(L => L.map(x => x.tokenId === item.tokenId ? { ...x, status: 'inactive', askPrice: undefined } : x));
    push({ type: 'info', title: 'Listing canceled', msg: `${item.title} returned to your library.` });
  }
  function viewOnChain() {
    push({ type: 'info', title: 'Opening Etherscan…', msg: 'In a real build this opens the tx in Etherscan Sepolia.' });
  }

  if (route === 'landing') {
    return (
      <>
        <Landing onEnter={() => nav('store')} />
        <TweaksUI tweaks={tweaks} setTweak={setTweak} onOpenVendor={() => nav('vendor')}/>
      </>
    );
  }
  if (route === 'vendor') {
    return (
      <>
        <Vendor onExit={() => nav('store')} />
        <TweaksUI tweaks={tweaks} setTweak={setTweak} onOpenVendor={() => {}}/>
      </>
    );
  }

  let page;
  if (route === 'store') page = <Store onOpen={openGame} search={search} />;
  else if (route === 'detail' && detailGame) page = <GameDetail game={detailGame} onBack={() => nav('store')} onBuy={buyGame} owned={!!library.find(l => l.id === detailGame.id)} />;
  else if (route === 'library') page = <Library items={library} onActivate={activate} onResell={resell} onCancelListing={cancelListing} onOpen={viewOnChain} onGotoStore={() => nav('store')} />;
  else if (route === 'marketplace') page = <Marketplace onOpen={openGame} search={search} />;

  return (
    <>
      <Navbar route={route} onNav={nav} onOpenProfile={() => setProfileOpen(true)} search={search} setSearch={setSearch}/>
      {page}
      <TweaksUI tweaks={tweaks} setTweak={setTweak} onOpenVendor={() => nav('vendor')}/>
      {profileOpen && (
        <StudentCard onClose={() => setProfileOpen(false)} ownedCount={library.length} joined="May 2026"/>
      )}
    </>
  );
}

function TweaksUI({ tweaks, setTweak, onOpenVendor }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Identity">
        <TweakColor label="Accent" value={tweaks.accent}
          options={['#1E3A8A', '#7C2D12', '#166534', '#0F172A', '#B45309']}
          onChange={v => setTweak('accent', v)}/>
        <TweakSelect label="Display font" value={tweaks.fontDisplay}
          options={[
            { label: 'Playfair Display', value: 'Playfair Display' },
            { label: 'DM Serif Display', value: 'DM Serif Display' },
            { label: 'Cormorant Garamond', value: 'Cormorant Garamond' },
            { label: 'Bodoni Moda', value: 'Bodoni Moda' },
          ]}
          onChange={v => setTweak('fontDisplay', v)}/>
      </TweakSection>
      <TweakSection label="Behaviour">
        <TweakSlider label="Marquee speed" value={tweaks.marqueeSpeed} min={10} max={90} step={2} unit="s"
          onChange={v => setTweak('marqueeSpeed', v)}/>
        <TweakToggle label="Landing seal" value={tweaks.showSeal} onChange={v => setTweak('showSeal', v)}/>
        <TweakToggle label="Dense gallery (4 cols)" value={tweaks.denseGallery} onChange={v => setTweak('denseGallery', v)}/>
      </TweakSection>
      <TweakSection label="Entrances">
        <TweakButton label="Open Vendor Portal" onClick={onOpenVendor}/>
      </TweakSection>
    </TweaksPanel>
  );
}

function Root() {
  return (
    <ThemeProvider>
      <WalletProvider>
        <ToastProvider>
          <App/>
        </ToastProvider>
      </WalletProvider>
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root/>);
