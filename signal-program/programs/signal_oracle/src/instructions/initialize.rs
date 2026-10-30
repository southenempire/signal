use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::{
    state::{Config, ConfigParams},
    SignalError, ANCHOR_DISCRIMINATOR, BPS, CONFIG_SEED, FEED_CAPACITY, REPUTATION_MAX,
};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    pub usdc_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = admin,
        seeds = [CONFIG_SEED],
        bump,
        space = ANCHOR_DISCRIMINATOR + Config::INIT_SPACE,
    )]
    pub config: Account<'info, Config>,
    /// The reward pool. Token authority is the config PDA, so only this program can pay out.
    #[account(
        init,
        payer = admin,
        associated_token::mint = usdc_mint,
        associated_token::authority = config,
    )]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> Initialize<'info> {
    pub fn initialize(&mut self, p: ConfigParams, bumps: &InitializeBumps) -> Result<()> {
        require!(p.base_reward > 0, SignalError::InvalidParams);
        require!(p.min_bounds_samples > 0 && p.peer_quorum > 0, SignalError::InvalidParams);
        // A feed never holds more than FEED_CAPACITY prices, so a larger minimum would switch bounds off.
        require!((p.min_bounds_samples as usize) <= FEED_CAPACITY, SignalError::InvalidParams);
        require!(
            (p.bounds_tolerance_bps as u64) <= BPS && (p.peer_tolerance_bps as u64) <= BPS,
            SignalError::InvalidParams
        );
        require!(p.peer_window_secs > 0 && p.pending_timeout_secs > 0, SignalError::InvalidParams);
        require!(
            p.bootstrap_min_reputation <= REPUTATION_MAX && p.ban_below_reputation <= REPUTATION_MAX,
            SignalError::InvalidParams
        );

        self.config.set_inner(Config {
            admin: self.admin.key(),
            attester: p.attester,
            usdc_mint: self.usdc_mint.key(),
            base_reward: p.base_reward,
            min_bounds_samples: p.min_bounds_samples,
            bounds_tolerance_bps: p.bounds_tolerance_bps,
            peer_tolerance_bps: p.peer_tolerance_bps,
            peer_quorum: p.peer_quorum,
            peer_window_secs: p.peer_window_secs,
            pending_timeout_secs: p.pending_timeout_secs,
            bootstrap_min_reputation: p.bootstrap_min_reputation,
            ban_below_reputation: p.ban_below_reputation,
            total_locked: 0,
            report_count: 0,
            bump: bumps.config,
        });
        Ok(())
    }
}
