"use client";

// Fixed celestial / tarot decorative layer behind the landing page. Pure SVG,
// non-interactive. Ported from design-reference/pages/landing.jsx.

interface DecoProps {
  x: number;
  y: number;
  size?: number;
  opacity?: number;
  color: string;
  rotate?: number;
}

function Star4({ x, y, size = 12, opacity = 0.3, color }: DecoProps) {
  return (
    <g transform={`translate(${x}, ${y})`} fill="none" stroke={color} strokeWidth="1" opacity={opacity}>
      <path
        d={`M0,${-size} L${size * 0.15},${-size * 0.15} L${size},0 L${size * 0.15},${size * 0.15} L0,${size} L${-size * 0.15},${size * 0.15} L${-size},0 L${-size * 0.15},${-size * 0.15} Z`}
        fill={color}
        fillOpacity="0.15"
      />
    </g>
  );
}

function Star6({ x, y, size = 8, opacity = 0.25, color }: DecoProps) {
  return (
    <g transform={`translate(${x}, ${y})`} fill={color} opacity={opacity}>
      <circle r={size * 0.15} fill={color} />
      <path
        d={`M0,${-size} L${size * 0.22},${-size * 0.22} L${size},0 L${size * 0.22},${size * 0.22} L0,${size} L${-size * 0.22},${size * 0.22} L${-size},0 L${-size * 0.22},${-size * 0.22} Z`}
        fill="none"
        stroke={color}
        strokeWidth="0.8"
      />
    </g>
  );
}

function CrescentMoon({ x, y, size = 24, opacity = 0.2, color, rotate = 0 }: DecoProps) {
  return (
    <g transform={`translate(${x}, ${y}) rotate(${rotate})`} fill="none" stroke={color} strokeWidth="1.2" opacity={opacity}>
      <path d={`M${size * 0.3},${-size} A${size},${size} 0 1,1 ${size * 0.3},${size} A${size * 0.7},${size * 0.7} 0 1,0 ${size * 0.3},${-size}`} />
    </g>
  );
}

function ConstellationDots({ points, opacity = 0.2, color }: { points: [number, number][]; opacity?: number; color: string }) {
  return (
    <g opacity={opacity}>
      {points.map((p, i) => (
        <circle key={`dot-${i}`} cx={p[0]} cy={p[1]} r={1.8} fill={color} />
      ))}
      {points.slice(0, -1).map((p, i) => (
        <line key={`line-${i}`} x1={p[0]} y1={p[1]} x2={points[i + 1][0]} y2={points[i + 1][1]} stroke={color} strokeWidth="0.6" strokeDasharray="3,4" />
      ))}
    </g>
  );
}

function TarotFrame({ x, y, width = 60, height = 95, opacity = 0.08, color, rotate = 0 }: DecoProps & { width?: number; height?: number }) {
  return (
    <g transform={`translate(${x}, ${y}) rotate(${rotate})`} fill="none" stroke={color} strokeWidth="1" opacity={opacity}>
      <rect x={-width / 2} y={-height / 2} width={width} height={height} rx={4} />
      <rect x={-width / 2 + 4} y={-height / 2 + 4} width={width - 8} height={height - 8} rx={2} />
      <circle cy={0} cx={0} r={width * 0.25} />
      <path d={`M0,${-height / 2 + 12} L0,${-height / 2 + 20}`} strokeWidth="0.8" />
      <path d={`M0,${height / 2 - 12} L0,${height / 2 - 20}`} strokeWidth="0.8" />
    </g>
  );
}

interface CelestialBackgroundProps {
  accent: string;
  border: string;
  faint: string;
  isDark: boolean;
}

export function CelestialBackground({ accent, border, faint, isDark }: CelestialBackgroundProps) {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
      <svg width="100%" height="100%" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", top: 0, left: 0 }}>
        <circle cx="1200" cy="120" r="280" stroke={border} strokeWidth="0.8" fill="none" opacity="0.4" />
        <circle cx="1200" cy="120" r="260" stroke={border} strokeWidth="0.4" fill="none" opacity="0.25" strokeDasharray="4,6" />
        <circle cx="-50" cy="700" r="200" stroke={border} strokeWidth="0.8" fill="none" opacity="0.3" />

        <TarotFrame x={120} y={180} rotate={-15} opacity={0.07} color={faint} />
        <TarotFrame x={1300} y={650} rotate={12} opacity={0.06} color={faint} width={50} height={80} />
        <TarotFrame x={1100} y={350} rotate={-8} opacity={0.05} color={accent} width={45} height={72} />

        <Star4 x={200} y={100} size={16} opacity={0.2} color={accent} />
        <Star4 x={1350} y={200} size={10} opacity={0.25} color={accent} />
        <Star4 x={900} y={80} size={8} opacity={0.18} color={accent} />
        <Star4 x={400} y={750} size={14} opacity={0.15} color={accent} />
        <Star4 x={1050} y={800} size={11} opacity={0.2} color={accent} />
        <Star4 x={680} y={150} size={6} opacity={0.3} color={accent} />
        <Star4 x={50} y={400} size={9} opacity={0.15} color={accent} />

        <Star6 x={320} y={250} size={5} opacity={0.3} color={accent} />
        <Star6 x={1250} y={480} size={4} opacity={0.25} color={accent} />
        <Star6 x={750} y={680} size={6} opacity={0.2} color={accent} />
        <Star6 x={550} y={120} size={3} opacity={0.35} color={accent} />
        <Star6 x={1100} y={150} size={5} opacity={0.22} color={accent} />
        <Star6 x={180} y={600} size={4} opacity={0.28} color={accent} />

        <CrescentMoon x={1320} y={380} size={28} opacity={0.12} color={accent} rotate={-30} />
        <CrescentMoon x={100} y={320} size={18} opacity={0.1} color={faint} rotate={45} />

        <ConstellationDots points={[[280, 320], [310, 290], [350, 300], [370, 270], [410, 280]]} opacity={0.15} color={accent} />
        <ConstellationDots points={[[1050, 550], [1090, 530], [1080, 570], [1120, 560]]} opacity={0.12} color={accent} />
        <ConstellationDots points={[[600, 780], [640, 760], [660, 790], [700, 770], [720, 800]]} opacity={0.1} color={faint} />
        <ConstellationDots points={[[800, 100], [830, 130], [870, 110], [860, 80]]} opacity={0.12} color={accent} />

        <ellipse cx="720" cy="450" rx="600" ry="180" stroke={border} strokeWidth="0.4" fill="none" opacity="0.12" transform="rotate(-8, 720, 450)" />
        <ellipse cx="720" cy="450" rx="500" ry="140" stroke={border} strokeWidth="0.3" fill="none" opacity="0.08" transform="rotate(-8, 720, 450)" strokeDasharray="6,10" />

        {([
          [130, 80], [250, 450], [380, 180], [500, 650], [620, 90], [740, 380], [860, 700], [980, 160],
          [1100, 600], [1220, 280], [1340, 720], [70, 550], [440, 380], [660, 520], [820, 240], [1000, 440],
          [160, 720], [340, 580], [520, 340], [700, 620], [880, 120], [1060, 380], [1240, 80], [1380, 520],
        ] as [number, number][]).map(([cx, cy], i) => (
          <circle key={`star-${i}`} cx={cx} cy={cy} r={0.8 + (i % 3) * 0.4} fill={accent} opacity={0.1 + (i % 5) * 0.04} />
        ))}
      </svg>

      <div style={{ position: "absolute", top: "10%", left: "10%", width: 300, height: 300, borderRadius: "50%", background: accent, opacity: isDark ? 0.04 : 0.03, filter: "blur(100px)" }} />
      <div style={{ position: "absolute", bottom: "15%", right: "15%", width: 350, height: 350, borderRadius: "50%", background: accent, opacity: isDark ? 0.06 : 0.04, filter: "blur(120px)" }} />
      <div style={{ position: "absolute", top: "50%", left: "55%", width: 200, height: 200, borderRadius: "50%", background: accent, opacity: isDark ? 0.03 : 0.02, filter: "blur(80px)" }} />
    </div>
  );
}
