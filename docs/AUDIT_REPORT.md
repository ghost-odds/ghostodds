# GhostOdds Security Audit Report

**Contract:** `programs/ghostodds/src/lib.rs`
**Date:** 2026-02-15
**Auditor:** QA Security Auditor
**Scope:** Full smart contract security audit per QA_AUDITOR_SPEC.md

---

## Executive Summary

**Overall: CONDITIONAL PASS** — The contract has solid foundational security (PDA management, checked arithmetic, account validation) but contains several HIGH-severity issues around fee handling, missing oracle integration, and access control deviations from spec. No CRITICAL fund-loss vulnerabilities were found; funds cannot be directly stolen. However, the issues below must be addressed before mainnet deployment.

**Findings Summary:**

| # | Severity | Finding |
|---|----------|---------|
| 1 | HIGH | Fees accumulate in vault — never sent to treasury |
| 2 | HIGH | No Pyth oracle integration — resolution is centralized |
| 3 | HIGH | `resolve_market` requires authority — spec says permissionless |
| 4 | MEDIUM | Status `1` (locked) referenced but never set |
| 5 | MEDIUM | `UserPosition` tracking diverges from actual token balances |
| 6 | LOW | `platform.total_volume` never incremented |
| 7 | LOW | `sell_outcome` doesn't update `total_liquidity` |
| 8 | LOW | No `close` instruction to reclaim rent from expired markets |
| 9 | INFO | AMM `k` decreases slightly per trade due to integer division (favors protocol — acceptable) |
| 10 | INFO | Fee rounding uses ceiling (favors protocol — acceptable) |

---

## Detailed Findings

### Finding 1 — HIGH: Fees Never Reach Treasury

**Location:** `buy_outcome` (line ~118), `sell_outcome` (line ~160)

**Description:** Fees are calculated and deducted from trade amounts, but the fee portion is never transferred to the `treasury` address stored on `Platform`. Instead, fees remain in the vault and are eventually distributed to winners on resolution or to all holders on cancellation. The `treasury` field on `Platform` is written once during `initialize_platform` and never referenced again.

**Impact:** Platform operator earns zero revenue. All fees subsidize winning token holders instead.

**Recommendation:**
```rust
// In buy_outcome, after the main transfer, add:
if fee > 0 {
    token::transfer(
        CpiContext::new(ctx.accounts.token_program.to_account_info(), Transfer {
            from: ctx.accounts.user_collateral.to_account_info(),
            to: ctx.accounts.treasury.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        }),
        fee,
    )?;
}
```
Add `treasury` as a validated `TokenAccount` in both `BuyOutcome` and `SellOutcome` contexts. For sells, transfer fee from vault to treasury using market PDA signer seeds.

---

### Finding 2 — HIGH: No Pyth Oracle Integration

**Location:** `resolve_market` (line ~195)

**Description:** The spec requires Pyth oracle price verification including ownership checks, confidence interval validation, staleness checks, and exponent handling. None of this exists. Resolution is purely authority-based with a manually-passed `outcome: bool` parameter.

**Impact:** Markets cannot be trustlessly resolved. Users must trust the authority to report outcomes honestly. This is a centralization risk and removes the "permissionless resolution" property.

**Recommendation:** For oracle-resolved markets (where `resolution_source` and `resolution_value` are set), add:
```rust
// Add to ResolveMarket context:
/// CHECK: Pyth price account, validated in instruction
pub pyth_price_account: AccountInfo<'info>,

// In resolve_market:
use pyth_sdk_solana::load_price_feed_from_account_info;

let price_feed = load_price_feed_from_account_info(&ctx.accounts.pyth_price_account)
    .map_err(|_| GhostOddsError::InvalidOracle)?;
let current_price = price_feed
    .get_price_no_older_than(clock.unix_timestamp, 300) // 5 min staleness
    .ok_or(GhostOddsError::StalePriceData)?;
require!(
    current_price.conf as f64 / current_price.price as f64 <= 0.05,
    GhostOddsError::PriceConfidenceTooWide
);
// Validate owner is Pyth program
require!(
    ctx.accounts.pyth_price_account.owner == &PYTH_PROGRAM_ID,
    GhostOddsError::InvalidOracle
);
```

---

### Finding 3 — HIGH: `resolve_market` Not Permissionless

**Location:** `resolve_market` (line ~199)

**Description:** The spec states "Anyone can resolve (permissionless, but only after expiry)." The code requires `authority.key() == market.authority`, making resolution centralized. If the authority loses their key or becomes unresponsive, markets can never resolve and funds are permanently locked.

**Impact:** Single point of failure. Funds stuck if authority unavailable.

**Recommendation:** Either:
1. Remove the authority check (make permissionless, relying on oracle for correctness), or
2. Add a timelock: anyone can resolve after `expires_at + GRACE_PERIOD` if authority hasn't resolved
```rust
if clock.unix_timestamp < market.expires_at + RESOLUTION_GRACE_PERIOD {
    require!(ctx.accounts.authority.key() == market.authority, GhostOddsError::Unauthorized);
}
// After grace period, anyone can resolve (requires oracle)
```

---

### Finding 4 — MEDIUM: Status `1` Referenced but Never Set

**Location:** `resolve_market` (line ~197), `cancel_market` (line ~215)

**Description:** Both functions accept `market.status == 1` as valid, suggesting a "LOCKED" status was planned. However, no code path ever sets `status = 1`. There's no automatic transition from ACTIVE to LOCKED when `clock.unix_timestamp >= lock_time`.

**Impact:** The locked state exists conceptually (trading is blocked after `lock_time` via timestamp checks in buy/sell) but isn't reflected in the `status` field. This is confusing but not directly exploitable since buy/sell enforce `clock < lock_time` independently.

**Recommendation:** Either:
- Remove `|| market.status == 1` from both functions, or
- Add a `lock_market` instruction or set `status = 1` automatically (would require a crank)

---

### Finding 5 — MEDIUM: `UserPosition` Tracking Diverges from Actual Balances

**Location:** `UserPosition` struct, `buy_outcome`, `sell_outcome`

**Description:** `UserPosition` tracks `yes_tokens` and `no_tokens` but users can transfer SPL outcome tokens to other wallets freely. The position will then be inaccurate. Additionally, `redeem_winnings` and `redeem_cancelled` use actual `TokenAccount.amount` (correct), not the position (also correct). So the position is purely informational but potentially misleading.

**Impact:** No direct fund loss. But a user who received tokens via transfer has no `UserPosition` and would need one created (via `init_if_needed` in buy) before they could use the tracking. The actual redemption logic is safe since it reads token accounts directly.

**Recommendation:** Document that `UserPosition` is informational only, or enforce that outcome tokens can only be held in program-tracked accounts (freeze authority on mints).

---

### Finding 6 — LOW: `platform.total_volume` Never Updated

**Location:** `Platform` struct, all instructions

**Description:** `platform.total_volume` is initialized to `0` and never incremented. Only `market.volume` is tracked per-market.

**Recommendation:**
```rust
// In buy_outcome, after updating market:
let platform = &mut ctx.accounts.platform;
platform.total_volume = platform.total_volume.checked_add(amount).ok_or(GhostOddsError::MathOverflow)?;
```
Requires adding `platform` to `BuyOutcome` and `SellOutcome` contexts.

---

### Finding 7 — LOW: `sell_outcome` Doesn't Update `total_liquidity`

**Location:** `sell_outcome` (line ~185)

**Description:** `buy_outcome` increases `total_liquidity` by `amount`, but `sell_outcome` never decreases it. This field becomes monotonically increasing and meaningless.

**Recommendation:**
```rust
market.total_liquidity = market.total_liquidity.checked_sub(collateral_out).ok_or(GhostOddsError::MathOverflow)?;
```

---

### Finding 8 — LOW: No Account Closure / Rent Reclamation

**Description:** There are no `close` instructions for `Market`, `UserPosition`, or token accounts after a market is fully resolved and all redemptions complete. Rent SOL is permanently locked.

**Recommendation:** Add a `close_market` instruction (authority-only, after resolution + grace period) that closes vault, mints, and market account, returning rent to authority. Add `close_position` for users to reclaim their position account rent.

---

### Finding 9 — INFO: AMM k Decreases Slightly Per Trade

**Description:** `new_output_reserve = k / new_input_reserve` uses integer floor division, so `new_input * new_output <= k`. The constant product `k` decreases slightly with each trade. This is standard behavior that favors the protocol (users get slightly fewer tokens than continuous math would give).

**Status:** Acceptable. No action needed.

---

### Finding 10 — INFO: Fee Rounding Favors Protocol

**Description:** Fee calculation uses `(amount * fee_bps + 9999) / 10000` which rounds up (ceiling division). Users pay slightly more in fees on fractional amounts.

**Status:** Acceptable. Protocol should always round in its own favor.

---

## AMM Math Verification

### Constant Product Formula
- **Implementation:** `k = yes_amount * no_amount` (u128), `new_output = k / new_input` (floor division)
- **Correctness:** ✅ Standard xy=k AMM. k is weakly decreasing (floor division), which is safe.

### Price Sum Property
- YES price = `no_amount / (yes_amount + no_amount)`
- NO price = `yes_amount / (yes_amount + no_amount)`
- Sum = 1.0 ✅ (by construction, always exact)

### Slippage
- Larger trades move price more due to constant product curve ✅
- `min_tokens_out` / `min_collateral_out` slippage protection present ✅

### Fee Application
- Buy: fee deducted before swap (user gets fewer tokens) ✅
- Sell: fee deducted after swap (user gets less collateral) ✅
- Both favor protocol ✅

### Edge Cases
- `amount = 0` rejected ✅
- `tokens_out = 0` rejected (prevents dust trades) ✅
- `input_after_fee = 0` rejected ✅
- Pool drainage: impossible since `k/new_input > 0` when `k > 0` ✅

---

## Checklist Results

### 1. PDA Security ✅
- [x] Canonical bumps stored and verified
- [x] Unique seeds per market (market_id counter)
- [x] No seed injection possible

### 2. Arithmetic Safety ✅
- [x] All checked operations
- [x] u128 intermediates for k
- [x] Rounding favors protocol
- [x] Zero-amount rejected
- [x] Pool drain impossible
- [ ] ⚠️ Position tracking can underflow if tokens transferred externally (Finding 5)

### 3. AMM Correctness ✅
- [x] Prices sum to 1.0
- [x] k preserved (weakly decreasing)
- [x] Slippage increases with size
- [x] Fees correctly deducted
- [ ] ⚠️ Fees don't reach treasury (Finding 1)

### 4. Oracle Security ❌
- [ ] No Pyth integration (Finding 2)
- [ ] No confidence check
- [ ] No staleness check
- [ ] No ownership validation

### 5. Access Control ⚠️
- [x] Only authority creates markets
- [x] Only authority cancels markets
- [ ] Resolution not permissionless (Finding 3)
- [x] Anyone redeems own winnings
- [x] No unauthorized transfers

### 6. State Transitions ⚠️
- [x] Cannot trade on locked markets (timestamp check)
- [x] Cannot trade on resolved markets
- [x] Cannot trade on cancelled markets
- [x] Cannot resolve before expiry
- [x] Cannot resolve already resolved (status check)
- [x] Cannot redeem before resolution
- [x] Double redeem prevented (tokens burned)
- [ ] Status 1 never set (Finding 4)

### 7. Reentrancy / CPI ✅
- [x] All CPIs to trusted programs (SPL Token, System)
- [x] Signer seeds properly scoped
- [x] State updated after CPI where needed

### 8. Account Validation ✅
- [x] All accounts owner-checked via Anchor
- [x] PDA derivation enforced via seeds
- [x] Mint matching on all token accounts
- [x] Owner matching on all token accounts

### 9. Fund Safety ⚠️
- [x] Vault cannot be drained by admin
- [x] Cancel returns proportional funds
- [ ] Fees stuck in vault (Finding 1)
- [ ] Funds stuck if authority unavailable (Finding 3)
- [ ] Rent locked permanently (Finding 8)

### 10. Denial of Service ✅
- [x] Zero liquidity rejected
- [x] Market creation requires authority (rate-limited by design)
- [x] Market ID counter prevents duplicates

---

## Recommended Additional Tests

1. **Fee treasury transfer** — Verify fees arrive at treasury (once implemented)
2. **Authority loss scenario** — Test that markets can still resolve after grace period
3. **Token transfer + redeem** — Transfer outcome tokens to another wallet, verify redemption still works
4. **Multiple sequential redeems (cancelled)** — Verify proportional math holds for 3+ redeemers
5. **Max trade size** — Trade that would consume >99% of output reserve
6. **Minimum liquidity** — Create market with `initial_liquidity = 2` (minimum that passes `half > 0`)
7. **Concurrent markets** — Create 100+ markets, verify no seed collisions
8. **Status 1 behavior** — Verify system works correctly without explicit LOCKED status
9. **Oracle resolution** — End-to-end Pyth resolution test (once implemented)
10. **Rent reclamation** — Close accounts after full resolution cycle

---

## Conclusion

GhostOdds has a **solid security foundation**: proper PDA management, checked arithmetic throughout, comprehensive account validation, and safe AMM math. The core trading and redemption logic is sound — no direct fund theft vectors exist.

The three HIGH findings (fee routing, missing oracle, centralized resolution) are **feature gaps rather than exploitable vulnerabilities**, but they represent significant deviation from the spec and must be addressed before mainnet. The centralized resolution (Finding 3) is the highest priority as it creates a single point of failure that could permanently lock user funds.

**Recommended priority:**
1. Finding 3 — Add fallback permissionless resolution (fund safety)
2. Finding 1 — Route fees to treasury (revenue model)
3. Finding 2 — Integrate Pyth oracle (trustless resolution)
4. Finding 4 — Clean up status handling
5. Findings 6-8 — Polish and rent reclamation
