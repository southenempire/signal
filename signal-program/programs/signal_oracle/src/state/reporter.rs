use anchor_lang::prelude::*;

/// One per reporter wallet, PDA ["reporter", wallet]. Their on-chain reputation.
#[account]
#[derive(InitSpace)]
pub struct Reporter {
    pub wallet: Pubkey,
    pub reputation: u8,
    pub accepted: u32,
    pub slashed: u32,
    /// Rewards currently locked in this reporter's pending reports.
    pub locked: u64,
    pub bump: u8,
}
