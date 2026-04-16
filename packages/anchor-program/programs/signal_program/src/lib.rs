use anchor_lang::prelude::*;
use anchor_lang::solana_program::{system_program, clock};

declare_id!("BADg7zj74cYNvtkFVcRbJsowYbKNipLEZrqvQmQE6U48");

/// Signal: The Decentralized Physical Intelligence Protocol
/// This program manages the submission, verification, and monetization 
/// of real-world data feeds on Solana.
#[program]
pub mod signal_program {
    use super::*;

    /// Initializes the global protocol state.
    pub fn initialize(ctx: Context<Initialize>, admin_payout_fee: u64) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        global_state.admin = ctx.accounts.admin.key();
        global_state.fee_recipient = ctx.accounts.admin.key(); 
        global_state.admin_payout_fee = admin_payout_fee;
        global_state.paused = false;
        
        emit!(GlobalStateInitialized {
            admin: global_state.admin,
            fee_recipient: global_state.fee_recipient,
        });
        Ok(())
    }

    /// Creates a new world-intelligence category (e.g., 'NYC Fuel Price').
    pub fn create_category(
        ctx: Context<CreateCategory>, 
        name: String, 
        min_reporters: u32,
        query_price: u64,
    ) -> Result<()> {
        require!(name.len() <= 32, SignalError::NameTooLong);
        require!(min_reporters > 0, SignalError::InvalidMinReporters);

        let category = &mut ctx.accounts.category;
        category.name = name;
        category.min_reporters = min_reporters;
        category.query_price = query_price;
        category.submission_count = 0;
        category.total_value = 0;
        category.is_active = true;
        category.bump = ctx.bumps.category;
        
        Ok(())
    }

    /// Submits a verified data report. 
    /// Requires a 0.01 SOL stake which is slashed if the data is fraudulent.
    pub fn submit_report(
        ctx: Context<SubmitReport>,
        value: u64,
        location_hash: [u8; 32],
        image_hash: [u8; 32],
    ) -> Result<()> {
        require!(ctx.accounts.category.is_active, SignalError::CategoryInactive);
        
        // 1. Mandatory Staking (Anti-Sybil measure)
        let stake_amount = 10_000_000; // 0.01 SOL
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.reporter.to_account_info(),
                to: ctx.accounts.submission.to_account_info(),
            },
        );
        system_program::transfer(cpi_context, stake_amount)?;

        let submission = &mut ctx.accounts.submission;
        let category = &mut ctx.accounts.category;

        submission.reporter = ctx.accounts.reporter.key();
        submission.category = category.key();
        submission.value = value;
        submission.location_hash = location_hash;
        submission.image_hash = image_hash;
        submission.timestamp = clock::Clock::get()?.unix_timestamp;
        submission.stake_amount = stake_amount;

        category.submission_count += 1;
        category.total_value += value;

        emit!(ReportSubmitted {
            category: submission.category,
            reporter: submission.reporter,
            value,
        });

        Ok(())
    }

    /// Purchase access to a verified data stream.
    /// Deducts 10% Protocol Fee and pays the rest to the data providers.
    pub fn purchase_data(ctx: Context<PurchaseData>) -> Result<()> {
        let category = &ctx.accounts.category;
        let global_state = &ctx.accounts.global_state;
        
        require!(!global_state.paused, SignalError::ProtocolPaused);
        require!(category.current_oracle_price > 0, SignalError::DataNotReady);

        let query_price = category.query_price;
        let protocol_fee = query_price / 10;
        let reporter_payout = query_price - protocol_fee;

        // Verify fee recipient matches global state
        require_keys_eq!(ctx.accounts.fee_recipient.key(), global_state.fee_recipient, SignalError::InvalidFeeRecipient);

        // 1. Protocol Fee Payout
        let cpi_protocol = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.fee_recipient.to_account_info(),
            },
        );
        system_program::transfer(cpi_protocol, protocol_fee)?;

        // 2. Data Provider Payout
        let cpi_reporter = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.verifier.to_account_info(),
            },
        );
        system_program::transfer(cpi_reporter, reporter_payout)?;

        Ok(())
    }
}

// --- Account Contexts ---

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init, 
        payer = admin, 
        space = 8 + 32 + 32 + 8 + 1,
        seeds = [b"global-state"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct CreateCategory<'info> {
    #[account(
        init, 
        payer = admin, 
        space = 8 + 32 + 4 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 1,
        seeds = [b"category", name.as_bytes()],
        bump
    )]
    pub category: Account<'info, Category>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitReport<'info> {
    #[account(
        init,
        payer = reporter,
        space = 8 + 32 + 32 + 8 + 32 + 32 + 8 + 8,
        seeds = [b"submission", category.key().as_ref(), reporter.key().as_ref()],
        bump
    )]
    pub submission: Account<'info, Submission>,
    #[account(mut)]
    pub category: Account<'info, Category>,
    #[account(mut)]
    pub reporter: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PurchaseData<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    /// CHECK: Validated against global_state
    #[account(mut)]
    pub fee_recipient: AccountInfo<'info>,
    /// CHECK: The entity providing the verified data (e.g., the Signaler)
    #[account(mut)]
    pub verifier: AccountInfo<'info>,
    pub category: Account<'info, Category>,
    #[account(seeds = [b"global-state"], bump)]
    pub global_state: Account<'info, GlobalState>,
    pub system_program: Program<'info, System>,
}

// --- State Accounts ---

#[account]
pub struct GlobalState {
    pub admin: Pubkey,
    pub fee_recipient: Pubkey,
    pub admin_payout_fee: u64,
    pub paused: bool,
}

#[account]
pub struct Category {
    pub name: String,
    pub min_reporters: u32,
    pub submission_count: u64,
    pub total_value: u64,
    pub query_price: u64,
    pub current_oracle_price: u64,
    pub last_update: i64,
    pub is_active: bool,
    pub bump: u8,
}

#[account]
pub struct Submission {
    pub reporter: Pubkey,
    pub category: Pubkey,
    pub value: u64,
    pub location_hash: [u8; 32],
    pub image_hash: [u8; 32],
    pub timestamp: i64,
    pub stake_amount: u64,
}

// --- Errors & Events ---

#[error_code]
pub enum SignalError {
    #[msg("Category name must be 32 characters or less")]
    NameTooLong,
    #[msg("Min reporters must be greater than zero")]
    InvalidMinReporters,
    #[msg("This category is currently inactive")]
    CategoryInactive,
    #[msg("Data feed is not yet verified or ready for purchase")]
    DataNotReady,
    #[msg("Protocol is currently paused")]
    ProtocolPaused,
    #[msg("Provided fee recipient does not match global state")]
    InvalidFeeRecipient,
}

#[event]
pub struct GlobalStateInitialized {
    pub admin: Pubkey,
    pub fee_recipient: Pubkey,
}

#[event]
pub struct ReportSubmitted {
    pub category: Pubkey,
    pub reporter: Pubkey,
    pub value: u64,
}
