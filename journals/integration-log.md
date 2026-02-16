# Frontend ↔ Smart Contract Integration Log

**Date:** 2026-02-16  
**Commit:** fd9d60e  
**Branch:** master  

## Summary

Replaced all mock/demo data in the Next.js frontend with real Solana devnet on-chain interactions via Anchor.

## What Changed

### New Files
- **`app/src/lib/idl.ts`** — Hand-crafted IDL matching the deployed program (all 8 instructions, 3 account types, 22 error codes)
- **`app/src/lib/anchor.ts`** — Anchor client service with:
  - PDA derivation helpers (platform, market, position, yes/no mint, vault)
  - `fetchAllMarkets()`, `fetchMarket()`, `fetchPlatform()`, `fetchUserPositions()`
  - `buyOutcome()` with AMM slippage calculation and ATA creation
  - `sellOutcome()` with proper token burn flow
  - `redeemWinnings()` for resolved markets
  - `createMarket()` for admin
  - `computePrices()` from AMM reserves (CPMM: yes_price = no_reserve / total)
- **`app/src/lib/useMarkets.ts`** — React hooks `useMarkets()` and `useMarket(id)` with auto-refresh (30s/15s)
- **`app/src/lib/usePositions.ts`** — React hook `usePositions()` reading UserPosition PDAs filtered by wallet
- **`app/src/lib/format.ts`** — Extracted `formatUSD()` and `formatTimeRemaining()`
- **`scripts/setup-devnet.ts`** — Devnet initialization script (creates USDC mint, platform, 5 test markets)

### Modified Files
- **Homepage** — Fetches markets from chain, shows loading spinner and empty ghost state
- **Market Detail** — Reads single market from chain, shows on-chain info (PDA, fee), resolution details
- **TradingPanel** — Real buy/sell with Anchor transactions, AMM output estimation, wallet confirmation flow, proper error handling
- **Portfolio** — Reads UserPosition PDAs, shows real token balances, redeem button calls `redeemWinnings`
- **Admin** — Real `createMarket` instruction, live stats from on-chain data
- **WalletProvider** — Reads RPC URL from `NEXT_PUBLIC_RPC_URL` env var
- **MarketCard** — Decoupled from mock data imports

### Removed Files
- `mock-data.ts`, `positions-store.ts`, `PriceChart.tsx`, `demo/page.tsx`

## Architecture

```
User Wallet (Phantom/Solflare)
    ↓ @solana/wallet-adapter-react
Next.js Frontend
    ↓ AnchorProvider
anchor.ts (IDL + instruction wrappers)
    ↓ RPC
Solana Devnet Program (FU64Eoti...)
```

## Environment Variables (app/.env.local)
```
NEXT_PUBLIC_USDC_MINT=<devnet USDC mint address>
NEXT_PUBLIC_PROGRAM_ID=FU64EotiwqACVJ9hyhH6XA9iiqQKmWjmPTUmSF1i3ar9
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
```

## Next Steps
1. Run `scripts/setup-devnet.ts` to initialize platform and seed test markets
2. Test wallet connection and trading flow end-to-end
3. Add transaction history from on-chain events (optional)
4. Add price chart from historical AMM snapshots (optional)
