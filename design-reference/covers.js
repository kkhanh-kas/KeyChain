// Procedural cover art — qinghua porcelain palette
// Returns an SVG data URL for use as background-image, OR a JSX node via SVG.
// These are bold, editorial, brush-style compositions in cobalt + porcelain.

(function () {
  const PALETTES = [
    { bg: '#F5F2ED', ink: '#1E3A8A', accent: '#1E40AF', soft: '#D9DEEF' },
    { bg: '#EDEAE5', ink: '#142554', accent: '#1E3A8A', soft: '#C7CFE8' },
    { bg: '#1E3A8A', ink: '#F5F2ED', accent: '#FFFFFF', soft: '#3B5CB8' },
    { bg: '#0D1638', ink: '#3B82F6', accent: '#F5F2ED', soft: '#1E3A8A' },
    { bg: '#F5F2ED', ink: '#0D1638', accent: '#1E3A8A', soft: '#C5CCE0' },
  ];

  function svgWrap(inner, w = 600, h = 800, palette) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">
      <rect width="${w}" height="${h}" fill="${palette.bg}"/>
      ${inner}
    </svg>`;
  }

  function gridPattern(palette) {
    return `<defs>
      <pattern id="grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M40 0L0 0 0 40" fill="none" stroke="${palette.ink}" stroke-width="0.4" opacity="0.15"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid)"/>`;
  }

  function frame(palette) {
    return `<rect x="20" y="20" width="560" height="760" fill="none" stroke="${palette.ink}" stroke-width="1.5" opacity="0.8"/>
            <rect x="32" y="32" width="536" height="736" fill="none" stroke="${palette.ink}" stroke-width="0.5" opacity="0.45"/>`;
  }

  function colophon(palette, title, no) {
    return `
      <text x="48" y="60" font-family="ui-monospace, monospace" font-size="11" letter-spacing="3" fill="${palette.ink}" opacity="0.7">KEYCHAIN · COBALT EDITION</text>
      <text x="48" y="752" font-family="ui-monospace, monospace" font-size="10" letter-spacing="3" fill="${palette.ink}" opacity="0.6">№ ${no || '042'}</text>
      <text x="552" y="752" text-anchor="end" font-family="ui-monospace, monospace" font-size="10" letter-spacing="3" fill="${palette.ink}" opacity="0.6">青花 · QH</text>`;
  }

  // ---- Compositions ----
  const designs = {
    lantern(p) {
      // Hanging lantern with calligraphic streaks
      return svgWrap(`
        ${gridPattern(p)}
        ${frame(p)}
        <line x1="300" y1="32" x2="300" y2="180" stroke="${p.ink}" stroke-width="2"/>
        <ellipse cx="300" cy="320" rx="160" ry="200" fill="${p.ink}" opacity="0.92"/>
        <ellipse cx="300" cy="320" rx="120" ry="150" fill="${p.bg}" opacity="0.95"/>
        <text x="300" y="360" text-anchor="middle" font-family="serif" font-style="italic" font-size="160" fill="${p.ink}" font-weight="700">隱</text>
        <rect x="240" y="500" width="120" height="20" fill="${p.ink}"/>
        <line x1="300" y1="520" x2="300" y2="600" stroke="${p.ink}" stroke-width="2"/>
        <path d="M260 600 Q300 660 340 600" stroke="${p.ink}" stroke-width="3" fill="none"/>
        <text x="300" y="720" text-anchor="middle" font-family="Playfair Display, serif" font-style="italic" font-size="36" fill="${p.ink}" letter-spacing="4">LANTERN</text>
        ${colophon(p, 'Lantern', '042')}
      `, 600, 800, p);
    },

    wave(p) {
      // Stylized hokusai-like waves but in cobalt
      return svgWrap(`
        ${frame(p)}
        <g stroke="${p.ink}" stroke-width="2" fill="none">
          <path d="M40 600 Q140 480 240 600 T440 600 T640 600"/>
          <path d="M40 540 Q140 420 240 540 T440 540 T640 540" opacity="0.7"/>
          <path d="M40 480 Q140 360 240 480 T440 480 T640 480" opacity="0.5"/>
          <path d="M40 420 Q140 300 240 420 T440 420 T640 420" opacity="0.3"/>
        </g>
        <g fill="${p.ink}">
          <circle cx="300" cy="220" r="120" opacity="0.92"/>
          <circle cx="300" cy="220" r="110" fill="${p.bg}"/>
          <text x="300" y="252" text-anchor="middle" font-family="serif" font-size="100" fill="${p.ink}" font-weight="700">海</text>
        </g>
        <text x="300" y="720" text-anchor="middle" font-family="Playfair Display, serif" font-style="italic" font-size="32" fill="${p.ink}" letter-spacing="6">PLAIN SAILING</text>
        ${colophon(p, 'Sailing', '099')}
      `, 600, 800, p);
    },

    crow(p) {
      // Bold geometric crow silhouette
      return svgWrap(`
        ${frame(p)}
        <g fill="${p.ink}">
          <path d="M200 300 Q280 240 380 280 Q470 320 460 380 L420 400 L470 460 L380 440 L320 480 L260 440 L200 460 L240 400 L180 360 Z"/>
          <circle cx="380" cy="320" r="6" fill="${p.bg}"/>
          <path d="M460 320 L520 300 L500 340 Z"/>
        </g>
        <line x1="300" y1="500" x2="300" y2="640" stroke="${p.ink}" stroke-width="3"/>
        <path d="M260 640 L340 640" stroke="${p.ink}" stroke-width="3"/>
        <path d="M260 640 Q300 680 340 640" stroke="${p.ink}" stroke-width="3" fill="none"/>
        <text x="300" y="720" text-anchor="middle" font-family="Playfair Display, serif" font-style="italic" font-size="32" fill="${p.ink}" letter-spacing="6">CROW &amp; CROWN</text>
        ${colophon(p, 'Crow', '134')}
      `, 600, 800, p);
    },

    thread(p) {
      // Constellation lines with stitched dots
      const pts = [[120,200],[220,140],[320,260],[420,180],[480,320],[380,420],[220,460],[160,360]];
      const lines = pts.map((a,i) => {
        const b = pts[(i+1) % pts.length];
        return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${p.ink}" stroke-width="1" stroke-dasharray="3 4"/>`;
      }).join('');
      const dots = pts.map(([x,y]) => `<circle cx="${x}" cy="${y}" r="6" fill="${p.bg}" stroke="${p.ink}" stroke-width="2"/>`).join('');
      return svgWrap(`
        ${frame(p)}
        <g>${lines}${dots}</g>
        <text x="300" y="600" text-anchor="middle" font-family="serif" font-size="64" fill="${p.ink}" font-weight="700">縫</text>
        <text x="300" y="720" text-anchor="middle" font-family="Playfair Display, serif" font-style="italic" font-size="36" fill="${p.ink}" letter-spacing="6">THREADBARE</text>
        ${colophon(p, 'Thread', '210')}
      `, 600, 800, p);
    },

    atelier(p) {
      // Editorial type-driven cover
      return svgWrap(`
        ${frame(p)}
        <g>
          <text x="300" y="280" text-anchor="middle" font-family="Playfair Display, serif" font-size="120" font-weight="900" fill="${p.ink}">SUN</text>
          <text x="300" y="400" text-anchor="middle" font-family="Playfair Display, serif" font-style="italic" font-size="120" font-weight="400" fill="${p.ink}">down</text>
          <line x1="80" y1="440" x2="520" y2="440" stroke="${p.ink}" stroke-width="1"/>
          <text x="300" y="510" text-anchor="middle" font-family="ui-monospace, monospace" font-size="18" letter-spacing="12" fill="${p.ink}">ATELIER</text>
          <circle cx="300" cy="600" r="40" fill="none" stroke="${p.ink}" stroke-width="1.5"/>
          <text x="300" y="612" text-anchor="middle" font-family="serif" font-size="40" font-weight="700" fill="${p.ink}">茶</text>
        </g>
        ${colophon(p, 'Atelier', '288')}
      `, 600, 800, p);
    },

    iron(p) {
      // Crossed blades / abstract sword garden
      return svgWrap(`
        ${frame(p)}
        <g stroke="${p.ink}" fill="${p.ink}">
          <path d="M180 580 L180 220 L220 220 L220 580 Z"/>
          <path d="M380 580 L380 220 L420 220 L420 580 Z"/>
          <path d="M280 580 L280 160 L320 160 L320 580 Z"/>
          <path d="M140 600 L460 600 L420 640 L180 640 Z" opacity="0.85"/>
          <path d="M180 220 L220 220 L200 180 Z"/>
          <path d="M380 220 L420 220 L400 180 Z"/>
          <path d="M280 160 L320 160 L300 120 Z"/>
        </g>
        <text x="300" y="720" text-anchor="middle" font-family="Playfair Display, serif" font-style="italic" font-size="34" fill="${p.ink}" letter-spacing="4">THE IRON GARDEN</text>
        ${colophon(p, 'Iron', '301')}
      `, 600, 800, p);
    },

    calligraphy(p) {
      // Big brush stroke
      return svgWrap(`
        ${frame(p)}
        <path d="M120 260 Q260 180 360 320 Q500 480 220 540 Q120 560 480 600" stroke="${p.ink}" stroke-width="22" fill="none" stroke-linecap="round" opacity="0.95"/>
        <text x="300" y="720" text-anchor="middle" font-family="Playfair Display, serif" font-style="italic" font-size="28" fill="${p.ink}" letter-spacing="3">QUIET CALLIGRAPHY CLUB</text>
        <rect x="450" y="640" width="60" height="60" fill="${p.ink}"/>
        <text x="480" y="678" text-anchor="middle" font-family="serif" font-size="34" font-weight="700" fill="${p.bg}">墨</text>
        ${colophon(p, 'Calligraphy', '344')}
      `, 600, 800, p);
    },

    marble(p) {
      // Chess-grid composition
      const cells = [];
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          if ((x + y) % 2 === 0) cells.push(`<rect x="${80 + x * 110}" y="${180 + y * 110}" width="110" height="110" fill="${p.ink}" opacity="0.9"/>`);
        }
      }
      return svgWrap(`
        ${frame(p)}
        <g>${cells.join('')}</g>
        <circle cx="245" cy="345" r="28" fill="${p.bg}" stroke="${p.ink}" stroke-width="2"/>
        <circle cx="355" cy="455" r="28" fill="${p.ink}"/>
        <text x="300" y="720" text-anchor="middle" font-family="Playfair Display, serif" font-style="italic" font-size="32" fill="${p.ink}" letter-spacing="6">MARBLE PROVINCES</text>
        ${colophon(p, 'Marble', '421')}
      `, 600, 800, p);
    },

    tea(p) {
      // Mountain silhouettes
      return svgWrap(`
        ${frame(p)}
        <g fill="${p.ink}">
          <path d="M40 560 L180 320 L260 460 L360 240 L460 440 L560 360 L560 720 L40 720 Z"/>
        </g>
        <g fill="${p.ink}" opacity="0.5">
          <path d="M40 600 L120 480 L240 580 L320 500 L420 600 L500 540 L560 580 L560 720 L40 720 Z"/>
        </g>
        <circle cx="440" cy="220" r="40" fill="${p.ink}" opacity="0.95"/>
        <text x="300" y="690" text-anchor="middle" font-family="Playfair Display, serif" font-style="italic" font-size="36" fill="${p.bg}" letter-spacing="8">TEA ROADS</text>
        ${colophon(p, 'Tea', '488')}
      `, 600, 800, p);
    },
  };

  function getCover(art, paletteIdx) {
    const p = PALETTES[paletteIdx % PALETTES.length];
    const fn = designs[art] || designs.lantern;
    const svg = fn(p);
    // encodeURIComponent does NOT encode parens; the SVG contains url(#grid)
    // which would prematurely close the outer CSS url(...) function. Escape them.
    const encoded = encodeURIComponent(svg).replace(/\(/g, '%28').replace(/\)/g, '%29');
    return 'data:image/svg+xml;utf8,' + encoded;
  }

  window.KC_COVERS = { getCover, PALETTES };
})();
