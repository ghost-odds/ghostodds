use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, MintTo, Token, TokenAccount, Transfer};

declare_id!("5Q7Te3WTbG1Gm17GtPv61ddu3dVB7BqcvGM4S6LN6BZo");

// Constants
const MAX_QUESTION_LEN: usize = 256;
const MAX_DESCRIPTION_LEN: usize = 1024;
const MAX_CATEGORY_LEN: usize = 64;
const MAX_RESOLUTION_SOURCE_LEN: usize = 128;
const MIN_MARKET_DURATION: i64 = 86400; // 24 hours
const LOCK_BEFORE_EXPIRY: i64 = 43200; // 12 hours
const MAX_FEE_BPS: u16 = 1000; // 10%

// Market status
const STATUS_ACTIVE: u8 = 0;
const STATUS_LOCKED: u8 = 1;
const STATUS_RESOLVED: u8 = 2;
const STATUS_CANCELLED: u8 = 3;

// Resolution operators
const OP_ABOVE: u8 = 0;
const OP_BELOW: u8 = 1;
const OP_BETWEEN: u8 = 2;

#[program]
pub mod ghostodds {
    use super::*;

    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        fee_bps: u16,
    ) -> Result<()> {
        require!(fee_bps <= MAX_FEE_BPS, GhostOddsError::FeeTooHigh);

        let platform = &mut ctx.accounts.platform;
        platform.authority = ctx.accounts.authority.key();
        platform.market_count = 0;
        platform.total_volume = 0;
        platform.fee_bps = fee_bps;
        platform.treasury = ctx.accounts.treasury.key();
        platform.bump = ctx.bumps.platform;

        emit!(PlatformInitialized {
            authority: platform.authority,
            fee_bps,
            treasury: platform.treasury,
        });

        Ok(())
    }

    pub fn create_market(
        ctx: Context<CreateMarket>,
        question: String,
        description: String,
        category: String,
        resolution_source: String,
        resolution_value: Option<u64>,
        resolution_operator: u8,
        expires_at: i64,
        initial_liquidity: u64,
    ) -> Result<()> {
        require!(question.len() <= MAX_QUESTION_LEN, GhostOddsError::QuestionTooLong);
        require!(description.len() <= MAX_DESCRIPTION_LEN, GhostOddsError::DescriptionTooLong);
        require!(category.len() <= MAX_CATEGORY_LEN, GhostOddsError::CategoryTooLong);
        require!(
            resolution_source.len() <= MAX_RESOLUTION_SOURCE_LEN,
            GhostOddsError::ResolutionSourceTooLong
        );
        require!(
            resolution_operator <= OP_BETWEEN,
            GhostOddsError::InvalidOperator
        );
        require!(initial_liquidity > 0, GhostOddsError::ZeroAmount);

        let clock = Clock::get()?;
        let now = clock.unix_timestamp;
        require!(
            expires_at >= now.checked_add(MIN_MARKET_DURATION).ok_or(GhostOddsError::MathOverflow)?,
            GhostOddsError::ExpiryTooSoon
        );

        let lock_time = expires_at
            .checked_sub(LOCK_BEFORE_EXPIRY)
            .ok_or(GhostOddsError::MathOverflow)?;

        let platform = &mut ctx.accounts.platform;
        let market_id = platform.market_count;
        platform.market_count = platform
            .market_count
            .checked_add(1)
            .ok_or(GhostOddsError::MathOverflow)?;

        // Transfer initial liquidity from authority to vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.authority_collateral.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            initial_liquidity,
        )?;

        // Initial pool: 50/50 split
        let half = initial_liquidity
            .checked_div(2)
            .ok_or(GhostOddsError::MathOverflow)?;
        require!(half > 0, GhostOddsError::ZeroAmount);

        let market = &mut ctx.accounts.market;
        market.market_id = market_id;
        market.authority = ctx.accounts.authority.key();
        market.question = question.clone();
        market.description = description;
        market.category = category;
        market.collateral_mint = ctx.accounts.collateral_mint.key();
        market.yes_mint = ctx.accounts.yes_mint.key();
        market.no_mint = ctx.accounts.no_mint.key();
        market.vault = ctx.accounts.vault.key();
        market.yes_amount = half;
        market.no_amount = half;
        market.total_liquidity = initial_liquidity;
        market.volume = 0;
        market.resolution_source = resolution_source;
        market.resolution_value = resolution_value;
        market.resolution_operator = resolution_operator;
        market.created_at = now;
        market.expires_at = expires_at;
        market.lock_time = lock_time;
        market.resolved_at = None;
        market.outcome = None;
        market.status = STATUS_ACTIVE;
        market.fee_bps = platform.fee_bps;
        market.bump = ctx.bumps.market;

        emit!(MarketCreated {
            market_id,
            question,
            expires_at,
            initial_liquidity,
        });

        Ok(())
    }

    pub fn buy_outcome(
        ctx: Context<BuyOutcome>,
        amount: u64,
        is_yes: bool,
        min_tokens_out: u64,
    ) -> Result<()> {
        require!(amount > 0, GhostOddsError::ZeroAmount);

        let market = &ctx.accounts.market;
        let clock = Clock::get()?;
        let now = clock.unix_timestamp;

        require!(market.status == STATUS_ACTIVE, GhostOddsError::MarketNotActive);
        require!(now < market.lock_time, GhostOddsError::MarketLocked);

        // Calculate fee (rounding up in protocol's favor)
        let fee = (amount as u128)
            .checked_mul(market.fee_bps as u128)
            .ok_or(GhostOddsError::MathOverflow)?
            .checked_add(9999)
            .ok_or(GhostOddsError::MathOverflow)?
            .checked_div(10000)
            .ok_or(GhostOddsError::MathOverflow)? as u64;

        let input_after_fee = amount
            .checked_sub(fee)
            .ok_or(GhostOddsError::MathOverflow)?;
        require!(input_after_fee > 0, GhostOddsError::ZeroAmount);

        let yes_reserve = market.yes_amount;
        let no_reserve = market.no_amount;

        // AMM: constant product
        // k = yes_reserve * no_reserve
        // Buying YES: add input to no_reserve side, get YES out
        // Buying NO: add input to yes_reserve side, get NO out
        let (input_reserve, output_reserve) = if is_yes {
            (no_reserve, yes_reserve)
        } else {
            (yes_reserve, no_reserve)
        };

        let k = (input_reserve as u128)
            .checked_mul(output_reserve as u128)
            .ok_or(GhostOddsError::MathOverflow)?;

        let new_input_reserve = (input_reserve as u128)
            .checked_add(input_after_fee as u128)
            .ok_or(GhostOddsError::MathOverflow)?;

        let new_output_reserve = k
            .checked_div(new_input_reserve)
            .ok_or(GhostOddsError::MathOverflow)?;

        // tokens_out = output_reserve - new_output_reserve (round down for protocol)
        let tokens_out = (output_reserve as u128)
            .checked_sub(new_output_reserve)
            .ok_or(GhostOddsError::MathOverflow)? as u64;

        require!(tokens_out > 0, GhostOddsError::ZeroAmount);
        require!(tokens_out >= min_tokens_out, GhostOddsError::SlippageExceeded);

        // Transfer collateral from user to vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_collateral.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        // Mint outcome tokens to user
        let market_id_bytes = market.market_id.to_le_bytes();
        let seeds: &[&[u8]] = &[b"market", &market_id_bytes, &[market.bump]];
        let signer_seeds = &[seeds];

        let outcome_mint = if is_yes {
            ctx.accounts.yes_mint.to_account_info()
        } else {
            ctx.accounts.no_mint.to_account_info()
        };
        let user_outcome = if is_yes {
            ctx.accounts.user_yes_tokens.to_account_info()
        } else {
            ctx.accounts.user_no_tokens.to_account_info()
        };

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: outcome_mint,
                    to: user_outcome,
                    authority: ctx.accounts.market.to_account_info(),
                },
                signer_seeds,
            ),
            tokens_out,
        )?;

        // Update market state
        let market = &mut ctx.accounts.market;
        if is_yes {
            market.yes_amount = new_output_reserve as u64;
            market.no_amount = new_input_reserve as u64;
        } else {
            market.yes_amount = new_input_reserve as u64;
            market.no_amount = new_output_reserve as u64;
        }
        market.total_liquidity = market
            .total_liquidity
            .checked_add(amount)
            .ok_or(GhostOddsError::MathOverflow)?;
        market.volume = market
            .volume
            .checked_add(amount)
            .ok_or(GhostOddsError::MathOverflow)?;

        // Update user position
        let position = &mut ctx.accounts.user_position;
        position.user = ctx.accounts.user.key();
        position.market_id = market.market_id;
        if is_yes {
            position.yes_tokens = position
                .yes_tokens
                .checked_add(tokens_out)
                .ok_or(GhostOddsError::MathOverflow)?;
        } else {
            position.no_tokens = position
                .no_tokens
                .checked_add(tokens_out)
                .ok_or(GhostOddsError::MathOverflow)?;
        }
        position.total_deposited = position
            .total_deposited
            .checked_add(amount)
            .ok_or(GhostOddsError::MathOverflow)?;
        position.bump = ctx.bumps.user_position;

        emit!(OutcomePurchased {
            market_id: market.market_id,
            user: ctx.accounts.user.key(),
            is_yes,
            amount_in: amount,
            tokens_out,
            fee,
        });

        Ok(())
    }

    pub fn sell_outcome(
        ctx: Context<SellOutcome>,
        amount: u64,
        is_yes: bool,
        min_collateral_out: u64,
    ) -> Result<()> {
        require!(amount > 0, GhostOddsError::ZeroAmount);

        let market = &ctx.accounts.market;
        let clock = Clock::get()?;
        let now = clock.unix_timestamp;

        require!(market.status == STATUS_ACTIVE, GhostOddsError::MarketNotActive);
        require!(now < market.lock_time, GhostOddsError::MarketLocked);

        let yes_reserve = market.yes_amount;
        let no_reserve = market.no_amount;

        // Selling YES: add YES tokens back, get collateral (from no side)
        // Selling NO: add NO tokens back, get collateral (from yes side)
        let (input_reserve, output_reserve) = if is_yes {
            (yes_reserve, no_reserve)
        } else {
            (no_reserve, yes_reserve)
        };

        let k = (input_reserve as u128)
            .checked_mul(output_reserve as u128)
            .ok_or(GhostOddsError::MathOverflow)?;

        let new_input_reserve = (input_reserve as u128)
            .checked_add(amount as u128)
            .ok_or(GhostOddsError::MathOverflow)?;

        let new_output_reserve = k
            .checked_div(new_input_reserve)
            .ok_or(GhostOddsError::MathOverflow)?;

        let collateral_before_fee = (output_reserve as u128)
            .checked_sub(new_output_reserve)
            .ok_or(GhostOddsError::MathOverflow)? as u64;

        // Fee (round up for protocol)
        let fee = (collateral_before_fee as u128)
            .checked_mul(market.fee_bps as u128)
            .ok_or(GhostOddsError::MathOverflow)?
            .checked_add(9999)
            .ok_or(GhostOddsError::MathOverflow)?
            .checked_div(10000)
            .ok_or(GhostOddsError::MathOverflow)? as u64;

        let collateral_out = collateral_before_fee
            .checked_sub(fee)
            .ok_or(GhostOddsError::MathOverflow)?;

        require!(collateral_out > 0, GhostOddsError::ZeroAmount);
        require!(
            collateral_out >= min_collateral_out,
            GhostOddsError::SlippageExceeded
        );

        // Burn outcome tokens from user
        let outcome_mint = if is_yes {
            ctx.accounts.yes_mint.to_account_info()
        } else {
            ctx.accounts.no_mint.to_account_info()
        };
        let user_outcome = if is_yes {
            ctx.accounts.user_yes_tokens.to_account_info()
        } else {
            ctx.accounts.user_no_tokens.to_account_info()
        };

        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: outcome_mint,
                    from: user_outcome,
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        // Transfer collateral from vault to user
        let market_id_bytes = market.market_id.to_le_bytes();
        let seeds: &[&[u8]] = &[b"market", &market_id_bytes, &[market.bump]];
        let signer_seeds = &[seeds];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.user_collateral.to_account_info(),
                    authority: ctx.accounts.market.to_account_info(),
                },
                signer_seeds,
            ),
            collateral_out,
        )?;

        // Update market state
        let market = &mut ctx.accounts.market;
        if is_yes {
            market.yes_amount = new_input_reserve as u64;
            market.no_amount = new_output_reserve as u64;
        } else {
            market.no_amount = new_input_reserve as u64;
            market.yes_amount = new_output_reserve as u64;
        }
        market.volume = market
            .volume
            .checked_add(collateral_before_fee)
            .ok_or(GhostOddsError::MathOverflow)?;

        // Update user position
        let position = &mut ctx.accounts.user_position;
        if is_yes {
            position.yes_tokens = position
                .yes_tokens
                .checked_sub(amount)
                .ok_or(GhostOddsError::MathOverflow)?;
        } else {
            position.no_tokens = position
                .no_tokens
                .checked_sub(amount)
                .ok_or(GhostOddsError::MathOverflow)?;
        }
        position.total_withdrawn = position
            .total_withdrawn
            .checked_add(collateral_out)
            .ok_or(GhostOddsError::MathOverflow)?;

        emit!(OutcomeSold {
            market_id: market.market_id,
            user: ctx.accounts.user.key(),
            is_yes,
            tokens_in: amount,
            collateral_out,
            fee,
        });

        Ok(())
    }

    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        outcome: bool,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let clock = Clock::get()?;
        let now = clock.unix_timestamp;

        require!(
            market.status == STATUS_ACTIVE || market.status == STATUS_LOCKED,
            GhostOddsError::MarketNotActive
        );
        require!(now >= market.expires_at, GhostOddsError::MarketNotExpired);

        // In production, we'd read the Pyth price feed here and determine outcome.
        // For now we accept the outcome parameter but require authority.
        // Pyth integration would parse the price account, check confidence,
        // and compare against resolution_value using resolution_operator.
        require!(
            ctx.accounts.authority.key() == market.authority,
            GhostOddsError::Unauthorized
        );

        market.outcome = Some(outcome);
        market.resolved_at = Some(now);
        market.status = STATUS_RESOLVED;

        emit!(MarketResolved {
            market_id: market.market_id,
            outcome,
            resolved_at: now,
        });

        Ok(())
    }

    pub fn redeem_winnings(ctx: Context<RedeemWinnings>) -> Result<()> {
        let market = &ctx.accounts.market;
        require!(market.status == STATUS_RESOLVED, GhostOddsError::MarketNotResolved);

        let outcome = market.outcome.ok_or(GhostOddsError::MarketNotResolved)?;

        // Determine winning token amounts
        let (winning_amount, winning_mint, user_winning_account) = if outcome {
            (
                ctx.accounts.user_yes_tokens.amount,
                ctx.accounts.yes_mint.to_account_info(),
                ctx.accounts.user_yes_tokens.to_account_info(),
            )
        } else {
            (
                ctx.accounts.user_no_tokens.amount,
                ctx.accounts.no_mint.to_account_info(),
                ctx.accounts.user_no_tokens.to_account_info(),
            )
        };

        require!(winning_amount > 0, GhostOddsError::NoWinnings);

        // Calculate payout: (user_winning / total_winning_supply) * vault_balance
        let total_winning_supply = if outcome {
            ctx.accounts.yes_mint.supply
        } else {
            ctx.accounts.no_mint.supply
        };

        let vault_balance = ctx.accounts.vault.amount;
        let payout = (winning_amount as u128)
            .checked_mul(vault_balance as u128)
            .ok_or(GhostOddsError::MathOverflow)?
            .checked_div(total_winning_supply as u128)
            .ok_or(GhostOddsError::MathOverflow)? as u64;

        require!(payout > 0, GhostOddsError::NoWinnings);

        // Burn winning tokens
        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: winning_mint,
                    from: user_winning_account,
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            winning_amount,
        )?;

        // Transfer payout from vault
        let market_id_bytes = market.market_id.to_le_bytes();
        let seeds: &[&[u8]] = &[b"market", &market_id_bytes, &[market.bump]];
        let signer_seeds = &[seeds];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.user_collateral.to_account_info(),
                    authority: ctx.accounts.market.to_account_info(),
                },
                signer_seeds,
            ),
            payout,
        )?;

        // Update position
        let position = &mut ctx.accounts.user_position;
        if outcome {
            position.yes_tokens = 0;
        } else {
            position.no_tokens = 0;
        }
        position.total_withdrawn = position
            .total_withdrawn
            .checked_add(payout)
            .ok_or(GhostOddsError::MathOverflow)?;

        emit!(WinningsRedeemed {
            market_id: market.market_id,
            user: ctx.accounts.user.key(),
            payout,
        });

        Ok(())
    }

    pub fn cancel_market(ctx: Context<CancelMarket>) -> Result<()> {
        let market = &mut ctx.accounts.market;

        require!(
            ctx.accounts.authority.key() == market.authority,
            GhostOddsError::Unauthorized
        );
        require!(
            market.status == STATUS_ACTIVE || market.status == STATUS_LOCKED,
            GhostOddsError::MarketNotActive
        );
        require!(market.outcome.is_none(), GhostOddsError::AlreadyResolved);

        market.status = STATUS_CANCELLED;

        emit!(MarketCancelled {
            market_id: market.market_id,
        });

        Ok(())
    }

    pub fn redeem_cancelled(ctx: Context<RedeemCancelled>) -> Result<()> {
        let market = &ctx.accounts.market;
        require!(market.status == STATUS_CANCELLED, GhostOddsError::MarketNotCancelled);

        let yes_amount = ctx.accounts.user_yes_tokens.amount;
        let no_amount = ctx.accounts.user_no_tokens.amount;
        require!(yes_amount > 0 || no_amount > 0, GhostOddsError::NoWinnings);

        // Burn both token types
        let market_id_bytes = market.market_id.to_le_bytes();
        let seeds: &[&[u8]] = &[b"market", &market_id_bytes, &[market.bump]];
        let signer_seeds = &[seeds];

        if yes_amount > 0 {
            token::burn(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    Burn {
                        mint: ctx.accounts.yes_mint.to_account_info(),
                        from: ctx.accounts.user_yes_tokens.to_account_info(),
                        authority: ctx.accounts.user.to_account_info(),
                    },
                ),
                yes_amount,
            )?;
        }
        if no_amount > 0 {
            token::burn(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    Burn {
                        mint: ctx.accounts.no_mint.to_account_info(),
                        from: ctx.accounts.user_no_tokens.to_account_info(),
                        authority: ctx.accounts.user.to_account_info(),
                    },
                ),
                no_amount,
            )?;
        }

        // Proportional refund based on total tokens vs vault
        let total_yes_supply = ctx.accounts.yes_mint.supply;
        let total_no_supply = ctx.accounts.no_mint.supply;

        // After burning, the supply has decreased. We need pre-burn supply.
        let pre_burn_yes_supply = total_yes_supply
            .checked_add(yes_amount)
            .ok_or(GhostOddsError::MathOverflow)?;
        let pre_burn_no_supply = total_no_supply
            .checked_add(no_amount)
            .ok_or(GhostOddsError::MathOverflow)?;
        let total_tokens = pre_burn_yes_supply
            .checked_add(pre_burn_no_supply)
            .ok_or(GhostOddsError::MathOverflow)?;

        let user_tokens = yes_amount
            .checked_add(no_amount)
            .ok_or(GhostOddsError::MathOverflow)?;

        let vault_balance = ctx.accounts.vault.amount;
        let refund = (user_tokens as u128)
            .checked_mul(vault_balance as u128)
            .ok_or(GhostOddsError::MathOverflow)?
            .checked_div(total_tokens as u128)
            .ok_or(GhostOddsError::MathOverflow)? as u64;

        require!(refund > 0, GhostOddsError::NoWinnings);

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.user_collateral.to_account_info(),
                    authority: ctx.accounts.market.to_account_info(),
                },
                signer_seeds,
            ),
            refund,
        )?;

        emit!(CancelledRedeemed {
            market_id: market.market_id,
            user: ctx.accounts.user.key(),
            refund,
        });

        Ok(())
    }
}

// ============ Account Structures ============

#[account]
pub struct Platform {
    pub authority: Pubkey,
    pub market_count: u64,
    pub total_volume: u64,
    pub fee_bps: u16,
    pub treasury: Pubkey,
    pub bump: u8,
}

impl Platform {
    pub const LEN: usize = 8 + 32 + 8 + 8 + 2 + 32 + 1;
}

#[account]
pub struct Market {
    pub market_id: u64,
    pub authority: Pubkey,
    pub question: String,
    pub description: String,
    pub category: String,
    pub collateral_mint: Pubkey,
    pub yes_mint: Pubkey,
    pub no_mint: Pubkey,
    pub vault: Pubkey,
    pub yes_amount: u64,
    pub no_amount: u64,
    pub total_liquidity: u64,
    pub volume: u64,
    pub resolution_source: String,
    pub resolution_value: Option<u64>,
    pub resolution_operator: u8,
    pub created_at: i64,
    pub expires_at: i64,
    pub lock_time: i64,
    pub resolved_at: Option<i64>,
    pub outcome: Option<bool>,
    pub status: u8,
    pub fee_bps: u16,
    pub bump: u8,
}

impl Market {
    pub const LEN: usize = 8  // discriminator
        + 8   // market_id
        + 32  // authority
        + (4 + MAX_QUESTION_LEN)     // question
        + (4 + MAX_DESCRIPTION_LEN)  // description
        + (4 + MAX_CATEGORY_LEN)     // category
        + 32  // collateral_mint
        + 32  // yes_mint
        + 32  // no_mint
        + 32  // vault
        + 8   // yes_amount
        + 8   // no_amount
        + 8   // total_liquidity
        + 8   // volume
        + (4 + MAX_RESOLUTION_SOURCE_LEN) // resolution_source
        + (1 + 8)  // resolution_value Option<u64>
        + 1   // resolution_operator
        + 8   // created_at
        + 8   // expires_at
        + 8   // lock_time
        + (1 + 8)  // resolved_at Option<i64>
        + (1 + 1)  // outcome Option<bool>
        + 1   // status
        + 2   // fee_bps
        + 1;  // bump
}

#[account]
pub struct UserPosition {
    pub user: Pubkey,
    pub market_id: u64,
    pub yes_tokens: u64,
    pub no_tokens: u64,
    pub total_deposited: u64,
    pub total_withdrawn: u64,
    pub bump: u8,
}

impl UserPosition {
    pub const LEN: usize = 8 + 32 + 8 + 8 + 8 + 8 + 8 + 1;
}

// ============ Instruction Contexts ============

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(
        init,
        payer = authority,
        space = Platform::LEN,
        seeds = [b"platform"],
        bump,
    )]
    pub platform: Account<'info, Platform>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: Treasury wallet, validated by admin
    pub treasury: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateMarket<'info> {
    #[account(
        mut,
        seeds = [b"platform"],
        bump = platform.bump,
        constraint = platform.authority == authority.key() @ GhostOddsError::Unauthorized,
    )]
    pub platform: Account<'info, Platform>,
    #[account(
        init,
        payer = authority,
        space = Market::LEN,
        seeds = [b"market", platform.market_count.to_le_bytes().as_ref()],
        bump,
    )]
    pub market: Account<'info, Market>,
    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = market,
        seeds = [b"yes_mint", platform.market_count.to_le_bytes().as_ref()],
        bump,
    )]
    pub yes_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = market,
        seeds = [b"no_mint", platform.market_count.to_le_bytes().as_ref()],
        bump,
    )]
    pub no_mint: Account<'info, Mint>,
    pub collateral_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = authority,
        token::mint = collateral_mint,
        token::authority = market,
        seeds = [b"vault", platform.market_count.to_le_bytes().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = collateral_mint,
        token::authority = authority,
    )]
    pub authority_collateral: Account<'info, TokenAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct BuyOutcome<'info> {
    #[account(
        mut,
        seeds = [b"market", market.market_id.to_le_bytes().as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,
    #[account(
        mut,
        address = market.yes_mint,
    )]
    pub yes_mint: Account<'info, Mint>,
    #[account(
        mut,
        address = market.no_mint,
    )]
    pub no_mint: Account<'info, Mint>,
    #[account(
        mut,
        address = market.vault,
    )]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = market.collateral_mint,
        token::authority = user,
    )]
    pub user_collateral: Account<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = market.yes_mint,
        token::authority = user,
    )]
    pub user_yes_tokens: Account<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = market.no_mint,
        token::authority = user,
    )]
    pub user_no_tokens: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = user,
        space = UserPosition::LEN,
        seeds = [b"position", market.market_id.to_le_bytes().as_ref(), user.key().as_ref()],
        bump,
    )]
    pub user_position: Account<'info, UserPosition>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SellOutcome<'info> {
    #[account(
        mut,
        seeds = [b"market", market.market_id.to_le_bytes().as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,
    #[account(
        mut,
        address = market.yes_mint,
    )]
    pub yes_mint: Account<'info, Mint>,
    #[account(
        mut,
        address = market.no_mint,
    )]
    pub no_mint: Account<'info, Mint>,
    #[account(
        mut,
        address = market.vault,
    )]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = market.collateral_mint,
        token::authority = user,
    )]
    pub user_collateral: Account<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = market.yes_mint,
        token::authority = user,
    )]
    pub user_yes_tokens: Account<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = market.no_mint,
        token::authority = user,
    )]
    pub user_no_tokens: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"position", market.market_id.to_le_bytes().as_ref(), user.key().as_ref()],
        bump = user_position.bump,
    )]
    pub user_position: Account<'info, UserPosition>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(
        mut,
        seeds = [b"market", market.market_id.to_le_bytes().as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct RedeemWinnings<'info> {
    #[account(
        seeds = [b"market", market.market_id.to_le_bytes().as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,
    #[account(
        mut,
        address = market.yes_mint,
    )]
    pub yes_mint: Account<'info, Mint>,
    #[account(
        mut,
        address = market.no_mint,
    )]
    pub no_mint: Account<'info, Mint>,
    #[account(
        mut,
        address = market.vault,
    )]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = market.collateral_mint,
        token::authority = user,
    )]
    pub user_collateral: Account<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = market.yes_mint,
        token::authority = user,
    )]
    pub user_yes_tokens: Account<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = market.no_mint,
        token::authority = user,
    )]
    pub user_no_tokens: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"position", market.market_id.to_le_bytes().as_ref(), user.key().as_ref()],
        bump = user_position.bump,
    )]
    pub user_position: Account<'info, UserPosition>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelMarket<'info> {
    #[account(
        mut,
        seeds = [b"market", market.market_id.to_le_bytes().as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,
    #[account(
        constraint = authority.key() == market.authority @ GhostOddsError::Unauthorized,
    )]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct RedeemCancelled<'info> {
    #[account(
        seeds = [b"market", market.market_id.to_le_bytes().as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,
    #[account(
        mut,
        address = market.yes_mint,
    )]
    pub yes_mint: Account<'info, Mint>,
    #[account(
        mut,
        address = market.no_mint,
    )]
    pub no_mint: Account<'info, Mint>,
    #[account(
        mut,
        address = market.vault,
    )]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = market.collateral_mint,
        token::authority = user,
    )]
    pub user_collateral: Account<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = market.yes_mint,
        token::authority = user,
    )]
    pub user_yes_tokens: Account<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = market.no_mint,
        token::authority = user,
    )]
    pub user_no_tokens: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

// ============ Events ============

#[event]
pub struct PlatformInitialized {
    pub authority: Pubkey,
    pub fee_bps: u16,
    pub treasury: Pubkey,
}

#[event]
pub struct MarketCreated {
    pub market_id: u64,
    pub question: String,
    pub expires_at: i64,
    pub initial_liquidity: u64,
}

#[event]
pub struct OutcomePurchased {
    pub market_id: u64,
    pub user: Pubkey,
    pub is_yes: bool,
    pub amount_in: u64,
    pub tokens_out: u64,
    pub fee: u64,
}

#[event]
pub struct OutcomeSold {
    pub market_id: u64,
    pub user: Pubkey,
    pub is_yes: bool,
    pub tokens_in: u64,
    pub collateral_out: u64,
    pub fee: u64,
}

#[event]
pub struct MarketResolved {
    pub market_id: u64,
    pub outcome: bool,
    pub resolved_at: i64,
}

#[event]
pub struct WinningsRedeemed {
    pub market_id: u64,
    pub user: Pubkey,
    pub payout: u64,
}

#[event]
pub struct MarketCancelled {
    pub market_id: u64,
}

#[event]
pub struct CancelledRedeemed {
    pub market_id: u64,
    pub user: Pubkey,
    pub refund: u64,
}

// ============ Errors ============

#[error_code]
pub enum GhostOddsError {
    #[msg("Fee exceeds maximum allowed")]
    FeeTooHigh,
    #[msg("Question exceeds maximum length")]
    QuestionTooLong,
    #[msg("Description exceeds maximum length")]
    DescriptionTooLong,
    #[msg("Category exceeds maximum length")]
    CategoryTooLong,
    #[msg("Resolution source exceeds maximum length")]
    ResolutionSourceTooLong,
    #[msg("Invalid resolution operator")]
    InvalidOperator,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Market expiry is too soon (minimum 24 hours)")]
    ExpiryTooSoon,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Market is not active")]
    MarketNotActive,
    #[msg("Market is locked for trading")]
    MarketLocked,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    #[msg("Market has not expired yet")]
    MarketNotExpired,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Market is not resolved")]
    MarketNotResolved,
    #[msg("No winnings to redeem")]
    NoWinnings,
    #[msg("Market is already resolved")]
    AlreadyResolved,
    #[msg("Market is not cancelled")]
    MarketNotCancelled,
    #[msg("Price confidence too wide")]
    PriceConfidenceTooWide,
    #[msg("Price feed is stale")]
    PriceFeedStale,
}
