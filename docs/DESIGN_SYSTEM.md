# GhostOdds Design System

## Brand Identity
- **Name**: GhostOdds
- **Tagline**: "Predict. Trade. No trace."
- **Personality**: Dark, sleek, crypto-native. Think Drift Protocol meets Polymarket but edgier.

## Color Palette

### Primary
- **Background**: `#0a0a0f` (near-black)
- **Surface**: `#12121a` (card backgrounds)
- **Surface Elevated**: `#1a1a2e` (hover states, modals)
- **Border**: `#2a2a3e` (subtle borders)

### Accent
- **Primary**: `#6366f1` (indigo-500 — main actions, links)
- **Primary Hover**: `#818cf8` (indigo-400)
- **Success / YES**: `#22c55e` (green-500 — YES outcome, profits)
- **Danger / NO**: `#ef4444` (red-500 — NO outcome, losses)
- **Warning**: `#f59e0b` (amber-500 — alerts, pending)

### Text
- **Primary**: `#f8fafc` (slate-50)
- **Secondary**: `#94a3b8` (slate-400)
- **Muted**: `#64748b` (slate-500)

## Typography
- **Font**: `Inter` (Google Fonts) — clean, modern, great for numbers
- **Monospace**: `JetBrains Mono` — for prices, amounts, addresses
- **Sizes**:
  - Hero: 36px / 2.25rem
  - H1: 28px / 1.75rem  
  - H2: 22px / 1.375rem
  - H3: 18px / 1.125rem
  - Body: 14px / 0.875rem (crypto UIs run smaller)
  - Caption: 12px / 0.75rem
  - Mono/Price: 16px / 1rem (always monospace)

## Component Patterns

### Cards
- Background: `surface`
- Border: 1px `border` color
- Border-radius: 12px
- Padding: 16px-24px
- Hover: border transitions to `primary` at 50% opacity

### Buttons
- **Primary**: `primary` bg, white text, rounded-lg, h-10
- **Secondary**: transparent bg, `primary` border, `primary` text
- **Ghost**: transparent bg, `secondary` text, hover shows surface bg
- **Danger**: `danger` bg, white text
- All buttons: font-medium, transition-all duration-150

### Trading Panel
- Positioned right side of market detail page
- Tab-style YES/NO toggle at top (green/red)
- Amount input with USDC label
- Slider for quick amounts (10, 25, 50, 100, 250)
- Price display in monospace
- "Place Trade" CTA button (full width, primary)
- Potential payout shown below

### Market Cards (List View)
- Market question as title (bold, 16px)
- Current YES price as large number (monospace, green)
- Volume badge (bottom left)
- Time remaining badge (bottom right)
- Subtle gradient overlay on hover
- Category tag (top left)

### Navigation
- Top bar: logo left, wallet connect right
- Sticky, glass-morphism background (backdrop-blur)
- Active link: primary color underline

### Charts
- Use a lightweight chart lib (lightweight-charts by TradingView or recharts)
- Dark theme matching our palette
- Green for price up, red for price down

## Layout
- Max width: 1280px centered
- Sidebar: none (clean single-column for markets, 2-column for market detail)
- Grid: CSS Grid, 12-column
- Market list: responsive grid, 1 col mobile / 2 col tablet / 3 col desktop
- Market detail: 8/4 split (content/trading panel)

## Animations
- Subtle only — no flashy transitions
- Page transitions: fade 150ms
- Card hover: translateY(-2px) + shadow
- Button press: scale(0.98)
- Number changes: brief highlight flash (green for up, red for down)

## Icons
- Lucide React (consistent, clean line icons)
- Size: 16px default, 20px for navigation

## Dark Mode
- Dark mode ONLY. No light mode toggle. This is a crypto product.

## Responsive Breakpoints
- Mobile: < 640px
- Tablet: 640-1024px  
- Desktop: > 1024px
- Trading panel collapses to bottom sheet on mobile

## Share Cards (Twitter/X)
- 1200x630px OG image
- Market question centered
- Current price large
- GhostOdds branding subtle bottom right
- Dark background matching brand
- Generated server-side via @vercel/og or canvas
