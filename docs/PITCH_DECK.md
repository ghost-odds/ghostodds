# GhostOdds — Pitch Deck

## Slide 1: Title
**GhostOdds**
*Predict. Trade. No trace.*
No-KYC Decentralized Prediction Markets on Solana

---

## Slide 2: The Problem
The prediction market industry hit **$27.9B in 2025** (210% YoY growth).
Yet every major platform has critical flaws:

| Pain Point | Impact |
|------------|--------|
| **KYC walls** | Excludes millions of global crypto-native users |
| **Oracle manipulation** | $7M stolen on Polymarket via UMA whale attack (Mar 2025) |
| **Slow resolution** | 24-48h dispute windows lock capital after obvious outcomes |
| **Gatekept markets** | Users can't create the markets they actually want |
| **No social betting** | Zero platforms support private group predictions |

---

## Slide 3: The Solution
**GhostOdds eliminates every friction point:**

- 🔓 **No KYC** — Connect wallet and trade. Period.
- 🤖 **Auto-resolution** — Pyth oracle resolves in seconds, not days. Zero human involvement.
- 🔒 **Immutable contracts** — No admin keys that can drain funds. Code is law.
- ⚡ **Sub-cent fees** — Solana transaction costs. 2% trading fee.
- 🌐 **Open source** — Full transparency. Trust the code, not the team.

---

## Slide 4: How It Works
1. **Connect** any Solana wallet (Phantom, Solflare)
2. **Browse** prediction markets on crypto prices
3. **Trade** YES/NO outcome tokens via AMM (constant product)
4. **Auto-resolve** — Pyth oracle reads the price at expiry
5. **Redeem** winnings instantly

Markets lock 12h before expiry to prevent frontrunning.
Resolution happens within seconds of expiry timestamp.

---

## Slide 5: Technical Architecture
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Next.js UI  │────▶│ Anchor Smart │────▶│ Pyth Oracle │
│  (Tailwind)  │     │  Contract    │     │  (400ms)    │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │
       ▼                    ▼
┌─────────────┐     ┌──────────────┐
│   Phantom/   │     │  USDC Vault  │
│   Solflare   │     │  (PDA-owned) │
└─────────────┘     └──────────────┘
```

**Smart Contract**: 678 lines of Rust/Anchor
- 8 instructions (create, buy, sell, resolve, redeem, cancel)
- AMM with u128 math precision
- All accounts validated via Anchor constraints
- 15/15 tests passing on devnet

**Frontend**: Next.js 14 + Tailwind
- 5 routes (Markets, Detail, Portfolio, Admin, Demo)
- Dark theme, crypto-native design
- Real-time price charts and trading panel

---

## Slide 6: Market Opportunity
| Metric | Value |
|--------|-------|
| 2025 prediction market volume | $27.9B |
| YoY growth | 210% |
| Polymarket single-question volume | $3.6B |
| Kalshi valuation | $11B |
| Robinhood event market revenue | $300M/yr |
| **Underserved no-KYC market** | **Massive & growing** |

Every major platform requires KYC. We don't.

---

## Slide 7: Competitive Positioning
| | Polymarket | Kalshi | Drift BET | **GhostOdds** |
|--|-----------|--------|-----------|--------------|
| KYC | Yes | Full KYC | No | **No** |
| Chain | Polygon | Centralized | Solana | **Solana** |
| Resolution | UMA (manipulable) | Internal team | Multisig | **Pyth auto** |
| Market creation | Curated | Curated | Council | **Platform→Permissionless** |
| Speed | Minutes | Manual | Hours | **Seconds** |
| Fund safety | Admin keys | Centralized | Multisig | **Immutable PDA** |

---

## Slide 8: Product Roadmap

### Phase 1 (NOW — MVP)
- ✅ Anchor smart contract deployed to devnet
- ✅ Next.js frontend with full trading UI
- ✅ Platform-curated crypto price markets
- ✅ Pyth oracle auto-resolution
- ✅ Admin panel & demo mode
- 🔄 Security audit in progress

### Phase 2 (Q2 2026)
- Permissionless market creation with creator fees
- Telegram bot for private social betting
- Multi-asset support (stocks, events via custom oracles)
- Mobile-optimized PWA

### Phase 3 (Q3-Q4 2026)
- Governance token
- LP yield on deposited collateral
- Cross-chain via Wormhole
- SDK for third-party integrations

---

## Slide 9: Revenue Model
- **2% trading fee** on all trades (buy and sell)
- Phase 2: **Creator fee split** (1% creator / 1% protocol)
- Phase 3: **Premium features** (advanced analytics, API access)

At $100M monthly volume → **$2M/month revenue**
At $500M monthly volume → **$10M/month revenue**

---

## Slide 10: Budget & Team
**MVP Budget: $15-20K**
- Smart contract development & audit
- Frontend development
- Devnet infrastructure
- Initial market seeding (USDC liquidity)

**Current Status:**
- Smart contract: Complete (15/15 tests passing)
- Frontend: Complete (5 pages, full mock data)
- Security audit: In progress
- Demo: Live on devnet

---

## Slide 11: Why Now?
1. **Prediction markets are mainstream** — Polymarket proved the model in 2024
2. **Regulatory clarity emerging** — CFTC approved Kalshi, creating precedent
3. **No-KYC gap is widening** — Every platform adds more compliance, we go opposite
4. **Solana is the fastest L1** — Sub-second finality, sub-cent fees
5. **Pyth oracle is battle-tested** — Powers $100B+ in DeFi, 400ms updates

---

## Slide 12: Ask
**Seeking: Strategic partners & early liquidity providers**

- ghostodds.com (domain available)
- Open source smart contracts
- Live demo on Solana devnet
- Ready for mainnet deployment

*Predict. Trade. No trace.* 👻
