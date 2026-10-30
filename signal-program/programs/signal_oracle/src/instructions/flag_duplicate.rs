use anchor_lang::prelude::*;

use crate::{
    state::{Config, Report, Reporter},
    SignalError, ANCHOR_DISCRIMINATOR, CONFIG_SEED, REPORTER_SEED, REPORT_SEED, REPUTATION_DUPLICATE,
    REPUTATION_START,
};

/// A resubmitted photo cannot become a second Report (its PDA already exists), so this
/// is how the offender is penalised. The existing Report account at
/// ["report", feed, image_hash] is the on-chain proof that the photo was already filed.
#[derive(Accounts)]
#[instruction(image_hash: [u8; 32])]
pub struct FlagDuplicate<'info> {
    #[account(mut)]
    pub attester: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump, has_one = attester)]
    pub config: Account<'info, Config>,
    #[account(
        seeds = [REPORT_SEED, existing_report.feed.as_ref(), image_hash.as_ref()],
        bump = existing_report.bump,
    )]
    pub existing_report: Account<'info, Report>,
    /// CHECK: the wallet that tried to resubmit; only used as a seed. Never the original filer.
    #[account(constraint = offender_wallet.key() != existing_report.reporter @ SignalError::OriginalReporter)]
    pub offender_wallet: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = attester,
        seeds = [REPORTER_SEED, offender_wallet.key().as_ref()],
        bump,
        space = ANCHOR_DISCRIMINATOR + Reporter::INIT_SPACE,
    )]
    pub offender: Account<'info, Reporter>,
    pub system_program: Program<'info, System>,
}

impl<'info> FlagDuplicate<'info> {
    pub fn flag_duplicate(&mut self, _image_hash: [u8; 32], bumps: &FlagDuplicateBumps) -> Result<()> {
        if self.offender.wallet == Pubkey::default() {
            self.offender.set_inner(Reporter {
                wallet: self.offender_wallet.key(),
                reputation: REPUTATION_START,
                accepted: 0,
                slashed: 0,
                locked: 0,
                bump: bumps.offender,
            });
        }
        self.offender.reputation = self.offender.reputation.saturating_sub(REPUTATION_DUPLICATE);
        self.offender.slashed = self.offender.slashed.saturating_add(1);

        emit!(DuplicateFlagged {
            offender: self.offender_wallet.key(),
            original_report: self.existing_report.key(),
            new_reputation: self.offender.reputation,
        });
        Ok(())
    }
}

#[event]
pub struct DuplicateFlagged {
    pub offender: Pubkey,
    pub original_report: Pubkey,
    pub new_reputation: u8,
}
