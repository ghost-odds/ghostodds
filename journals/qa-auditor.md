# QA Auditor Journal

## [21:22] Audit Started
- Read QA_AUDITOR_SPEC.md and lib.rs
- Beginning full security audit of GhostOdds prediction market

## [21:23] PDA Security Review
- All PDAs use canonical bumps via Anchor seeds/bump — PASS
- Seeds use market_id counter preventing collisions — PASS
- Bumps stored and verified on subsequent calls — PASS

## [21:24] Arithmetic & AMM Review
- All math uses checked operations — PASS
- Fee rounding uses ceil (round up, favors protocol) — PASS
- u128 intermediates for k calculation — PASS
- FINDING: k decreases slightly per trade due to integer division (favors protocol) — INFO
- FINDING: Fees stay in vault, never sent to treasury — HIGH

## [21:25] Oracle Security Review
- FINDING: No Pyth oracle integration exists despite spec requiring it — HIGH
- Resolution is purely authority-based

## [21:26] Access Control Review
- FINDING: resolve_market requires authority, spec says permissionless — MEDIUM
- cancel_market correctly requires authority — PASS
- FINDING: STATUS 1 referenced but never set — MEDIUM

## [21:27] Fund Safety Review
- FINDING: Fees accumulate in vault, never reach treasury — HIGH
- FINDING: platform.total_volume never incremented — LOW
- FINDING: sell_outcome doesn't update total_liquidity — LOW
- redeem_cancelled proportional math is correct — PASS

## [21:28] Account Validation Review
- All token accounts validated for mint and owner — PASS
- All PDAs validated via seeds constraints — PASS
- Market-stored keys cross-checked — PASS

## [21:29] Writing audit report
