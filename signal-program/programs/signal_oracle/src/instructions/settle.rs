use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{transfer, Mint, Token, TokenAccount, Transfer},
};

use crate::{
    state::{Bounds, Config, Feed, Report, ReportStatus, Reporter},
    SignalError, CONFIG_SEED, REPORTER_SEED, REPUTATION_ACCEPT, REPUTATION_MAX, REPUTATION_SLASH,
};

/// Permissionless crank: decide a pending report from its evidence.
///
///   confirmed    = local bounds agree, OR at least one peer agrees and agreeing ≥ disagreeing
///   contradicted = bounds disagree with no peer support, OR (no bounds yet) ≥ peer_quorum
///                  contradicting peers and none agreeing
///
/// confirmed → ACCEPT: reward paid from the vault, price joins the feed, reputation +3
/// contradicted → SLASH: reward released back to the pool, reputation −20
/// neither, after pending_timeout → ACCEPT if reputation ≥ bootstrap minimum, else EXPIRE
/// neither, before the timeout → error StillPending (try again later)
#[derive(Accounts)]
pub struct Settle<'info> {
    #[account(mut)]
    pub cranker: Signer<'info>,
    #[account(address = config.usdc_mint)]
    pub usdc_mint: Box<Account<'info, Mint>>,
    #[account(mut, seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(mut, has_one = feed)]
    pub report: Box<Account<'info, Report>>,
    #[account(
        mut,
        seeds = [REPORTER_SEED, report.reporter.as_ref()],
        bump = reporter.bump,
    )]
    pub reporter: Box<Account<'info, Reporter>>,
    #[account(mut)]
    pub feed: Box<Account<'info, Feed>>,
    /// CHECK: only used as the reward ATA's owner; must be the report's reporter.
    #[account(address = report.reporter @ SignalError::AccountMismatch)]
    pub reporter_wallet: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = cranker,
        associated_token::mint = usdc_mint,
        associated_token::authority = reporter_wallet,
    )]
    pub reporter_ata: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = config,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum Decision {
    Accept,
    Slash,
    Expire,
}

impl<'info> Settle<'info> {
    pub fn decide(&self, now: i64) -> Result<Decision> {
        let r = &self.report;
        let c = &self.config;

        let peer_support = r.confirmations > 0 && r.confirmations >= r.contradictions;
        let confirmed = r.bounds == Bounds::Agree || peer_support;
        let contradicted = (r.bounds == Bounds::Disagree && r.confirmations == 0)
            || (r.bounds == Bounds::None && r.confirmations == 0 && r.contradictions >= c.peer_quorum);

        if confirmed {
            return Ok(Decision::Accept);
        }
        if contradicted {
            return Ok(Decision::Slash);
        }

        let age = now.checked_sub(r.submitted_at).ok_or(SignalError::Overflow)?;
        require!(age >= c.pending_timeout_secs, SignalError::StillPending);
        Ok(if self.reporter.reputation >= c.bootstrap_min_reputation {
            Decision::Accept
        } else {
            Decision::Expire
        })
    }

    pub fn settle(&mut self) -> Result<()> {
        require!(self.report.status == ReportStatus::Pending, SignalError::AlreadySettled);

        let now = Clock::get()?.unix_timestamp;
        let decision = self.decide(now)?;
        let reward = self.report.reward;

        // Every outcome releases the lock; only Accept also moves the tokens.
        self.config.total_locked = self.config.total_locked.checked_sub(reward).ok_or(SignalError::Overflow)?;
        self.reporter.locked = self.reporter.locked.checked_sub(reward).ok_or(SignalError::Overflow)?;

        match decision {
            Decision::Accept => {
                let signer_seeds: [&[&[u8]]; 1] = [&[CONFIG_SEED, &[self.config.bump]]];
                let cpi_accounts = Transfer {
                    from: self.vault.to_account_info(),
                    to: self.reporter_ata.to_account_info(),
                    authority: self.config.to_account_info(),
                };
                transfer(
                    CpiContext::new_with_signer(self.token_program.key(), cpi_accounts, &signer_seeds),
                    reward,
                )?;

                self.feed.push(self.report.price, now);
                self.reporter.accepted = self.reporter.accepted.checked_add(1).ok_or(SignalError::Overflow)?;
                self.reporter.reputation = self
                    .reporter
                    .reputation
                    .saturating_add(REPUTATION_ACCEPT)
                    .min(REPUTATION_MAX);
                self.report.status = ReportStatus::Accepted;
            }
            Decision::Slash => {
                self.reporter.slashed = self.reporter.slashed.checked_add(1).ok_or(SignalError::Overflow)?;
                self.reporter.reputation = self.reporter.reputation.saturating_sub(REPUTATION_SLASH);
                self.report.status = ReportStatus::Slashed;
            }
            Decision::Expire => {
                self.report.status = ReportStatus::Expired;
            }
        }

        emit!(ReportSettled {
            report: self.report.key(),
            reporter: self.report.reporter,
            decision,
            reward_paid: if decision == Decision::Accept { reward } else { 0 },
            new_reputation: self.reporter.reputation,
            feed_median: self.feed.median().unwrap_or(0),
        });
        Ok(())
    }
}

#[event]
pub struct ReportSettled {
    pub report: Pubkey,
    pub reporter: Pubkey,
    pub decision: Decision,
    pub reward_paid: u64,
    pub new_reputation: u8,
    pub feed_median: u64,
}
