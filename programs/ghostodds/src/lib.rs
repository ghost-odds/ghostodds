use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::{self, Burn, InitializeAccount, InitializeMint, Mint, MintTo, Token, TokenAccount, Transfer};
use pyth_sdk_solana::state::SolanaPriceAccount;

declare_id!("FU64EotiwqACVJ9hyhH6XA9iiqQKmWjmPTUmSF1i3ar9");

const MAX_QUESTION_LEN: usize = 128;
const MAX_DESCRIPTION_LEN: usize = 200;
const MAX_CATEGORY_LEN: usize = 32;
const MAX_RESOLUTION_SOURCE_LEN: usize = 64;
const MIN_MARKET_DURATION: i64 = 86400;
const LOCK_BEFORE_EXPIRY: i64 = 43200;
const MAX_FEE_BPS: u16 = 1000;

const STATUS_ACTIVE: u8 = 0;
const STATUS_RESOLVED: u8 = 2;
const STATUS_CANCELLED: u8 = 3;

const MINT_SIZE: usize = 82;
const TOKEN_ACCOUNT_SIZE: usize = 165;

/// Grace period after expiry during which only the authority can resolve.
/// After this period, anyone can resolve using a Pyth oracle.
const RESOLUTION_GRACE_PERIOD: i64 = 86400; // 24 hours

/// Maximum staleness for Pyth price data (seconds).
const PYTH_MAX_STALENESS: u64 = 300; // 5 minutes

/// Maximum confidence interval as basis points of price.
const PYTH_MAX_CONF_BPS: u64 = 500; // 5%

#[program]
pub mod ghostodds {
    use super::*;

    pub fn initialize_platform(ctx: Context<InitializePlatform>, fee_bps: u16) -> Result<()> {
        require!(fee_bps <= MAX_FEE_BPS, GhostOddsError::FeeTooHigh);
        let platform = &mut ctx.accounts.platform;
        platform.authority = ctx.accounts.authority.key();
        platform.market_count = 0;
        platform.total_volume = 0;
        platform.fee_bps = fee_bps;
        platform.treasury = ctx.accounts.treasury.key();
        platform.bump = ctx.bumps.platform;
        emit!(PlatformInitialized { authority: platform.authority, fee_bps, treasury: platform.treasury });
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
        require!(resolution_source.len() <= MAX_RESOLUTION_SOURCE_LEN, GhostOddsError::ResolutionSourceTooLong);
        require!(resolution_operator <= 2, GhostOddsError::InvalidOperator);
        require!(initial_liquidity > 0, GhostOddsError::ZeroAmount);

        let clock = Clock::get()?;
        let now = clock.unix_timestamp;
        require!(
            expires_at >= now.checked_add(MIN_MARKET_DURATION).ok_or(GhostOddsError::MathOverflow)?,
            GhostOddsError::ExpiryTooSoon
        );
        let lock_time = expires_at.checked_sub(LOCK_BEFORE_EXPIRY).ok_or(GhostOddsError::MathOverflow)?;

        let platform = &mut ctx.accounts.platform;
        let market_id = platform.market_count;
        platform.market_count = platform.market_count.checked_add(1).ok_or(GhostOddsError::MathOverflow)?;

        let rent = Rent::get()?;
        let market_key = ctx.accounts.market.key();
        let market_id_bytes = market_id.to_le_bytes();

        // Create YES mint via CPI
        let yes_seeds: &[&[u8]] = &[b"yes_mint", market_id_bytes.as_ref(), &[ctx.bumps.yes_mint]];
        system_program::create_account(
            CpiContext::new_with_signer(ctx.accounts.system_program.to_account_info(),
                system_program::CreateAccount {
                    from: ctx.accounts.authority.to_account_info(),
                    to: ctx.accounts.yes_mint.to_account_info(),
                }, &[yes_seeds]),
            rent.minimum_balance(MINT_SIZE), MINT_SIZE as u64, &ctx.accounts.token_program.key(),
        )?;
        token::initialize_mint(
            CpiContext::new(ctx.accounts.token_program.to_account_info(),
                InitializeMint { mint: ctx.accounts.yes_mint.to_account_info(), rent: ctx.accounts.rent.to_account_info() }),
            6, &market_key, None,
        )?;

        // Create NO mint via CPI
        let no_seeds: &[&[u8]] = &[b"no_mint", market_id_bytes.as_ref(), &[ctx.bumps.no_mint]];
        system_program::create_account(
            CpiContext::new_with_signer(ctx.accounts.system_program.to_account_info(),
                system_program::CreateAccount {
                    from: ctx.accounts.authority.to_account_info(),
                    to: ctx.accounts.no_mint.to_account_info(),
                }, &[no_seeds]),
            rent.minimum_balance(MINT_SIZE), MINT_SIZE as u64, &ctx.accounts.token_program.key(),
        )?;
        token::initialize_mint(
            CpiContext::new(ctx.accounts.token_program.to_account_info(),
                InitializeMint { mint: ctx.accounts.no_mint.to_account_info(), rent: ctx.accounts.rent.to_account_info() }),
            6, &market_key, None,
        )?;

        // Create vault via CPI
        let vault_seeds: &[&[u8]] = &[b"vault", market_id_bytes.as_ref(), &[ctx.bumps.vault]];
        system_program::create_account(
            CpiContext::new_with_signer(ctx.accounts.system_program.to_account_info(),
                system_program::CreateAccount {
                    from: ctx.accounts.authority.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                }, &[vault_seeds]),
            rent.minimum_balance(TOKEN_ACCOUNT_SIZE), TOKEN_ACCOUNT_SIZE as u64, &ctx.accounts.token_program.key(),
        )?;
        token::initialize_account(
            CpiContext::new(ctx.accounts.token_program.to_account_info(),
                InitializeAccount {
                    account: ctx.accounts.vault.to_account_info(),
                    mint: ctx.accounts.collateral_mint.to_account_info(),
                    authority: ctx.accounts.market.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                }),
        )?;

        // Transfer initial liquidity
        token::transfer(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), Transfer {
                from: ctx.accounts.authority_collateral.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            }),
            initial_liquidity,
        )?;

        let half = initial_liquidity.checked_div(2).ok_or(GhostOddsError::MathOverflow)?;
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

        emit!(MarketCreated { market_id, question, expires_at, initial_liquidity });
        Ok(())
    }

    pub fn buy_outcome(ctx: Context<BuyOutcome>, amount: u64, is_yes: bool, min_tokens_out: u64) -> Result<()> {
        require!(amount > 0, GhostOddsError::ZeroAmount);
        let market = &ctx.accounts.market;
        let clock = Clock::get()?;
        require!(market.status == STATUS_ACTIVE, GhostOddsError::MarketNotActive);
        require!(clock.unix_timestamp < market.lock_time, GhostOddsError::MarketLocked);

        let fee = ((amount as u128)
            .checked_mul(market.fee_bps as u128).ok_or(GhostOddsError::MathOverflow)?
            .checked_add(9999).ok_or(GhostOddsError::MathOverflow)?
            .checked_div(10000).ok_or(GhostOddsError::MathOverflow)?) as u64;
        let input_after_fee = amount.checked_sub(fee).ok_or(GhostOddsError::MathOverflow)?;
        require!(input_after_fee > 0, GhostOddsError::ZeroAmount);

        let (input_reserve, output_reserve) = if is_yes {
            (market.no_amount, market.yes_amount)
        } else {
            (market.yes_amount, market.no_amount)
        };

        let k = (input_reserve as u128).checked_mul(output_reserve as u128).ok_or(GhostOddsError::MathOverflow)?;
        let new_input_reserve = (input_reserve as u128).checked_add(input_after_fee as u128).ok_or(GhostOddsError::MathOverflow)?;
        let new_output_reserve = k.checked_div(new_input_reserve).ok_or(GhostOddsError::MathOverflow)?;
        let tokens_out = ((output_reserve as u128).checked_sub(new_output_reserve).ok_or(GhostOddsError::MathOverflow)?) as u64;

        require!(tokens_out > 0, GhostOddsError::ZeroAmount);
        require!(tokens_out >= min_tokens_out, GhostOddsError::SlippageExceeded);

        // Transfer net amount (after fee) to vault
        token::transfer(CpiContext::new(ctx.accounts.token_program.to_account_info(), Transfer {
            from: ctx.accounts.user_collateral.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        }), input_after_fee)?;

        // Transfer fee directly to treasury
        if fee > 0 {
            token::transfer(CpiContext::new(ctx.accounts.token_program.to_account_info(), Transfer {
                from: ctx.accounts.user_collateral.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            }), fee)?;
        }

        let market_id_bytes = market.market_id.to_le_bytes();
        let signer_seeds: &[&[&[u8]]] = &[&[b"market", market_id_bytes.as_ref(), &[market.bump]]];
        let (mint_info, dest_info) = if is_yes {
            (ctx.accounts.yes_mint.to_account_info(), ctx.accounts.user_yes_tokens.to_account_info())
        } else {
            (ctx.accounts.no_mint.to_account_info(), ctx.accounts.user_no_tokens.to_account_info())
        };
        token::mint_to(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(),
            MintTo { mint: mint_info, to: dest_info, authority: ctx.accounts.market.to_account_info() }, signer_seeds),
            tokens_out)?;

        let market = &mut ctx.accounts.market;
        if is_yes {
            market.yes_amount = new_output_reserve as u64;
            market.no_amount = new_input_reserve as u64;
        } else {
            market.yes_amount = new_input_reserve as u64;
            market.no_amount = new_output_reserve as u64;
        }
        market.total_liquidity = market.total_liquidity.checked_add(input_after_fee).ok_or(GhostOddsError::MathOverflow)?;
        market.volume = market.volume.checked_add(amount).ok_or(GhostOddsError::MathOverflow)?;

        // Finding 6: increment platform total_volume
        let platform = &mut ctx.accounts.platform;
        platform.total_volume = platform.total_volume.checked_add(amount).ok_or(GhostOddsError::MathOverflow)?;

        let position = &mut ctx.accounts.user_position;
        position.user = ctx.accounts.user.key();
        position.market_id = market.market_id;
        if is_yes {
            position.yes_tokens = position.yes_tokens.checked_add(tokens_out).ok_or(GhostOddsError::MathOverflow)?;
        } else {
            position.no_tokens = position.no_tokens.checked_add(tokens_out).ok_or(GhostOddsError::MathOverflow)?;
        }
        position.total_deposited = position.total_deposited.checked_add(amount).ok_or(GhostOddsError::MathOverflow)?;
        position.bump = ctx.bumps.user_position;

        emit!(OutcomePurchased { market_id: market.market_id, user: ctx.accounts.user.key(), is_yes, amount_in: amount, tokens_out, fee });
        Ok(())
    }

    pub fn sell_outcome(ctx: Context<SellOutcome>, amount: u64, is_yes: bool, min_collateral_out: u64) -> Result<()> {
        require!(amount > 0, GhostOddsError::ZeroAmount);
        let market = &ctx.accounts.market;
        let clock = Clock::get()?;
        require!(market.status == STATUS_ACTIVE, GhostOddsError::MarketNotActive);
        require!(clock.unix_timestamp < market.lock_time, GhostOddsError::MarketLocked);

        let (input_reserve, output_reserve) = if is_yes {
            (market.yes_amount, market.no_amount)
        } else {
            (market.no_amount, market.yes_amount)
        };

        let k = (input_reserve as u128).checked_mul(output_reserve as u128).ok_or(GhostOddsError::MathOverflow)?;
        let new_input_reserve = (input_reserve as u128).checked_add(amount as u128).ok_or(GhostOddsError::MathOverflow)?;
        let new_output_reserve = k.checked_div(new_input_reserve).ok_or(GhostOddsError::MathOverflow)?;
        let collateral_before_fee = ((output_reserve as u128).checked_sub(new_output_reserve).ok_or(GhostOddsError::MathOverflow)?) as u64;

        let fee = ((collateral_before_fee as u128)
            .checked_mul(market.fee_bps as u128).ok_or(GhostOddsError::MathOverflow)?
            .checked_add(9999).ok_or(GhostOddsError::MathOverflow)?
            .checked_div(10000).ok_or(GhostOddsError::MathOverflow)?) as u64;
        let collateral_out = collateral_before_fee.checked_sub(fee).ok_or(GhostOddsError::MathOverflow)?;
        require!(collateral_out > 0, GhostOddsError::ZeroAmount);
        require!(collateral_out >= min_collateral_out, GhostOddsError::SlippageExceeded);

        let (mint_info, from_info) = if is_yes {
            (ctx.accounts.yes_mint.to_account_info(), ctx.accounts.user_yes_tokens.to_account_info())
        } else {
            (ctx.accounts.no_mint.to_account_info(), ctx.accounts.user_no_tokens.to_account_info())
        };
        token::burn(CpiContext::new(ctx.accounts.token_program.to_account_info(),
            Burn { mint: mint_info, from: from_info, authority: ctx.accounts.user.to_account_info() }), amount)?;

        let market_id_bytes = market.market_id.to_le_bytes();
        let signer_seeds: &[&[&[u8]]] = &[&[b"market", market_id_bytes.as_ref(), &[market.bump]]];

        // Transfer collateral to user
        token::transfer(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.user_collateral.to_account_info(),
            authority: ctx.accounts.market.to_account_info(),
        }, signer_seeds), collateral_out)?;

        // Transfer fee from vault to treasury
        if fee > 0 {
            token::transfer(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
                authority: ctx.accounts.market.to_account_info(),
            }, signer_seeds), fee)?;
        }

        let market = &mut ctx.accounts.market;
        if is_yes {
            market.yes_amount = new_input_reserve as u64;
            market.no_amount = new_output_reserve as u64;
        } else {
            market.no_amount = new_input_reserve as u64;
            market.yes_amount = new_output_reserve as u64;
        }
        market.volume = market.volume.checked_add(collateral_before_fee).ok_or(GhostOddsError::MathOverflow)?;

        // Finding 7: decrement total_liquidity on sell
        market.total_liquidity = market.total_liquidity.checked_sub(collateral_out).ok_or(GhostOddsError::MathOverflow)?;

        // Finding 6: increment platform total_volume
        let platform = &mut ctx.accounts.platform;
        platform.total_volume = platform.total_volume.checked_add(collateral_before_fee).ok_or(GhostOddsError::MathOverflow)?;

        let position = &mut ctx.accounts.user_position;
        if is_yes {
            position.yes_tokens = position.yes_tokens.checked_sub(amount).ok_or(GhostOddsError::MathOverflow)?;
        } else {
            position.no_tokens = position.no_tokens.checked_sub(amount).ok_or(GhostOddsError::MathOverflow)?;
        }
        position.total_withdrawn = position.total_withdrawn.checked_add(collateral_out).ok_or(GhostOddsError::MathOverflow)?;

        emit!(OutcomeSold { market_id: market.market_id, user: ctx.accounts.user.key(), is_yes, tokens_in: amount, collateral_out, fee });
        Ok(())
    }

    pub fn resolve_market(ctx: Context<ResolveMarket>, outcome: bool) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let clock = Clock::get()?;

        // Finding 4: remove status == 1 reference (never set)
        require!(market.status == STATUS_ACTIVE, GhostOddsError::MarketNotActive);
        require!(clock.unix_timestamp >= market.expires_at, GhostOddsError::MarketNotExpired);

        let grace_deadline = market.expires_at
            .checked_add(RESOLUTION_GRACE_PERIOD)
            .ok_or(GhostOddsError::MathOverflow)?;
        let within_grace = clock.unix_timestamp < grace_deadline;

        // Within grace period: only authority can resolve
        // After grace period: anyone can resolve (permissionless fallback)
        if within_grace {
            require!(
                ctx.accounts.resolver.key() == market.authority,
                GhostOddsError::Unauthorized
            );
        }

        // Determine outcome: use oracle for markets with resolution_value, manual otherwise
        let resolved_outcome = if let Some(resolution_value) = market.resolution_value {
            // Oracle-resolved market: require Pyth price account
            let pyth_info = ctx.accounts.pyth_price_account
                .as_ref()
                .ok_or(GhostOddsError::OracleRequired)?;

            // Validate owner is the Pyth v2 program
            let pyth_program_id: Pubkey = "FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH"
                .parse().unwrap();
            require!(
                *pyth_info.owner == pyth_program_id,
                GhostOddsError::InvalidOracle
            );

            let price_feed = SolanaPriceAccount::account_info_to_feed(&pyth_info)
                .map_err(|_| GhostOddsError::InvalidOracle)?;
            let current_price = price_feed
                .get_price_no_older_than(clock.unix_timestamp, PYTH_MAX_STALENESS)
                .ok_or(GhostOddsError::StalePriceData)?;

            // Validate confidence: conf / |price| <= 5%
            let abs_price = (current_price.price as i128).unsigned_abs();
            require!(abs_price > 0, GhostOddsError::InvalidOracle);
            let conf_bps = (current_price.conf as u128)
                .checked_mul(10000)
                .ok_or(GhostOddsError::MathOverflow)?
                .checked_div(abs_price)
                .ok_or(GhostOddsError::MathOverflow)?;
            require!(conf_bps <= PYTH_MAX_CONF_BPS as u128, GhostOddsError::PriceConfidenceTooWide);

            // Normalize price to compare with resolution_value (u64, 6 decimals assumed)
            let exponent = current_price.expo;
            let raw_price = current_price.price;
            require!(raw_price > 0, GhostOddsError::InvalidOracle);

            let normalized_price: u64 = if exponent >= 0 {
                (raw_price as u128)
                    .checked_mul(10u128.pow(6u32.checked_add(exponent as u32).ok_or(GhostOddsError::MathOverflow)?))
                    .ok_or(GhostOddsError::MathOverflow)? as u64
            } else {
                let neg_exp = (-exponent) as u32;
                if neg_exp <= 6 {
                    (raw_price as u128)
                        .checked_mul(10u128.pow(6 - neg_exp))
                        .ok_or(GhostOddsError::MathOverflow)? as u64
                } else {
                    (raw_price as u128)
                        .checked_div(10u128.pow(neg_exp - 6))
                        .ok_or(GhostOddsError::MathOverflow)? as u64
                }
            };

            // Compare using resolution_operator: 0 = >=, 1 = <=, 2 = ==
            match market.resolution_operator {
                0 => normalized_price >= resolution_value,
                1 => normalized_price <= resolution_value,
                2 => normalized_price == resolution_value,
                _ => return Err(GhostOddsError::InvalidOperator.into()),
            }
        } else {
            // Manual resolution: only authority can resolve (no permissionless fallback)
            if !within_grace {
                require!(
                    ctx.accounts.resolver.key() == market.authority,
                    GhostOddsError::Unauthorized
                );
            }
            outcome
        };

        market.outcome = Some(resolved_outcome);
        market.resolved_at = Some(clock.unix_timestamp);
        market.status = STATUS_RESOLVED;
        emit!(MarketResolved { market_id: market.market_id, outcome: resolved_outcome, resolved_at: clock.unix_timestamp });
        Ok(())
    }

    pub fn redeem_winnings(ctx: Context<RedeemWinnings>) -> Result<()> {
        let market = &ctx.accounts.market;
        require!(market.status == STATUS_RESOLVED, GhostOddsError::MarketNotResolved);
        let outcome = market.outcome.ok_or(GhostOddsError::MarketNotResolved)?;
        let winning_amount = if outcome { ctx.accounts.user_yes_tokens.amount } else { ctx.accounts.user_no_tokens.amount };
        require!(winning_amount > 0, GhostOddsError::NoWinnings);
        let total_winning_supply = if outcome { ctx.accounts.yes_mint.supply } else { ctx.accounts.no_mint.supply };
        let vault_balance = ctx.accounts.vault.amount;
        let payout = ((winning_amount as u128).checked_mul(vault_balance as u128).ok_or(GhostOddsError::MathOverflow)?
            .checked_div(total_winning_supply as u128).ok_or(GhostOddsError::MathOverflow)?) as u64;
        require!(payout > 0, GhostOddsError::NoWinnings);

        let (mint_info, from_info) = if outcome {
            (ctx.accounts.yes_mint.to_account_info(), ctx.accounts.user_yes_tokens.to_account_info())
        } else {
            (ctx.accounts.no_mint.to_account_info(), ctx.accounts.user_no_tokens.to_account_info())
        };
        token::burn(CpiContext::new(ctx.accounts.token_program.to_account_info(),
            Burn { mint: mint_info, from: from_info, authority: ctx.accounts.user.to_account_info() }), winning_amount)?;

        let market_id_bytes = market.market_id.to_le_bytes();
        let signer_seeds: &[&[&[u8]]] = &[&[b"market", market_id_bytes.as_ref(), &[market.bump]]];
        token::transfer(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), Transfer {
            from: ctx.accounts.vault.to_account_info(), to: ctx.accounts.user_collateral.to_account_info(),
            authority: ctx.accounts.market.to_account_info(),
        }, signer_seeds), payout)?;

        let position = &mut ctx.accounts.user_position;
        if outcome { position.yes_tokens = 0; } else { position.no_tokens = 0; }
        position.total_withdrawn = position.total_withdrawn.checked_add(payout).ok_or(GhostOddsError::MathOverflow)?;
        emit!(WinningsRedeemed { market_id: market.market_id, user: ctx.accounts.user.key(), payout });
        Ok(())
    }

    pub fn cancel_market(ctx: Context<CancelMarket>) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(ctx.accounts.authority.key() == market.authority, GhostOddsError::Unauthorized);
        // Finding 4: remove status == 1 reference
        require!(market.status == STATUS_ACTIVE, GhostOddsError::MarketNotActive);
        require!(market.outcome.is_none(), GhostOddsError::AlreadyResolved);
        market.status = STATUS_CANCELLED;
        emit!(MarketCancelled { market_id: market.market_id });
        Ok(())
    }

    pub fn redeem_cancelled(ctx: Context<RedeemCancelled>) -> Result<()> {
        let market = &ctx.accounts.market;
        require!(market.status == STATUS_CANCELLED, GhostOddsError::MarketNotCancelled);
        let yes_amount = ctx.accounts.user_yes_tokens.amount;
        let no_amount = ctx.accounts.user_no_tokens.amount;
        require!(yes_amount > 0 || no_amount > 0, GhostOddsError::NoWinnings);

        if yes_amount > 0 {
            token::burn(CpiContext::new(ctx.accounts.token_program.to_account_info(), Burn {
                mint: ctx.accounts.yes_mint.to_account_info(), from: ctx.accounts.user_yes_tokens.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            }), yes_amount)?;
        }
        if no_amount > 0 {
            token::burn(CpiContext::new(ctx.accounts.token_program.to_account_info(), Burn {
                mint: ctx.accounts.no_mint.to_account_info(), from: ctx.accounts.user_no_tokens.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            }), no_amount)?;
        }

        ctx.accounts.yes_mint.reload()?;
        ctx.accounts.no_mint.reload()?;
        let total_tokens = ctx.accounts.yes_mint.supply.checked_add(yes_amount).ok_or(GhostOddsError::MathOverflow)?
            .checked_add(ctx.accounts.no_mint.supply).ok_or(GhostOddsError::MathOverflow)?
            .checked_add(no_amount).ok_or(GhostOddsError::MathOverflow)?;
        let user_tokens = yes_amount.checked_add(no_amount).ok_or(GhostOddsError::MathOverflow)?;
        ctx.accounts.vault.reload()?;
        let vault_balance = ctx.accounts.vault.amount;
        let refund = ((user_tokens as u128).checked_mul(vault_balance as u128).ok_or(GhostOddsError::MathOverflow)?
            .checked_div(total_tokens as u128).ok_or(GhostOddsError::MathOverflow)?) as u64;
        require!(refund > 0, GhostOddsError::NoWinnings);

        let market_id_bytes = market.market_id.to_le_bytes();
        let signer_seeds: &[&[&[u8]]] = &[&[b"market", market_id_bytes.as_ref(), &[market.bump]]];
        token::transfer(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), Transfer {
            from: ctx.accounts.vault.to_account_info(), to: ctx.accounts.user_collateral.to_account_info(),
            authority: ctx.accounts.market.to_account_info(),
        }, signer_seeds), refund)?;

        emit!(CancelledRedeemed { market_id: market.market_id, user: ctx.accounts.user.key(), refund });
        Ok(())
    }
}

// ============ Accounts ============
#[account]
pub struct Platform {
    pub authority: Pubkey,
    pub market_count: u64,
    pub total_volume: u64,
    pub fee_bps: u16,
    pub treasury: Pubkey,
    pub bump: u8,
}
impl Platform { pub const LEN: usize = 8 + 32 + 8 + 8 + 2 + 32 + 1; }

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
    pub const LEN: usize = 8 + 8 + 32
        + (4 + MAX_QUESTION_LEN) + (4 + MAX_DESCRIPTION_LEN) + (4 + MAX_CATEGORY_LEN)
        + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 8
        + (4 + MAX_RESOLUTION_SOURCE_LEN) + (1 + 8) + 1
        + 8 + 8 + 8 + (1 + 8) + (1 + 1) + 1 + 2 + 1;
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
impl UserPosition { pub const LEN: usize = 8 + 32 + 8 + 8 + 8 + 8 + 8 + 1; }

// ============ Contexts ============
#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(init, payer = authority, space = Platform::LEN, seeds = [b"platform"], bump)]
    pub platform: Account<'info, Platform>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: Treasury address
    pub treasury: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(question: String, description: String, category: String, resolution_source: String, resolution_value: Option<u64>, resolution_operator: u8, expires_at: i64, initial_liquidity: u64)]
pub struct CreateMarket<'info> {
    #[account(
        mut, seeds = [b"platform"], bump = platform.bump,
        constraint = platform.authority == authority.key() @ GhostOddsError::Unauthorized,
    )]
    pub platform: Box<Account<'info, Platform>>,
    #[account(
        init, payer = authority, space = Market::LEN,
        seeds = [b"market", platform.market_count.to_le_bytes().as_ref()], bump,
    )]
    pub market: Box<Account<'info, Market>>,
    /// CHECK: YES mint PDA, created via CPI
    #[account(mut, seeds = [b"yes_mint", platform.market_count.to_le_bytes().as_ref()], bump)]
    pub yes_mint: UncheckedAccount<'info>,
    /// CHECK: NO mint PDA, created via CPI
    #[account(mut, seeds = [b"no_mint", platform.market_count.to_le_bytes().as_ref()], bump)]
    pub no_mint: UncheckedAccount<'info>,
    pub collateral_mint: Box<Account<'info, Mint>>,
    /// CHECK: Vault PDA, created via CPI
    #[account(mut, seeds = [b"vault", platform.market_count.to_le_bytes().as_ref()], bump)]
    pub vault: UncheckedAccount<'info>,
    #[account(
        mut,
        constraint = authority_collateral.mint == collateral_mint.key() @ GhostOddsError::Unauthorized,
        constraint = authority_collateral.owner == authority.key() @ GhostOddsError::Unauthorized,
    )]
    pub authority_collateral: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct BuyOutcome<'info> {
    #[account(mut, seeds = [b"market", market.market_id.to_le_bytes().as_ref()], bump = market.bump)]
    pub market: Box<Account<'info, Market>>,
    #[account(
        mut, seeds = [b"platform"], bump = platform.bump,
    )]
    pub platform: Box<Account<'info, Platform>>,
    #[account(mut, constraint = yes_mint.key() == market.yes_mint @ GhostOddsError::Unauthorized)]
    pub yes_mint: Box<Account<'info, Mint>>,
    #[account(mut, constraint = no_mint.key() == market.no_mint @ GhostOddsError::Unauthorized)]
    pub no_mint: Box<Account<'info, Mint>>,
    #[account(mut, constraint = vault.key() == market.vault @ GhostOddsError::Unauthorized)]
    pub vault: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = treasury.mint == market.collateral_mint @ GhostOddsError::Unauthorized,
        constraint = treasury.key() == platform.treasury @ GhostOddsError::Unauthorized,
    )]
    pub treasury: Box<Account<'info, TokenAccount>>,
    #[account(mut,
        constraint = user_collateral.mint == market.collateral_mint @ GhostOddsError::Unauthorized,
        constraint = user_collateral.owner == user.key() @ GhostOddsError::Unauthorized)]
    pub user_collateral: Box<Account<'info, TokenAccount>>,
    #[account(mut,
        constraint = user_yes_tokens.mint == market.yes_mint @ GhostOddsError::Unauthorized,
        constraint = user_yes_tokens.owner == user.key() @ GhostOddsError::Unauthorized)]
    pub user_yes_tokens: Box<Account<'info, TokenAccount>>,
    #[account(mut,
        constraint = user_no_tokens.mint == market.no_mint @ GhostOddsError::Unauthorized,
        constraint = user_no_tokens.owner == user.key() @ GhostOddsError::Unauthorized)]
    pub user_no_tokens: Box<Account<'info, TokenAccount>>,
    #[account(
        init_if_needed, payer = user, space = UserPosition::LEN,
        seeds = [b"position", market.market_id.to_le_bytes().as_ref(), user.key().as_ref()], bump,
    )]
    pub user_position: Box<Account<'info, UserPosition>>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SellOutcome<'info> {
    #[account(mut, seeds = [b"market", market.market_id.to_le_bytes().as_ref()], bump = market.bump)]
    pub market: Box<Account<'info, Market>>,
    #[account(
        mut, seeds = [b"platform"], bump = platform.bump,
    )]
    pub platform: Box<Account<'info, Platform>>,
    #[account(mut, constraint = yes_mint.key() == market.yes_mint @ GhostOddsError::Unauthorized)]
    pub yes_mint: Box<Account<'info, Mint>>,
    #[account(mut, constraint = no_mint.key() == market.no_mint @ GhostOddsError::Unauthorized)]
    pub no_mint: Box<Account<'info, Mint>>,
    #[account(mut, constraint = vault.key() == market.vault @ GhostOddsError::Unauthorized)]
    pub vault: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = treasury.mint == market.collateral_mint @ GhostOddsError::Unauthorized,
        constraint = treasury.key() == platform.treasury @ GhostOddsError::Unauthorized,
    )]
    pub treasury: Box<Account<'info, TokenAccount>>,
    #[account(mut,
        constraint = user_collateral.mint == market.collateral_mint @ GhostOddsError::Unauthorized,
        constraint = user_collateral.owner == user.key() @ GhostOddsError::Unauthorized)]
    pub user_collateral: Box<Account<'info, TokenAccount>>,
    #[account(mut,
        constraint = user_yes_tokens.mint == market.yes_mint @ GhostOddsError::Unauthorized,
        constraint = user_yes_tokens.owner == user.key() @ GhostOddsError::Unauthorized)]
    pub user_yes_tokens: Box<Account<'info, TokenAccount>>,
    #[account(mut,
        constraint = user_no_tokens.mint == market.no_mint @ GhostOddsError::Unauthorized,
        constraint = user_no_tokens.owner == user.key() @ GhostOddsError::Unauthorized)]
    pub user_no_tokens: Box<Account<'info, TokenAccount>>,
    #[account(mut,
        seeds = [b"position", market.market_id.to_le_bytes().as_ref(), user.key().as_ref()],
        bump = user_position.bump)]
    pub user_position: Box<Account<'info, UserPosition>>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut, seeds = [b"market", market.market_id.to_le_bytes().as_ref()], bump = market.bump)]
    pub market: Box<Account<'info, Market>>,
    pub resolver: Signer<'info>,
    /// CHECK: Optional Pyth price feed account, validated in instruction logic
    pub pyth_price_account: Option<UncheckedAccount<'info>>,
}

#[derive(Accounts)]
pub struct RedeemWinnings<'info> {
    #[account(seeds = [b"market", market.market_id.to_le_bytes().as_ref()], bump = market.bump)]
    pub market: Box<Account<'info, Market>>,
    #[account(mut, constraint = yes_mint.key() == market.yes_mint @ GhostOddsError::Unauthorized)]
    pub yes_mint: Box<Account<'info, Mint>>,
    #[account(mut, constraint = no_mint.key() == market.no_mint @ GhostOddsError::Unauthorized)]
    pub no_mint: Box<Account<'info, Mint>>,
    #[account(mut, constraint = vault.key() == market.vault @ GhostOddsError::Unauthorized)]
    pub vault: Box<Account<'info, TokenAccount>>,
    #[account(mut,
        constraint = user_collateral.mint == market.collateral_mint @ GhostOddsError::Unauthorized,
        constraint = user_collateral.owner == user.key() @ GhostOddsError::Unauthorized)]
    pub user_collateral: Box<Account<'info, TokenAccount>>,
    #[account(mut,
        constraint = user_yes_tokens.mint == market.yes_mint @ GhostOddsError::Unauthorized,
        constraint = user_yes_tokens.owner == user.key() @ GhostOddsError::Unauthorized)]
    pub user_yes_tokens: Box<Account<'info, TokenAccount>>,
    #[account(mut,
        constraint = user_no_tokens.mint == market.no_mint @ GhostOddsError::Unauthorized,
        constraint = user_no_tokens.owner == user.key() @ GhostOddsError::Unauthorized)]
    pub user_no_tokens: Box<Account<'info, TokenAccount>>,
    #[account(mut,
        seeds = [b"position", market.market_id.to_le_bytes().as_ref(), user.key().as_ref()],
        bump = user_position.bump)]
    pub user_position: Box<Account<'info, UserPosition>>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelMarket<'info> {
    #[account(mut, seeds = [b"market", market.market_id.to_le_bytes().as_ref()], bump = market.bump)]
    pub market: Box<Account<'info, Market>>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct RedeemCancelled<'info> {
    #[account(seeds = [b"market", market.market_id.to_le_bytes().as_ref()], bump = market.bump)]
    pub market: Box<Account<'info, Market>>,
    #[account(mut, constraint = yes_mint.key() == market.yes_mint @ GhostOddsError::Unauthorized)]
    pub yes_mint: Box<Account<'info, Mint>>,
    #[account(mut, constraint = no_mint.key() == market.no_mint @ GhostOddsError::Unauthorized)]
    pub no_mint: Box<Account<'info, Mint>>,
    #[account(mut, constraint = vault.key() == market.vault @ GhostOddsError::Unauthorized)]
    pub vault: Box<Account<'info, TokenAccount>>,
    #[account(mut,
        constraint = user_collateral.mint == market.collateral_mint @ GhostOddsError::Unauthorized,
        constraint = user_collateral.owner == user.key() @ GhostOddsError::Unauthorized)]
    pub user_collateral: Box<Account<'info, TokenAccount>>,
    #[account(mut,
        constraint = user_yes_tokens.mint == market.yes_mint @ GhostOddsError::Unauthorized,
        constraint = user_yes_tokens.owner == user.key() @ GhostOddsError::Unauthorized)]
    pub user_yes_tokens: Box<Account<'info, TokenAccount>>,
    #[account(mut,
        constraint = user_no_tokens.mint == market.no_mint @ GhostOddsError::Unauthorized,
        constraint = user_no_tokens.owner == user.key() @ GhostOddsError::Unauthorized)]
    pub user_no_tokens: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

// ============ Events ============
#[event] pub struct PlatformInitialized { pub authority: Pubkey, pub fee_bps: u16, pub treasury: Pubkey }
#[event] pub struct MarketCreated { pub market_id: u64, pub question: String, pub expires_at: i64, pub initial_liquidity: u64 }
#[event] pub struct OutcomePurchased { pub market_id: u64, pub user: Pubkey, pub is_yes: bool, pub amount_in: u64, pub tokens_out: u64, pub fee: u64 }
#[event] pub struct OutcomeSold { pub market_id: u64, pub user: Pubkey, pub is_yes: bool, pub tokens_in: u64, pub collateral_out: u64, pub fee: u64 }
#[event] pub struct MarketResolved { pub market_id: u64, pub outcome: bool, pub resolved_at: i64 }
#[event] pub struct WinningsRedeemed { pub market_id: u64, pub user: Pubkey, pub payout: u64 }
#[event] pub struct MarketCancelled { pub market_id: u64 }
#[event] pub struct CancelledRedeemed { pub market_id: u64, pub user: Pubkey, pub refund: u64 }

// ============ Errors ============
#[error_code]
pub enum GhostOddsError {
    #[msg("Fee exceeds maximum allowed")] FeeTooHigh,
    #[msg("Question exceeds maximum length")] QuestionTooLong,
    #[msg("Description exceeds maximum length")] DescriptionTooLong,
    #[msg("Category exceeds maximum length")] CategoryTooLong,
    #[msg("Resolution source exceeds maximum length")] ResolutionSourceTooLong,
    #[msg("Invalid resolution operator")] InvalidOperator,
    #[msg("Amount must be greater than zero")] ZeroAmount,
    #[msg("Market expiry too soon (minimum 24 hours)")] ExpiryTooSoon,
    #[msg("Math overflow")] MathOverflow,
    #[msg("Market is not active")] MarketNotActive,
    #[msg("Market is locked for trading")] MarketLocked,
    #[msg("Slippage tolerance exceeded")] SlippageExceeded,
    #[msg("Market has not expired yet")] MarketNotExpired,
    #[msg("Unauthorized")] Unauthorized,
    #[msg("Market is not resolved")] MarketNotResolved,
    #[msg("No winnings to redeem")] NoWinnings,
    #[msg("Market is already resolved")] AlreadyResolved,
    #[msg("Market is not cancelled")] MarketNotCancelled,
    #[msg("Invalid oracle account")] InvalidOracle,
    #[msg("Price data is stale")] StalePriceData,
    #[msg("Price confidence interval too wide")] PriceConfidenceTooWide,
    #[msg("Oracle price account required for oracle-resolved markets")] OracleRequired,
}
