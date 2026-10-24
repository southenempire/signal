use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

use crate::{
    state::{within_bps, Bounds, Config, Feed, Report, ReportStatus, Reporter},
    SignalError, ANCHOR_DISCRIMINATOR, CONFIG_SEED, FEED_SEED, REPORTER_SEED, REPORT_SEED,
    REPUTATION_START,
};

#[derive(Accounts)]
#[instruction(feed_id: [u8; 32], image_hash: [u8; 32])]
pub struct SubmitReport<'info> {
    /// Vouches that the AI parsed this price from a real photo. Pays rent, so reporters
    /// never need SOL.
    #[account(mut)]
    pub attester: Signer<'info>,
    /// The reporter consents to filing under their identity.
    pub reporter_wallet: Signer<'info>,
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = attester,
    )]
    pub config: Account<'info, Config>,
    #[account(
        init_if_needed,
        payer = attester,
        seeds = [REPORTER_SEED, reporter_wallet.key().as_ref()],
        bump,
        space = ANCHOR_DISCRIMINATOR + Reporter::INIT_SPACE,
    )]
    pub reporter: Account<'info, Reporter>,
    #[account(
        init_if_needed,
        payer = attester,
        seeds = [FEED_SEED, feed_id.as_ref()],
        bump,
        space = ANCHOR_DISCRIMINATOR + Feed::INIT_SPACE,
    )]
    pub feed: Box<Account<'info, Feed>>,
    /// `init`, not `init_if_needed`: a second filing of the same photo for the same item fails here.
    #[account(
        init,
        payer = attester,
        seeds = [REPORT_SEED, feed.key().as_ref(), image_hash.as_ref()],
        bump,
        space = ANCHOR_DISCRIMINATOR + Report::INIT_SPACE,
    )]
    pub report: Box<Account<'info, Report>>,
    #[account(
        associated_token::mint = config.usdc_mint,
        associated_token::authority = config,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,
    pub system_program: Program<'info, System>,
}

impl<'info> SubmitReport<'info> {
    pub fn submit_report(
        &mut self,
        feed_id: [u8; 32],
        image_hash: [u8; 32],
        price: u64,
        bumps: &SubmitReportBumps,
    ) -> Result<()> {
        require!(price > 0, SignalError::InvalidPrice);

        // First report from this wallet: create the reputation record.
        if self.reporter.wallet == Pubkey::default() {
            self.reporter.set_inner(Reporter {
                wallet: self.reporter_wallet.key(),
                reputation: REPUTATION_START,
                accepted: 0,
                slashed: 0,
                locked: 0,
                bump: bumps.reporter,
            });
        }
        // First report on this feed: record which item and region it is.
        if self.feed.feed_id == [0u8; 32] {
            self.feed.feed_id = feed_id;
            self.feed.bump = bumps.feed;
        }

        require!(
            self.reporter.reputation >= self.config.ban_below_reputation,
            SignalError::ReporterBanned
        );

        // Lock the reward against the pool. Only unlocked funds can back a new report.
        let reward = self
            .config
            .reward_for(self.reporter.reputation)
            .ok_or(SignalError::Overflow)?;
        let available = self
            .vault
            .amount
            .checked_sub(self.config.total_locked)
            .ok_or(SignalError::PoolExhausted)?;
        require!(available >= reward, SignalError::PoolExhausted);

        self.config.total_locked = self
            .config
            .total_locked
            .checked_add(reward)
            .ok_or(SignalError::Overflow)?;
        self.config.report_count = self.config.report_count.checked_add(1).ok_or(SignalError::Overflow)?;
        self.reporter.locked = self.reporter.locked.checked_add(reward).ok_or(SignalError::Overflow)?;

        // Local price bounds: compare against the feed's median once it has enough history.
        let bounds = if self.feed.len >= self.config.min_bounds_samples {
            let median = self.feed.median().ok_or(SignalError::Overflow)?;
            if within_bps(price, median, self.config.bounds_tolerance_bps) {
                Bounds::Agree
            } else {
                Bounds::Disagree
            }
        } else {
            Bounds::None
        };

        let now = Clock::get()?.unix_timestamp;
        self.report.set_inner(Report {
            reporter: self.reporter_wallet.key(),
            feed: self.feed.key(),
            image_hash,
            price,
            reward,
            submitted_at: now,
            bounds,
            confirmations: 0,
            contradictions: 0,
            status: ReportStatus::Pending,
            bump: bumps.report,
        });

        emit!(ReportSubmitted {
            report: self.report.key(),
            reporter: self.reporter_wallet.key(),
            feed: self.feed.key(),
            price,
            reward,
            bounds,
        });
        Ok(())
    }
}

#[event]
pub struct ReportSubmitted {
    pub report: Pubkey,
    pub reporter: Pubkey,
    pub feed: Pubkey,
    pub price: u64,
    pub reward: u64,
    pub bounds: Bounds,
}
