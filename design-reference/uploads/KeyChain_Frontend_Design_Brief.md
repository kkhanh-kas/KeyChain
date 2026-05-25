# KeyChain — Frontend Design Brief

**Version:** 1.0  
**Date:** May 24, 2026  
**Status:** Pre-Development Reference

---

## 1. Design Vision

KeyChain's frontend is a **gallery-style game store** — not a content-heavy marketplace like Steam or Epic. The experience should feel like walking into a curated exhibition where each game is a displayed piece, not a product on a shelf.

The visual identity draws from two sources:

- **Qinghua porcelain (青花瓷)** — the cobalt blue and white ceramic tradition — for color palette and tonal elegance
- **Contemporary Chinese graphic design** — for editorial layouts, bold typography, and high-contrast compositions

The mascot **Keychan** — a minimalist line-art cat whose tail transforms into a skeleton key — sets the personality: calm, elegant, slightly mysterious. Not cute, not flashy. A keeper of licenses.

---

## 2. Color System

### Palette

| Token | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| `--bg-primary` | `#F5F2ED` (porcelain white) | `#0D0D0D` (ink black) | Page background |
| `--bg-secondary` | `#EDEAE5` (warm gray) | `#1A1A1A` (charcoal) | Cards, sections |
| `--bg-tertiary` | `#FFFFFF` (pure white) | `#252525` (elevated surface) | Modals, popups, navbar |
| `--text-primary` | `#1A1A1A` (near black) | `#F5F2ED` (porcelain white) | Body text, headings |
| `--text-secondary` | `#6B6B6B` (warm gray) | `#9E9E9E` (muted gray) | Captions, metadata |
| `--accent-primary` | `#1E3A8A` (deep cobalt) | `#3B82F6` (bright cobalt) | Primary actions, links, highlights |
| `--accent-hover` | `#1E40AF` (darker cobalt) | `#60A5FA` (lighter cobalt) | Hover states |
| `--success` | `#166534` | `#22C55E` | Transaction confirmed |
| `--warning` | `#92400E` | `#F59E0B` | Wrong network, pending |
| `--error` | `#991B1B` | `#EF4444` | Transaction failed |
| `--border` | `#D4D0CB` | `#333333` | Card borders, dividers |

### Rules

- Cobalt blue is the **only** accent color. No secondary accent. This constraint creates the porcelain coherence.
- In light mode, the background should feel warm (not clinical white) — think paper, ceramic, linen.
- In dark mode, the background should feel deep (not gray) — think ink, lacquer, midnight.
- The toggle between modes should swap backgrounds and text while keeping accent cobalt as the constant anchor.

---

## 3. Typography

### Font Pairing

| Role | Font | Fallback | Weight |
|---|---|---|---|
| Headings / Display | **Playfair Display** | Georgia, serif | 700, 900 |
| Body / UI | **Inter** | system-ui, sans-serif | 400, 500, 600 |
| Monospace / Data | **JetBrains Mono** | monospace | 400 |

### Rationale

- **Playfair Display** — serif with high stroke contrast, carries the "vintage Western elegance" feel. Used for page titles, game names, section headers. Large sizes only.
- **Inter** — clean geometric sans-serif for readability. All body text, buttons, labels, navigation.
- **JetBrains Mono** — for wallet addresses, transaction hashes, KEY balances, token IDs. Anything that is "data" rather than "content."

### Scale

| Token | Size | Usage |
|---|---|---|
| `--text-xs` | 12px | Fine print, timestamps |
| `--text-sm` | 14px | Captions, metadata |
| `--text-base` | 16px | Body text |
| `--text-lg` | 18px | Card titles |
| `--text-xl` | 24px | Section headings |
| `--text-2xl` | 32px | Page titles |
| `--text-hero` | 48–64px | Landing page hero, Store banner |

---

## 4. Layout Architecture

### Global Shell

```
┌─────────────────────────────────────────────────┐
│  NAVBAR (fixed top, always visible)             │
│  [Logo]  [Store] [Library] [Marketplace]        │
│                    [Search] [🌓] [Wallet] [👤]  │
├─────────────────────────────────────────────────┤
│                                                 │
│              PAGE CONTENT                       │
│         (varies per page)                       │
│                                                 │
└─────────────────────────────────────────────────┘
```

- Navbar is **horizontally fixed at the top** across all pages.
- Consistent across Store, Library, and Marketplace. Think of it as the museum hallway — always the same, rooms differ.
- Vendor Portal has its own separate shell and entrance. No shared navigation with user-facing pages.

### Navbar Contents (left to right)

| Left | Center | Right |
|---|---|---|
| Keychan logo + "KeyChain" wordmark | Store · Library · Marketplace (nav tabs) | Search bar · Light/Dark toggle · Wallet button · Profile icon |

- **Wallet button** shows: "Connect Wallet" (disconnected), or truncated address + KEY balance (connected).
- **Profile icon** opens the Student Card modal (see Section 8).
- Active nav tab indicated with cobalt underline or fill.

---

## 5. Page Specifications

### 5.1 Landing Page

**Purpose:** First impression. Explains what KeyChain is before user enters the app. Target audience includes academic evaluators, demo viewers, and first-time users.

**Structure:**

```
┌─────────────────────────────────────────────────┐
│                 HERO SECTION                    │
│   Large Keychan illustration + tagline          │
│   "Every license is a key.                      │
│    Every transfer is on-chain."                 │
│   [Enter Store →]  [Connect Wallet]             │
├─────────────────────────────────────────────────┤
│              FEATURE HIGHLIGHTS                 │
│   3-4 cards explaining core concepts:           │
│   Own · Trade · Activate · Earn Royalties       │
├─────────────────────────────────────────────────┤
│              HOW IT WORKS                       │
│   Visual step flow: Connect → Buy → Activate    │
├─────────────────────────────────────────────────┤
│                 FOOTER                          │
│   Built with · Tech stack · Links               │
└─────────────────────────────────────────────────┘
```

**Design notes:**
- This is the most "artistic" page — full creative freedom.
- Hero section should be bold, typographic, and use the cobalt + porcelain palette dramatically.
- Keychan mascot is prominent here. This is its primary showcase.
- No navbar on this page (or minimal). The landing page IS the entrance — the navbar appears once the user enters the app proper.

---

### 5.2 Store Page

**Purpose:** Browse and purchase games.

**Layout:**

```
┌─────────────────────────────────────────────────┐
│  NAVBAR                                         │
├───────────────┬─────────────────────────────────┤
│               │                                 │
│   MARQUEE     │        GAME GALLERY             │
│   STRIP       │                                 │
│   (1/3 width) │   ┌──────┐  ┌──────┐  ┌──────┐ │
│               │   │ Game │  │ Game │  │ Game │ │
│   Auto-scroll │   │ Art  │  │ Art  │  │ Art  │ │
│   L→R         │   │      │  │      │  │      │ │
│   Cover art   │   └──────┘  └──────┘  └──────┘ │
│   only        │                                 │
│   No text     │   ┌──────┐  ┌──────┐  ┌──────┐ │
│               │   │      │  │      │  │      │ │
│               │   └──────┘  └──────┘  └──────┘ │
│               │                                 │
└───────────────┴─────────────────────────────────┘
```

**Marquee strip (left 1/3):**
- Occupies the left third of the viewport width.
- Auto-scrolling horizontal marquee of game cover art images.
- Scrolls left to right, continuous loop, no user interaction needed.
- No text overlay — pure visual, like a film strip or LED billboard.
- Purpose: atmospheric, promotional, creates visual energy without demanding attention.

**Game gallery (right 2/3):**
- Horizontal grid of game cards arranged in rows.
- Each card shows **cover art only** in default state (poster/gallery style).
- **Hover interaction:** overlay appears with game title, price (in KEY), genre tag, and a "View" or "Add to Cart" button.
- Hover overlay uses semi-transparent cobalt or dark gradient from bottom.
- Transition: smooth fade-in (200–300ms, ease-out).

**Game card specifications:**
- Aspect ratio: 3:4 (portrait, like a book cover or poster).
- Border-radius: subtle (4–8px).
- No visible border in default state. On hover: subtle cobalt glow or shadow lift.
- Cover art fills the entire card (object-fit: cover).

**Click behavior:** Opens a full Game Detail page (not modal).

---

### 5.3 Game Detail Page

**Purpose:** Full information about a specific game before purchase.

**Content:**
- Large hero cover art (top half or full-width banner).
- Game title (Playfair Display, large).
- Description, genre, developer/vendor info.
- Price in KEY, prominently displayed.
- "Buy Now" button (primary cobalt).
- IPFS metadata link (small, secondary).
- Royalty percentage displayed (transparent for user).

**Design direction:**
- Editorial layout — not a form, not a product page. Think magazine article about the game.
- The cover art should dominate the top of the page.

---

### 5.4 Library Page

**Purpose:** View owned games, activate licenses, manage tickets.

**Layout:**
- Vertical scroll of **ticket cards** (boarding pass metaphor).
- Each ticket is full-width or near-full-width, displayed one below another.
- User scrolls down to see all owned games.

**Ticket card anatomy:**

```
┌─────────────────────────────────────────────────────────────┐
│ ┌──────────┐                                                │
│ │          │   GAME TITLE                    STATUS: ACTIVE │
│ │  Cover   │   Genre: RPG                                  │
│ │  Art     │   Purchase Date: 2026-05-20                    │
│ │          │   Token ID: #0042                              │
│ │          │   License: Perpetual                           │
│ │          │                                                │
│ └──────────┘   [Activate]  [Resell]  [View on Chain ↗]     │
│ ·····································perforation·line······ │
│  BOARDING PASS NO. 0042         GATE: SEPOLIA TESTNET       │
│  PASSENGER: 0x1234...5678       CLASS: PERPETUAL LICENSE    │
│  ||||||||||||||||||||||||| (barcode decoration)              │
└─────────────────────────────────────────────────────────────┘
```

**Design details:**
- Perforation line (dashed or dotted) divides main info from the "stub."
- Bottom stub section styled like an actual boarding pass: monospace font, uppercase labels, barcode decoration (purely visual, not functional).
- Left side has the game cover art thumbnail.
- Right side has all metadata and action buttons.
- Rounded corners on the left side, straight cut on the right (or vice versa) to mimic a real ticket tear.
- Subtle paper texture or grain background on the card (very subtle, not distracting).

**Activation states on ticket:**
- Not activated: "Activate" button visible, status shows "Inactive."
- Activated: green checkmark, machine hash displayed (truncated), status "Active."
- Listed for resale: "Listed on Marketplace" badge, "Cancel Listing" button replaces "Resell."

**Empty state:** Keychan illustration with text: "No games in your library yet. Visit the Store to start your collection."

---

### 5.5 Marketplace Page

**Purpose:** Browse and buy resold games from other users.

**Layout:** Same gallery grid as Store (shared layout), with the following differences per card:

- **"Resale" tag** — small badge on the card indicating this is a second-hand sale.
- **Seller address** — displayed as truncated wallet address (monospace).
- **Royalty notice** — small text below price: "Includes X% royalty to developer."

**Interaction:** Same hover-to-reveal as Store. Same card aspect ratio and behavior.

---

### 5.6 Vendor Portal (Separate Shell)

**Purpose:** Game registration, price management, revenue monitoring.

**Access:** Separate entry point. Own navigation (not shared with user-facing Store/Library/Marketplace).

**Scope for design brief:** Functional and clean. Does not need the same artistic treatment as user-facing pages. Standard dashboard layout with sidebar navigation.

---

## 6. Component System

### 6.1 Buttons

| Variant | Usage | Style |
|---|---|---|
| Primary | Buy, Activate, Connect Wallet | Cobalt fill, white text, hover: darker cobalt + subtle lift |
| Secondary | Cancel, View Details, Resell | Bordered (cobalt outline), transparent fill, hover: light cobalt fill |
| Ghost | Minor actions, links | No border, cobalt text, hover: underline or background tint |
| Danger | Disconnect, Cancel Listing | Red outline or fill, used sparingly |

All buttons: 8px border-radius, 500 font-weight, min-height 40px, transition 200ms ease-out.

### 6.2 Cards

| Type | Used In | Behavior |
|---|---|---|
| Game Card (poster) | Store, Marketplace | Cover art fills card. Hover reveals info overlay. |
| Ticket Card (boarding pass) | Library | Full-width horizontal card with perforation line and stub. |

### 6.3 Status Indicators

Must handle all six wallet states defined in the project guidelines:

| State | Visual Treatment |
|---|---|
| Not connected | Wallet button shows "Connect Wallet" with outline style |
| Connected, wrong network | Warning badge (amber) on wallet button: "Switch to Sepolia" |
| Connected, correct network | Wallet button shows address + KEY balance, cobalt/green dot |
| Transaction pending | Inline spinner next to action button, button disabled, toast notification |
| Transaction success | Green checkmark animation, toast with tx hash link |
| Transaction failed | Red X, error toast with retry action |

### 6.4 Toast Notifications

- Positioned top-right.
- Three types: success (green accent), error (red accent), info (cobalt accent).
- Auto-dismiss after 5 seconds, manual dismiss via close button.
- Transaction toasts include truncated tx hash as clickable link to Etherscan Sepolia.

---

## 7. Interaction & Animation

### Philosophy

Every animation must serve a purpose — guide attention, confirm action, or communicate state. No animation for decoration only.

### Specifications

| Interaction | Effect | Duration | Easing |
|---|---|---|---|
| Game card hover | Overlay fade-in + slight card lift (4px) + subtle shadow | 250ms | ease-out |
| Button hover | Background darken + translateY(-1px) | 150ms | ease-out |
| Button click | Scale(0.97) press effect | 100ms | ease-in-out |
| Page entrance | Content fade-in from below (opacity 0→1, translateY 20→0) | 400ms | ease-out |
| Toast enter | Slide in from right | 300ms | cubic-bezier(0.34, 1.56, 0.64, 1) |
| Toast exit | Fade out + slide right | 200ms | ease-in |
| Modal open | Backdrop blur + card scale(0.95→1) + fade-in | 300ms | ease-out |
| Marquee strip | Continuous translateX, linear | ~30s per loop | linear |
| Ticket card hover | Border-color transition to cobalt + very subtle lift (2px) | 200ms | ease-out |

### Constraints

- No glitch effects, no elastic bouncing, no staggered entrance waterfalls. These are impressive in art pages but create noise in a functional DApp.
- Maximum one animation per user action. If a button click triggers a modal, the modal animates — the button does not also bounce.
- All animations respect `prefers-reduced-motion: reduce`.

---

## 8. Student Card (Profile Modal)

### Trigger

Click the profile icon in the navbar.

### Behavior

- Modal appears center-screen.
- Background blurs and dims (backdrop-filter: blur + dark overlay).
- Click outside or press Escape to close.

### Card Design

```
┌─────────────────────────────────────────────┐
│  ┌─────────┐                                │
│  │         │   KEYCHAIN MEMBER CARD         │
│  │ Avatar  │   ─────────────────────        │
│  │ or      │   [Name]     (editable)        │
│  │ Keychan │   [Role]     Customer          │
│  │ default │                                │
│  └─────────┘   [Wallet]   0x1234...5678     │
│                [Balance]  1,250 KEY         │
│                [Games]    7 owned           │
│                [Joined]   May 2026          │
│                                             │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ perforation ─ ─ ─ ─ ─  │
│                                             │
│  |||||||||||||||||||||| (barcode)            │
│  MEMBER SINCE 2026        [Edit Profile]    │
│                            [Disconnect]     │
└─────────────────────────────────────────────┘
```

### Design Details

- Same perforation + barcode motif as the Library ticket cards (visual consistency).
- Monospace font for wallet address and balance.
- "Name" stored in localStorage (off-chain, client-side only). Editable via an inline text field.
- Default avatar: Keychan silhouette. User cannot upload custom avatar (out of scope).
- Card background: slightly different from page bg (elevated surface color).
- Subtle paper texture matching the ticket cards.

---

## 9. Empty & Error States

All empty states feature Keychan in a calm, understated pose with a short message:

| State | Message |
|---|---|
| Library empty | "No games yet. Your collection starts at the Store." |
| Marketplace empty | "Nothing listed for resale right now." |
| Search no results | "Keychan looked everywhere. Nothing found." |
| Wallet not connected | "Connect your wallet to get started." |
| Wrong network | "Please switch to Sepolia testnet to continue." |
| Transaction error | "Something went wrong. You can try again." |

**Tone:** Calm and informative. Never blame the user. Never use exclamation marks in error states.

---

## 10. Responsive Behavior

KeyChain is a **desktop-first DApp** (requires MetaMask browser extension).

| Breakpoint | Behavior |
|---|---|
| ≥1280px | Full layout: marquee strip + gallery grid side by side |
| 1024–1279px | Marquee strip collapses to horizontal banner above gallery |
| 768–1023px | Single column, game cards stack, simplified nav |
| <768px | Basic mobile fallback: info visible by default (no hover dependency), simplified ticket cards |

The marquee strip is the first element to be sacrificed at smaller viewpoints. It is decorative, not functional.

---

## 11. Design Tokens Summary (Tailwind Config Reference)

```
Colors:
  porcelain:    #F5F2ED
  ink:          #0D0D0D
  cobalt:       #1E3A8A (light) / #3B82F6 (dark)
  cobalt-deep:  #1E40AF
  cobalt-light: #60A5FA
  warm-gray:    #EDEAE5
  charcoal:     #1A1A1A
  ash:          #6B6B6B
  muted:        #9E9E9E
  border-light: #D4D0CB
  border-dark:  #333333

Border Radius:
  card:   8px
  button: 8px
  modal:  12px
  ticket: 12px (left) / 0px (right, torn edge)

Shadows:
  card-hover:   0 4px 16px rgba(0,0,0,0.08)
  card-hover-dark: 0 4px 16px rgba(0,0,0,0.3)
  modal:        0 8px 32px rgba(0,0,0,0.15)

Spacing Scale:
  Base unit: 4px
  Common: 8, 12, 16, 24, 32, 48, 64, 96
```

---

## 12. Page Map

```
Landing Page (no navbar)
    │
    └──► App Shell (navbar appears)
            ├── Store (gallery + marquee strip)
            │     └── Game Detail Page
            ├── Library (ticket cards, vertical scroll)
            └── Marketplace (shared gallery layout + resale tags)

Vendor Portal (separate shell, separate entry)
    ├── Dashboard
    ├── Register Game
    └── Revenue Monitor
```

---

## 13. Key Design Decisions Log

| Decision | Choice | Reasoning |
|---|---|---|
| Color palette | Cobalt + porcelain + ink | Qinghua ceramic inspiration. High contrast, limited palette forces consistency. |
| Game display in Store | Poster art with hover-to-reveal | Gallery aesthetic. 10–15 games allows each to breathe. |
| Game display in Library | Boarding pass / ticket metaphor | Reinforces "access" and "key" themes. Ticket = proof of ownership. |
| Profile display | Student card / ID card modal | Matches ticket metaphor. Modal avoids navigation away from current page. |
| Navigation | Fixed horizontal top bar | DApp requires constant wallet state visibility. Consistent anchor point. |
| Vendor Portal | Separate shell | Different user context, different mental model. No navigation clutter for regular users. |
| Landing page navbar | Hidden or minimal | Landing page is the entrance — navbar appears after entering the app. |
| Hover interaction on Store | Overlay with info + CTA | Clean gallery default state. Info on demand, not on display. |
| Marquee strip | Auto-scrolling cover art, left 1/3, no text | Atmospheric visual energy. Promotional. Non-interactive. |
| Theme support | Light + Dark mode | Porcelain palette naturally supports both. Toggle in navbar. |
| Display name storage | localStorage (client-side) | Cosmetic only. No on-chain cost. Off-chain boundary clearly documented. |
| Marketplace layout | Shared with Store + resale badge | Reduces design scope. Differentiates via content, not layout. |
| Animations | Purposeful only, no decorative effects | DApp needs clarity over flair. Every animation confirms or guides. |

---

## 14. Implementation Priority

**Phase 1 — Foundation:**
1. Design tokens in Tailwind config (colors, typography, spacing, shadows)
2. Global shell: Navbar component with wallet state handling
3. Light/Dark mode toggle infrastructure
4. Base component library: Button, Card, Toast, Modal

**Phase 2 — Core Pages:**
5. Landing Page (hero + features + how it works)
6. Store Page (marquee strip + game gallery with hover interaction)
7. Game Detail Page

**Phase 3 — Ownership Experience:**
8. Library Page (ticket cards with activation states)
9. Student Card profile modal
10. Marketplace Page (shared Store layout + resale elements)

**Phase 4 — Vendor & Polish:**
11. Vendor Portal (separate shell)
12. Empty states with Keychan illustrations
13. Animation polish pass
14. Responsive breakpoint adjustments

---

*KeyChain — Every license is a key. Every transfer is on-chain.*
