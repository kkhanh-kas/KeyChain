/**
 * Keychan Mascot — SVG component
 *
 * Minimalist line-art cat whose tail transforms into a skeleton key blade.
 * Ported from design-reference/components/shell.jsx (Mascot function).
 *
 * Usage:
 *   <Mascot size={80} />                   — default, for empty states
 *   <Mascot size={32} className="..." />    — small, for navbar brand mark
 *
 * Color: inherits currentColor from parent, so it follows the theme.
 */

interface MascotProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Mascot({ size = 80, className = "", style = {} }: MascotProps) {
  return (
    <svg
      viewBox="0 0 280 660"
      style={{ height: size, width: "auto", display: "block", overflow: "visible", ...style }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Keychan"
    >
      <g
        transform="translate(140, 0)"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Head */}
        <path
          d="M 0,152 Q -26,150 -42,138 Q -56,124 -58,108 Q -60,90 -54,76 Q -46,60 -40,50 Q -36,38 -34,28 Q -32,22 -28,28 Q -24,38 -20,48 Q -14,58 -8,62 Q -3,65 0,66 Q 3,65 8,62 Q 14,58 20,48 Q 24,38 28,28 Q 32,22 34,28 Q 36,38 40,50 Q 46,60 54,76 Q 60,90 58,108 Q 56,124 42,138 Q 26,150 0,152 Z"
          strokeWidth="3"
        />
        {/* Chin tuft */}
        <path d="M -8,149 Q 0,155 8,149" strokeWidth="1.5" opacity="0.35" />
        {/* Left wing/ruff */}
        <path
          d="M -28,152 Q -52,138 -78,134 Q -108,130 -122,144 Q -138,160 -124,178 Q -110,194 -82,192 Q -56,188 -36,178 Q -24,168 -18,158"
          strokeWidth="2.8"
        />
        <path
          d="M -30,156 Q -48,148 -68,145 Q -90,142 -102,152 Q -114,164 -102,176 Q -88,186 -64,182 Q -44,176 -32,166"
          strokeWidth="1.2"
          opacity="0.4"
        />
        {/* Right wing/ruff */}
        <path
          d="M 28,152 Q 52,138 78,134 Q 108,130 122,144 Q 138,160 124,178 Q 110,194 82,192 Q 56,188 36,178 Q 24,168 18,158"
          strokeWidth="2.8"
        />
        <path
          d="M 30,156 Q 48,148 68,145 Q 90,142 102,152 Q 114,164 102,176 Q 88,186 64,182 Q 44,176 32,166"
          strokeWidth="1.2"
          opacity="0.4"
        />
        {/* Body */}
        <path
          d="M 0,146 Q 13,156 14,170 Q 14,184 7,196 Q 3,202 0,204 Q -3,202 -7,196 Q -14,184 -14,170 Q -13,156 0,146 Z"
          strokeWidth="2.5"
        />
        <path
          d="M 0,156 Q 6,163 6,173 Q 6,183 3,191 Q 1,195 0,196 Q -1,195 -3,191 Q -6,183 -6,173 Q -6,163 0,156 Z"
          strokeWidth="1"
          opacity="0.3"
        />
        {/* Tail — the signature element, ends in skeleton key blade */}
        <path
          d="M -5,204 Q -14,234 -18,266 Q -22,298 -14,324 Q -4,346 10,358 Q 18,368 15,388 Q 10,414 -2,438 Q -22,468 -40,498 Q -60,528 -52,556 Q -42,580 -20,590 Q 2,598 20,588 Q 36,576 38,556 Q 38,538 26,528 Q 12,520 2,532 Q -8,546 -2,564 Q 4,580 18,583"
          strokeWidth="2.8"
        />
        <path
          d="M 5,204 Q 14,234 18,266 Q 22,298 14,324 Q 4,346 -10,358 Q -16,368 -14,386 Q -10,404 -4,418 Q 2,430 6,438"
          strokeWidth="2.8"
        />
        {/* Key blade at tail tip */}
        <path d="M 18,583 L 22,596 L 20,602 L 34,602 L 34,636 L 20,636 L 20,602" strokeWidth="2.2" />
        {/* Key ward notches */}
        <path d="M 34,610 L 42,610 L 42,616 L 34,616" strokeWidth="1.8" />
        <path d="M 34,622 L 40,622 L 40,628 L 34,628" strokeWidth="1.8" />
      </g>
    </svg>
  );
}

export default Mascot;
