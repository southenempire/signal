use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer};

use crate::{state::Config, SignalError, CONFIG_SEED};

/// Anyone can top up the reward pool: the raise treasury, or a data buyer paying for feeds.
#[derive(Accounts)]
pub struct FundPool<'info> {
    #[account(mut)]
    pub funder: Signer<'info>,
    #[account(address = config.usdc_mint)]
    pub usdc_mint: Account<'info, Mint>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = funder,
    )]
    pub funder_ata: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = config,
    )]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

impl<'info> FundPool<'info> {
    pub fn fund_pool(&mut self, amount: u64) -> Result<()> {
        require!(amount > 0, SignalError::InvalidAmount);

        let cpi_accounts = Transfer {
            from: self.funder_ata.to_account_info(),
            to: self.vault.to_account_info(),
            authority: self.funder.to_account_info(),
        };
        transfer(CpiContext::new(self.token_program.key(), cpi_accounts), amount)?;

        emit!(PoolFunded { funder: self.funder.key(), amount });
        Ok(())
    }
}

#[event]
pub struct PoolFunded {
    pub funder: Pubkey,
    pub amount: u64,
}
