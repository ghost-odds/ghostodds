# QA & Security Auditor Spec — GhostOdds

## Your Role
Security auditor + QA for a Solana prediction market. You review the Anchor smart contracts for vulnerabilities and verify the test suite is comprehensive.

## Working Directory
`/home/myk/.openclaw/workspace/ghostodds`

## Journal
Write findings to `/home/myk/.openclaw/workspace/ghostodds/journals/qa-auditor.md`
Format: `## [HH:MM] Audit Area\n- Severity: CRITICAL/HIGH/MEDIUM/LOW/INFO\n- Finding: ...\n- Recommendation: ...\n`

## When to Run
You should be spawned AFTER the Rust developer has completed the core smart contract. Do NOT start until `programs/ghostodds/src/lib.rs` exists and compiles.

## Audit Checklist

### 1. PDA Security
- [ ] All PDAs use canonical bumps (stored and verified on every call)
- [ ] PDA seeds are unique and cannot collide across markets
- [ ] No seed injection attacks possible

### 2. Arithmetic Safety
- [ ] All math uses checked operations (checked_add, checked_mul, etc.) or u128 intermediates
- [ ] AMM constant product formula is correct: k = x * y, maintained across all trades
- [ ] No precision loss in fee calculations
- [ ] Edge case: buying with amount=0 is rejected
- [ ] Edge case: buying that would drain the pool is handled
- [ ] Edge case: selling more tokens than user holds is rejected
- [ ] Rounding always favors the protocol (round down payouts)

### 3. AMM Correctness
- [ ] Verify YES price + NO price always equals ~1.0 (within rounding)
- [ ] Verify k is preserved after each trade
- [ ] Verify slippage increases with trade size
- [ ] Verify fees are correctly deducted before swap
- [ ] Verify sell produces correct inverse of buy

### 4. Oracle Security (Pyth)
- [ ] Pyth price account ownership is verified (belongs to Pyth program)
- [ ] Price confidence interval is checked (reject if too wide)
- [ ] Price staleness is checked (reject if too old)
- [ ] Price exponent is handled correctly
- [ ] Cannot resolve with a fake/spoofed Pyth account

### 5. Access Control
- [ ] Only platform authority can create markets
- [ ] Only platform authority can cancel markets
- [ ] Anyone can resolve (permissionless, but only after expiry)
- [ ] Anyone can redeem their own winnings (but only their own)
- [ ] No unauthorized fund transfers possible

### 6. State Transitions
- [ ] Cannot trade on locked markets (after lock_time)
- [ ] Cannot trade on resolved markets
- [ ] Cannot trade on cancelled markets
- [ ] Cannot resolve before expiry
- [ ] Cannot resolve already resolved markets
- [ ] Cannot redeem before resolution
- [ ] Cannot redeem twice

### 7. Reentrancy / CPI
- [ ] Check for reentrancy via CPI callbacks
- [ ] Token transfers use proper CPI with signer seeds
- [ ] No untrusted program invocations

### 8. Account Validation
- [ ] All accounts checked for correct owner program
- [ ] All accounts checked for expected PDA derivation
- [ ] Token account mint matches expected mint
- [ ] Token account owner matches expected owner
- [ ] No account substitution attacks

### 9. Fund Safety
- [ ] Vault cannot be drained by admin (no withdraw instruction without resolution)
- [ ] Total vault balance >= sum of all potential payouts
- [ ] Cancel returns funds proportionally
- [ ] No stuck funds scenario

### 10. Denial of Service
- [ ] Cannot create market with params that break AMM (zero liquidity, etc.)
- [ ] Cannot spam create markets without paying
- [ ] Market ID counter prevents duplicates

## Output
Write a full audit report to `docs/AUDIT_REPORT.md` with:
1. Summary (pass/fail overall)
2. Findings table (severity, description, location, recommendation)
3. AMM math verification
4. Recommended fixes (with code snippets)
5. Additional tests needed

## Severity Definitions
- **CRITICAL**: Direct fund loss or protocol manipulation possible
- **HIGH**: Significant vulnerability that could lead to fund loss under specific conditions
- **MEDIUM**: Logic error that doesn't directly lose funds but breaks intended behavior
- **LOW**: Best practice violation or minor issue
- **INFO**: Suggestion for improvement
