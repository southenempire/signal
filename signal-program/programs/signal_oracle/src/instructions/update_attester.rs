use anchor_lang::prelude::*;

use crate::{state::Config, CONFIG_SEED};

/// Replace the attester: the only key allowed to file reports and flag fakes. Used to hand filing
/// to the Signal contract on NEAR (its Chain Signatures key), to rotate a leaked key, or, pointed at
/// a key nobody holds, to stop all filing at once.
#[derive(Accounts)]
pub struct UpdateAttester<'info> {
    pub admin: Signer<'info>,
    #[account(mut, seeds = [CONFIG_SEED], bump = config.bump, has_one = admin)]
    pub config: Account<'info, Config>,
}

impl<'info> UpdateAttester<'info> {
    pub fn update_attester(&mut self, attester: Pubkey) -> Result<()> {
        let previous = self.config.attester;
        self.config.attester = attester;
        emit!(AttesterUpdated { previous, attester });
        Ok(())
    }
}

#[event]
pub struct AttesterUpdated {
    pub previous: Pubkey,
    pub attester: Pubkey,
}
