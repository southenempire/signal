use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum ReportStatus {
    Pending,
    Accepted,
    Slashed,
    Expired,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum Bounds {
    /// Feed had too few samples when the report was submitted.
    None,
    Agree,
    Disagree,
}

/// One per priced item on a photo, PDA ["report", feed, image_hash].
/// Because the image hash is a seed, the same photo cannot be filed twice for the same item:
/// the second `init` fails.
#[account]
#[derive(InitSpace)]
pub struct Report {
    pub reporter: Pubkey,
    pub feed: Pubkey,
    pub image_hash: [u8; 32],
    /// USD micro-units (6 decimals).
    pub price: u64,
    /// Locked at submission; paid on accept, released back to the pool otherwise.
    pub reward: u64,
    pub submitted_at: i64,
    pub bounds: Bounds,
    pub confirmations: u8,
    pub contradictions: u8,
    pub status: ReportStatus,
    pub bump: u8,
}

/// PDA ["peer", report_a, report_b] with report_a < report_b. Existing means this pair was
/// already compared, so a crank cannot count the same peer twice.
#[account]
#[derive(InitSpace)]
pub struct PeerLink {
    pub bump: u8,
}
