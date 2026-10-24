pub const ANCHOR_DISCRIMINATOR: usize = 8;

/// Basis points scale: 10_000 = 100%.
pub const BPS: u64 = 10_000;

/// How many accepted prices a feed keeps for its median (a ring buffer).
pub const FEED_CAPACITY: usize = 16;

/// Reputation runs 0–100. New reporters start in the middle.
pub const REPUTATION_START: u8 = 50;
pub const REPUTATION_MAX: u8 = 100;
pub const REPUTATION_ACCEPT: u8 = 3;
pub const REPUTATION_SLASH: u8 = 20;
pub const REPUTATION_DUPLICATE: u8 = 10;
pub const REPUTATION_FAKE: u8 = 15;

pub const CONFIG_SEED: &[u8] = b"config";
pub const REPORTER_SEED: &[u8] = b"reporter";
pub const FEED_SEED: &[u8] = b"feed";
pub const REPORT_SEED: &[u8] = b"report";
pub const PEER_SEED: &[u8] = b"peer";
