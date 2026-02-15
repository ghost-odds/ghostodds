# Rust/Anchor Developer Spec — GhostOdds

## Your Role
You are the Solana smart contract developer. You write production-quality Anchor programs in Rust.

## Working Directory
`/home/myk/.openclaw/workspace/ghostodds`

## Git Rules
- User: `ghostodds` / `dev@ghostodds.com`
- NEVER mention AI, Claude, LLM, or any AI tool in commits or comments
- Commit messages: conventional commits (feat:, fix:, test:, refactor:)
- Commit after each working milestone

## Journal
Write progress to `/home/myk/.openclaw/workspace/ghostodds/journals/rust-dev.md`
Format: `## [HH:MM] Task Name\n- Status: done/in-progress/blocked\n- Notes: ...\n- Blockers: ...\n`

## Setup Requirements
1. Initialize Anchor project at `programs/ghostodds/`
2. Use Anchor 0.30+ (check what's installed or install latest)
3. Solana CLI configured for devnet
4. All tests in `tests/` directory

## Account Structures

### Market (PDA: seeds = [b"market", market_id.to_le_bytes()])
```rust
pub struct Market {
    pub market_id: u64,
    pub authority: Pubkey,           // admin who created it
    pub question: String,            // max 256 chars
    pub description: String,         // max 1024 chars
    pub category: String,            // max 64 chars
    pub collateral_mint: Pubkey,     // USDC mint address
    pub yes_mint: Pubkey,            // YES outcome token mint
    pub no_mint: Pubkey,             // NO outcome token mint
    pub vault: Pubkey,               // token account holding collateral
    pub yes_amount: u64,             // AMM pool YES tokens
    pub no_amount: u64,              // AMM pool NO tokens
    pub total_liquidity: u64,        // total USDC deposited
    pub volume: u64,                 // total trading volume
    pub resolution_source: String,   // e.g. "pyth:SOL/USD"
    pub resolution_value: Option<u64>, // target price (scaled to 6 decimals)
    pub resolution_operator: u8,     // 0=above, 1=below, 2=between
    pub created_at: i64,
    pub expires_at: i64,             // market expiry timestamp
    pub lock_time: i64,              // trading stops (12h before expiry)
    pub resolved_at: Option<i64>,
    pub outcome: Option<bool>,       // None=open, true=YES won, false=NO won
    pub status: u8,                  // 0=active, 1=locked, 2=resolved, 3=cancelled
    pub fee_bps: u16,                // fee in basis points (200 = 2%)
    pub bump: u8,
}
```

### UserPosition (PDA: seeds = [b"position", market_id.to_le_bytes(), user.key()])
```rust
pub struct UserPosition {
    pub user: Pubkey,
    pub market_id: u64,
    pub yes_tokens: u64,
    pub no_tokens: u64,
    pub total_deposited: u64,
    pub total_withdrawn: u64,
    pub bump: u8,
}
```

### Platform (PDA: seeds = [b"platform"])
```rust
pub struct Platform {
    pub authority: Pubkey,
    pub market_count: u64,
    pub total_volume: u64,
    pub fee_bps: u16,
    pub treasury: Pubkey,
    pub bump: u8,
}
```

## Instructions to Implement

### 1. `initialize_platform`
- Creates Platform PDA
- Sets admin authority and treasury
- One-time setup

### 2. `create_market`
- Only callable by platform authority
- Creates Market PDA, YES/NO token mints, vault
- Seeds initial liquidity (admin deposits USDC, gets 50/50 YES/NO tokens in pool)
- Initial pool: yes_amount = no_amount = initial_liquidity / 2
- Validates expiry > now + 24h, lock_time = expiry - 12h

### 3. `buy_outcome`
- User deposits USDC, receives YES or NO tokens
- AMM formula: `output = (input * output_reserve) / (input_reserve + input)`
- Apply fee BEFORE the swap (deduct fee from input)
- Use u128 intermediate calculations to prevent overflow
- Update pool reserves
- Update user position
- Cannot buy if market is locked/resolved/cancelled
- Emit event

### 4. `sell_outcome`
- User returns YES or NO tokens, receives USDC
- Reverse AMM: `output = (input * output_reserve) / (input_reserve + input)`
- Apply fee
- Update pool reserves
- Cannot sell if market is locked/resolved/cancelled

### 5. `resolve_market`
- Anyone can call (permissionless resolution)
- Reads Pyth price feed account
- Checks current time >= expires_at
- Compares price against resolution_value using resolution_operator
- Sets outcome and resolved_at
- Market status → resolved

### 6. `redeem_winnings`
- Only callable after resolution
- If user holds winning tokens: payout = (user_winning_tokens / total_winning_tokens) * vault_balance
- Burns user's winning tokens
- Transfers USDC from vault to user
- Handles case where user holds both YES and NO

### 7. `cancel_market`
- Only callable by authority
- Only before resolution
- Market status → cancelled
- Users can redeem deposited collateral proportionally

## AMM Math (CRITICAL — get this right)

```
// Constant product: x * y = k
// When buying YES with `input` USDC:
// fee = input * fee_bps / 10000
// input_after_fee = input - fee
// output_yes = (input_after_fee * yes_reserve) / (no_reserve + input_after_fee)
// Wait — need to think about this correctly for binary outcomes

// Actually for binary outcome AMM:
// Pool has YES tokens and NO tokens
// Buying YES means depositing collateral and getting YES tokens
// The AMM treats it as: swap collateral for YES
// Price of YES = no_reserve / (yes_reserve + no_reserve)  
// Price of NO = yes_reserve / (yes_reserve + no_reserve)
// These always sum to 1

// For the swap:
// k = yes_reserve * no_reserve
// After buying YES with `amount` collateral (after fee):
// new_no_reserve = no_reserve + amount
// new_yes_reserve = k / new_no_reserve
// yes_tokens_out = yes_reserve - new_yes_reserve

// USE u128 FOR k CALCULATION TO PREVENT OVERFLOW
```

## Pyth Integration
- Use `pyth-solana-receiver-sdk` crate
- Parse the Pyth price feed account in resolve_market
- Check price confidence interval (reject if too wide — > 1% of price)
- Price feed IDs for devnet:
  - SOL/USD: `0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d`
  - BTC/USD: `0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43`
  - ETH/USD: `0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace`

## Security Requirements
- ALL accounts must be checked for ownership (use Anchor constraints)
- Use `#[account(constraint = ...)]` for authorization checks
- No unchecked arithmetic — use checked_add, checked_mul, checked_div
- All PDAs must use canonical bumps (store and verify)
- Signer checks on all privileged operations
- Close accounts properly (return lamports to user)
- Test with malicious inputs (0 amounts, max u64, etc.)

## Test Suite
Write comprehensive tests for:
1. Platform initialization
2. Market creation with valid params
3. Market creation with invalid params (past expiry, etc.)
4. Buy YES tokens, verify reserves update correctly
5. Buy NO tokens
6. Sell YES tokens
7. Sell NO tokens
8. AMM pricing accuracy (spot price matches expected)
9. Resolution with mock Pyth feed
10. Redeem winnings after resolution
11. Cannot trade when locked
12. Cannot trade when resolved
13. Cancel and refund
14. Edge cases: minimum amounts, near-empty pool

## Deployment
- Deploy to devnet
- Save program ID to `programs/ghostodds/program-id.txt`
- Create a deployment script at `scripts/deploy.sh`
