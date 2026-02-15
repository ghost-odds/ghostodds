# Frontend Developer Spec — GhostOdds

## Your Role
You are the Next.js frontend developer. Build a polished, crypto-native prediction market UI.

## Working Directory
`/home/myk/.openclaw/workspace/ghostodds/app`

## Git Rules
- User: `ghostodds` / `dev@ghostodds.com` (set in repo root already)
- NEVER mention AI, Claude, LLM, or any AI tool in commits or comments
- Commit messages: conventional commits (feat:, fix:, style:, refactor:)
- Commit after each working milestone

## Journal
Write progress to `/home/myk/.openclaw/workspace/ghostodds/journals/frontend-dev.md`
Format: `## [HH:MM] Task Name\n- Status: done/in-progress/blocked\n- Notes: ...\n- Blockers: ...\n`

## Tech Stack
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- @solana/web3.js + @solana/wallet-adapter-react
- @coral-xyz/anchor (client)
- lightweight-charts (TradingView) OR recharts for price charts
- Lucide React for icons
- Inter + JetBrains Mono fonts (Google Fonts)

## Design System
READ `/home/myk/.openclaw/workspace/ghostodds/docs/DESIGN_SYSTEM.md` for all colors, typography, component patterns.

## Pages & Routes

### `/` — Home / Market List
- Hero section: "Predict. Trade. No trace." + brief description + CTA
- Filter bar: All | Crypto | Trending | Ending Soon
- Search input
- Grid of market cards (responsive: 1/2/3 cols)
- Each card shows: question, YES price (big green number), volume, time remaining, category tag
- Sort by: Volume, Newest, Ending Soon

### `/market/[id]` — Market Detail
- 8/4 column split (content | trading panel)
- Left side:
  - Market question (large)
  - Description
  - Price chart (YES price over time)
  - Market info: volume, liquidity, created, expires, resolution source
  - Recent trades list
- Right side (Trading Panel):
  - YES/NO tab toggle (green/red active state)
  - Amount input (USDC) with quick-select buttons (10, 25, 50, 100, 250)
  - Current price display
  - Estimated shares output
  - Potential payout calculation
  - "Place Trade" button (full width, primary)
  - Fee breakdown (small text)
  - Slippage warning if > 2%

### `/portfolio` — User Portfolio
- Requires wallet connected
- Active positions table: Market, Side (YES/NO), Shares, Avg Price, Current Price, P&L, Actions
- Resolved positions (claimable): Market, Outcome, Shares, Payout, "Claim" button
- Total P&L summary at top

### `/admin` — Admin Panel
- Only visible if connected wallet matches admin authority
- Create Market form:
  - Question (text)
  - Description (textarea)
  - Category (dropdown: Crypto, DeFi, NFTs, Other)
  - Resolution Source (dropdown of Pyth feeds: SOL/USD, BTC/USD, ETH/USD)
  - Target Price (number input)
  - Operator (Above / Below)
  - Expiry (datetime picker)
  - Initial Liquidity (USDC amount)
- Active markets management table
- Platform statistics: total volume, total markets, active markets, fees collected

### `/demo` — Demo Mode
- Same as home page but:
  - Banner at top: "🔮 Demo Mode — Explore GhostOdds with devnet tokens"
  - Pre-filled with example markets
  - Airdrop devnet USDC button
  - All trading works on devnet
  - Clear visual indicator this is demo

## Components

### `WalletButton`
- Uses @solana/wallet-adapter
- Shows "Connect Wallet" when disconnected
- Shows truncated address + avatar when connected
- Dropdown: Copy Address, Disconnect
- Support Phantom and Solflare

### `MarketCard`
- Props: market data
- Hover effect: slight lift + border glow
- Click navigates to market detail
- Show YES price prominently
- Color-coded price change indicator

### `TradingPanel`
- State management for buy/sell flow
- Real-time price updates
- Transaction signing via wallet adapter
- Loading states during tx
- Success/error toasts

### `PriceChart`
- Lightweight chart showing YES price history
- Dark theme matching design system
- Timeframe selector: 1H, 6H, 24H, 7D

### `Navbar`
- Logo (text for now: "GhostOdds" in bold + ghost emoji)
- Links: Markets, Portfolio, Admin (conditional)
- Wallet connect button (right)
- Sticky top, glass-morphism background

### `ShareCard`
- OG meta tags for Twitter/X cards
- Server-rendered image at /api/og/[marketId]
- Shows: question, current price, branding

## Data Layer

### If smart contracts are ready:
- Use Anchor client to fetch on-chain data
- Subscribe to account changes for real-time updates
- Transaction building via Anchor methods

### If smart contracts are NOT ready (fallback):
- Create a mock data layer at `lib/mock-data.ts`
- Same interface as the real data layer
- Realistic fake markets with plausible data
- Toggle via environment variable: `NEXT_PUBLIC_USE_MOCK=true`
- This ensures frontend development is NEVER blocked by smart contract progress

## Mock Data Examples
```typescript
const MOCK_MARKETS = [
  {
    id: 1,
    question: "Will SOL be above $250 on March 1, 2026?",
    description: "Resolves YES if SOL/USD price on Pyth oracle is above $250.00 at 00:00 UTC on March 1, 2026.",
    category: "Crypto",
    yesPrice: 0.67,
    noPrice: 0.33,
    volume: 125000,
    liquidity: 50000,
    expiresAt: "2026-03-01T00:00:00Z",
    status: "active",
    resolutionSource: "Pyth: SOL/USD",
  },
  {
    id: 2,
    question: "Will BTC reach $150K before April 2026?",
    description: "Resolves YES if BTC/USD exceeds $150,000 at any point before April 1, 2026.",
    category: "Crypto",
    yesPrice: 0.42,
    noPrice: 0.58,
    volume: 890000,
    liquidity: 200000,
    expiresAt: "2026-04-01T00:00:00Z",
    status: "active",
    resolutionSource: "Pyth: BTC/USD",
  },
  // Add 6-8 more varied markets
];
```

## Environment Variables
```
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_PROGRAM_ID=<from programs/ghostodds/program-id.txt>
NEXT_PUBLIC_USE_MOCK=true  # false when contracts ready
NEXT_PUBLIC_ADMIN_WALLET=<admin public key>
```

## Performance
- Use React Server Components where possible
- Lazy load charts
- Skeleton loading states for all data-dependent components
- Debounce price input calculations

## Accessibility
- Proper ARIA labels
- Keyboard navigation
- Focus management on modals
- Screen reader friendly

## Install & Run
```bash
cd app
npx create-next-app@latest . --typescript --tailwind --app --src-dir
npm install @solana/web3.js @solana/wallet-adapter-react @solana/wallet-adapter-wallets @coral-xyz/anchor lucide-react
```
