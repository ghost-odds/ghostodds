# Market Detail Page Upgrade — 2026-02-16

## Summary
Rewrote `app/src/app/market/[id]/page.tsx` from a bare price+trading page into a professional, data-rich market detail view.

## Changes

### New file: `app/src/lib/mock-activity.ts`
- `generatePriceHistory()` — seeded random walk producing realistic price movements
- `generateRecentTrades()` — 10 fake trades with random base58 wallets, realistic amounts/prices
- `getMarketStats()` — total traders + 24h volume derived from market data
- `getDemoPDA()` — realistic-looking Solana address for demo markets
- All functions use seeded PRNG (based on marketId) for consistent data across refreshes

### Rewritten: `app/src/app/market/[id]/page.tsx`
1. **Price Chart** — recharts AreaChart with green line + gradient fill, 1H/6H/24H/7D range toggles, dynamic Y-axis
2. **Recent Trades** — 10 trades with YES (green) / NO (red) badges, dollar amounts, prices, truncated wallets, relative timestamps
3. **Stats Grid** — 6 cards: Volume, 24h Volume, Liquidity, Traders, Created, Expires
4. **Resolution Details** — expanded with oracle source, resolution criteria, fee info
5. **On-Chain Info** — PDA with copy button, oracle feed, network, explorer link
6. **Layout** — 2-col desktop (left=content, right=sticky trading panel), single-col mobile
7. **Demo indicator** — subtle "Demo" badge in header for demo markets

## Commit
`092e190` — pushed to master
