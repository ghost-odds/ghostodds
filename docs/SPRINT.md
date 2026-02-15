# GhostOdds Night Sprint — Master Plan

## Sprint Goal
Deliver a working MVP prediction market on Solana devnet with polished UI.

## Architecture

```
ghostodds/
├── programs/ghostodds/        # Anchor smart contract (Rust)
├── app/                       # Next.js 14 + Tailwind frontend
├── resolver/                  # Node.js crank service (Pyth oracle auto-resolution)
├── tests/                     # Anchor test suite
├── docs/                      # Specs, design, architecture
├── journals/                  # Agent work logs
└── specs/                     # Detailed specs per component
```

## Team & Responsibilities

| Agent | Role | Scope |
|-------|------|-------|
| PM (main) | Project Manager | Coordination, decisions, reviews, blockers |
| rust-dev | Solana/Anchor Developer | Smart contracts, AMM, Pyth integration, tests |
| frontend-dev | Next.js Developer | UI, wallet connect, trading panel, admin |
| qa-auditor | QA + Security Auditor | Contract audit, test coverage, exploit vectors |

## Task Breakdown

### Phase A: Foundation (First)
- [x] Project scaffold & git init
- [ ] Architecture spec & design system doc
- [ ] Anchor project setup with account structures
- [ ] Next.js app scaffold with Tailwind + wallet adapter

### Phase B: Core Smart Contract
- [ ] Market account structure (PDA design)
- [ ] `create_market` instruction
- [ ] `buy_outcome` instruction (AMM constant product)
- [ ] `sell_outcome` instruction
- [ ] `resolve_market` instruction (Pyth oracle)
- [ ] `redeem_winnings` instruction
- [ ] AMM math with u128 precision
- [ ] Admin authority for market creation
- [ ] Network toggle (devnet/mainnet config)

### Phase C: Frontend
- [ ] Wallet connect (Phantom, Solflare)
- [ ] Market list page
- [ ] Market detail page with trading panel
- [ ] Buy/sell flow (connected to contracts)
- [ ] Portfolio page (positions, P&L)
- [ ] Admin page (create markets)
- [ ] Share cards for Twitter/X
- [ ] Demo mode (/demo with prefilled markets)
- [ ] Responsive design

### Phase D: Infrastructure
- [ ] Resolver crank service (Pyth price monitoring)
- [ ] Admin panel with statistics
- [ ] Devnet deployment scripts

### Phase E: Security & QA
- [ ] PDA seed collision review
- [ ] Integer overflow audit (AMM math)
- [ ] Oracle manipulation review (Pyth confidence)
- [ ] Reentrancy analysis
- [ ] Authority check audit
- [ ] Account ownership validation
- [ ] Full test suite on devnet

## Key Design Decisions

1. **Collateral**: USDC (SPL token) — standard for prediction markets
2. **AMM**: Constant product (x*y=k) for binary outcomes (YES/NO tokens)
3. **Liquidity**: Platform-seeded at 50/50 on market creation
4. **Resolution**: Pyth oracle auto-resolution, markets lock 12h before expiry
5. **Fees**: 2% on trades, split platform/creator (Phase 2)
6. **Authority**: Single admin key for Phase 1, can create/cancel markets
7. **Demo mode**: Real devnet deployment at /demo with pre-created markets
8. **No token**: No governance token in Phase 1
9. **Geo-block**: US IP blocking on frontend (Phase 2)
10. **Git identity**: ghostodds / dev@ghostodds.com — no AI mentions

## Communication Protocol

- Each agent writes to `journals/<agent-name>.md` after completing each task
- PM checks journals every 30 min via cron
- Blockers go to journal immediately with `[BLOCKER]` tag
- Decisions logged in `docs/DECISIONS.md`
- If agent is stuck > 15 min, escalate to PM

## Failsafes

1. **Cron monitoring**: PM checks agent status every 30 min
2. **Journal-based coordination**: Agents read/write journals, not dependent on real-time chat
3. **Self-contained specs**: Each agent gets a complete spec file, no ambiguity
4. **Incremental commits**: Commit after each working milestone
5. **Fallback**: If smart contract blocks frontend, frontend uses mock data layer
6. **Error recovery**: Agents document errors in journals, PM adjusts plan

## Progress Tracking

Updated by PM during reviews.

| Component | Status | Last Update | Notes |
|-----------|--------|-------------|-------|
| Anchor setup | 🔴 Not started | - | - |
| Smart contract | 🔴 Not started | - | - |
| Frontend scaffold | 🔴 Not started | - | - |
| Frontend pages | 🔴 Not started | - | - |
| Resolver service | 🔴 Not started | - | - |
| Security audit | 🔴 Not started | - | - |
| Demo mode | 🔴 Not started | - | - |
| Tests | 🔴 Not started | - | - |
