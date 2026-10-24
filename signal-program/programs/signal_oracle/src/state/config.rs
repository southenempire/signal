use anchor_lang::prelude::*;

/// One per program, PDA ["config"]. Holds the rules and the reward pool's accounting.
/// The pool itself is the vault: ATA(config, usdc_mint).
#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,
    /// Off-chain verifier (the Signal bot) that vouches for the AI receipt parse.
    pub attester: Pubkey,
    pub usdc_mint: Pubkey,
    /// Reward at reputation 50, in base units. Scales 0.5x–1.5x with reputation.
    pub base_reward: u64,
    /// Accepted samples a feed needs before its median is used as local bounds.
    pub min_bounds_samples: u8,
    pub bounds_tolerance_bps: u16,
    pub peer_tolerance_bps: u16,
    /// Contradicting peers needed to slash when the feed has no bounds yet.
    pub peer_quorum: u8,
    pub peer_window_secs: i64,
    pub pending_timeout_secs: i64,
    pub bootstrap_min_reputation: u8,
    pub ban_below_reputation: u8,
    /// Sum of rewards locked in pending reports. Vault balance minus this is spendable.
    pub total_locked: u64,
    pub report_count: u64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ConfigParams {
    pub attester: Pubkey,
    pub base_reward: u64,
    pub min_bounds_samples: u8,
    pub bounds_tolerance_bps: u16,
    pub peer_tolerance_bps: u16,
    pub peer_quorum: u8,
    pub peer_window_secs: i64,
    pub pending_timeout_secs: i64,
    pub bootstrap_min_reputation: u8,
    pub ban_below_reputation: u8,
}

impl Config {
    /// reward = base * (50 + reputation) / 100  →  0.5x at 0, 1.0x at 50, 1.5x at 100
    pub fn reward_for(&self, reputation: u8) -> Option<u64> {
        self.base_reward
            .checked_mul(50u64.checked_add(reputation as u64)?)?
            .checked_div(100)
    }
}
