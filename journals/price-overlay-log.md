# Price Overlay Feature Log

**Date:** 2026-02-16
**Commit:** ff9a0ce

## What was built

### `app/src/lib/price-feed.ts`
- CoinGecko free API client (`fetchPriceHistory`)
- Maps resolution sources → CoinGecko IDs: SOL/USD→solana, BTC/USD→bitcoin, ETH/USD→ethereum
- 1-minute in-memory cache to avoid redundant fetches
- Returns `PriceInfo` with `currentPrice`, `change24h`, and `history[]`
- `isPriceMarket()` helper to detect price-feed markets

### Market Detail Page Updates
- **Dual-axis ComposedChart**: left axis = probability (¢), right axis = asset price ($)
- **Green area** (#22c55e) for probability, **purple line** (#7c5cfc) for asset price
- **Target price** shown as dashed yellow/orange reference line when `resolutionValue` exists
- **Live price** displayed prominently in the price display section (3-column layout)
- **Custom tooltip** showing both probability and price at hovered point
- **Price stats card** with current price, 24h change (green/red), and target price
- **Time range toggles** refetch CoinGecko data: 1H/6H/24H→1 day, 7D→7 days
- **Non-price markets** show only probability chart (no overlay, no price card)
- Loading spinner shown while fetching price data

## Technical notes
- No new packages added
- Uses recharts `ComposedChart`, `Line`, `Area`, `ReferenceLine`, dual `YAxis`
- Data alignment: takes min(probPoints, pricePoints) from the tail of each series
- Errors from CoinGecko silently fall back to probability-only chart
