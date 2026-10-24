use anchor_lang::prelude::*;

use crate::{
    state::{Config, Reporter},
    ANCHOR_DISCRIMINATOR, CONFIG_SEED, REPORTER_SEED, REPUTATION_FAKE, REPUTATION_START,
};

/// The vision check caught a deliberately faked photo (edited, generated, a screenshot of a
/// receipt). No Report is created for it, so the attester records the penalty here. The image
/// hash goes into the event so the evidence can be audited against the stored photo.
#[derive(Accounts)]
pub struct FlagFake<'info> {
    #[account(mut)]
    pub attester: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump, has_one = attester)]
    pub config: Account<'info, Config>,
    /// CHECK: the wallet that submitted the fake; only used as a seed.
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

impl<'info> FlagFake<'info> {
    pub fn flag_fake(&mut self, image_hash: [u8; 32], bumps: &FlagFakeBumps) -> Result<()> {
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
        self.offender.reputation = self.offender.reputation.saturating_sub(REPUTATION_FAKE);
        self.offender.slashed = self.offender.slashed.saturating_add(1);

        emit!(FakeFlagged {
            offender: self.offender_wallet.key(),
            image_hash,
            new_reputation: self.offender.reputation,
        });
        Ok(())
    }
}

#[event]
pub struct FakeFlagged {
    pub offender: Pubkey,
    pub image_hash: [u8; 32],
    pub new_reputation: u8,
}
