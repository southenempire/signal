use anchor_lang::prelude::*;

declare_id!("HmCLsXYjktA3EaSmipee7qzDNTefJASUWaXeiafwmquS");

mod state;
mod instructions;
mod error;
mod constants;

use instructions::*;
use error::*;
pub use constants::*;
pub use state::ConfigParams;

#[program]
pub mod signal_oracle {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, params: ConfigParams) -> Result<()> {
        ctx.accounts.initialize(params, &ctx.bumps)
    }

    pub fn fund_pool(ctx: Context<FundPool>, amount: u64) -> Result<()> {
        ctx.accounts.fund_pool(amount)
    }

    pub fn submit_report(
        ctx: Context<SubmitReport>,
        feed_id: [u8; 32],
        image_hash: [u8; 32],
        price: u64,
    ) -> Result<()> {
        ctx.accounts.submit_report(feed_id, image_hash, price, false, &ctx.bumps)
    }

    /// Same accounts as `submit_report`, for prices the attester has already verified and accepted
    /// (the Signal contract on NEAR). Settles without waiting for bounds or peers.
    pub fn submit_verified_report(
        ctx: Context<SubmitReport>,
        feed_id: [u8; 32],
        image_hash: [u8; 32],
        price: u64,
    ) -> Result<()> {
        ctx.accounts.submit_report(feed_id, image_hash, price, true, &ctx.bumps)
    }

    pub fn peer_check(ctx: Context<PeerCheck>) -> Result<()> {
        ctx.accounts.peer_check(&ctx.bumps)
    }

    pub fn settle(ctx: Context<Settle>) -> Result<()> {
        ctx.accounts.settle()
    }

    pub fn flag_duplicate(ctx: Context<FlagDuplicate>, image_hash: [u8; 32]) -> Result<()> {
        ctx.accounts.flag_duplicate(image_hash, &ctx.bumps)
    }

    pub fn flag_fake(ctx: Context<FlagFake>, image_hash: [u8; 32]) -> Result<()> {
        ctx.accounts.flag_fake(image_hash, &ctx.bumps)
    }

    pub fn update_attester(ctx: Context<UpdateAttester>, attester: Pubkey) -> Result<()> {
        ctx.accounts.update_attester(attester)
    }
}
