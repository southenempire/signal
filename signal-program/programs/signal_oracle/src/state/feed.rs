use anchor_lang::prelude::*;

use crate::FEED_CAPACITY;

/// One per item per region, PDA ["feed", feed_id] where feed_id = sha256("FUEL:ng-lagos:petrol_litre").
/// Keeps the last FEED_CAPACITY accepted prices; the median is what other programs read.
#[account]
#[derive(InitSpace)]
pub struct Feed {
    pub feed_id: [u8; 32],
    /// Ring buffer of accepted prices, in USD micro-units (6 decimals, like USDC).
    pub prices: [u64; FEED_CAPACITY],
    pub len: u8,
    pub head: u8,
    pub total_samples: u64,
    pub updated_at: i64,
    pub bump: u8,
}

impl Feed {
    pub fn push(&mut self, price: u64, now: i64) {
        self.prices[self.head as usize] = price;
        self.head = ((self.head as usize + 1) % FEED_CAPACITY) as u8;
        if (self.len as usize) < FEED_CAPACITY {
            self.len += 1;
        }
        self.total_samples = self.total_samples.saturating_add(1);
        self.updated_at = now;
    }

    /// Median of the stored prices (lower median for even counts, no floats).
    pub fn median(&self) -> Option<u64> {
        let n = self.len as usize;
        if n == 0 {
            return None;
        }
        let mut sorted = [0u64; FEED_CAPACITY];
        sorted[..n].copy_from_slice(&self.prices[..n]);
        sorted[..n].sort_unstable();
        Some(sorted[(n - 1) / 2])
    }
}

/// |a - b| <= tolerance_bps% of reference, in integer math.
pub fn within_bps(price: u64, reference: u64, tolerance_bps: u16) -> bool {
    if reference == 0 {
        return false;
    }
    let diff = price.abs_diff(reference) as u128;
    diff * crate::BPS as u128 <= reference as u128 * tolerance_bps as u128
}
