//! A price feed and the rules for joining it. Same rules as the Solana program:
//! once a feed has `min_bounds_samples` prices, a new price within ±bounds of the median joins
//! directly; one outside it is held until `peer_quorum` other reporters independently report a
//! price within ±peer tolerance of it, so two colluding wallets cannot move an established feed.

use near_sdk::near;

pub const FEED_CAPACITY: usize = 16;
const MAX_HELD: usize = 32;
const BPS: u128 = 10_000;

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Params {
    pub bounds_tolerance_bps: u16,
    pub peer_tolerance_bps: u16,
    pub peer_quorum: u8,
    pub min_bounds_samples: u8,
    pub peer_window_secs: u64,
    /// How old (by the model server's clock) a signed response may be when submitted.
    pub max_response_age_secs: u64,
}

impl Default for Params {
    fn default() -> Self {
        Self {
            bounds_tolerance_bps: 4_000,
            peer_tolerance_bps: 2_500,
            peer_quorum: 2,
            min_bounds_samples: 3,
            peer_window_secs: 72 * 3600,
            max_response_age_secs: 3600,
        }
    }
}

impl Params {
    pub fn validate(&self) {
        near_sdk::require!(
            self.bounds_tolerance_bps as u128 <= BPS && self.peer_tolerance_bps as u128 <= BPS,
            "tolerances are in basis points (max 10000)"
        );
        near_sdk::require!(self.peer_quorum > 0, "peer_quorum must be positive");
        near_sdk::require!(
            self.min_bounds_samples > 0 && self.min_bounds_samples as usize <= FEED_CAPACITY,
            "min_bounds_samples must be between 1 and the feed capacity"
        );
        near_sdk::require!(self.peer_window_secs > 0 && self.max_response_age_secs > 0, "windows must be positive");
    }
}

/// A price outside the bounds, waiting for peers.
#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Held {
    pub report_id: u64,
    pub reporter: String,
    pub price: u64,
    pub at_secs: u64,
}

#[near(serializers = [borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct Feed {
    pub currency: String,
    /// Ring buffer of the last FEED_CAPACITY accepted prices, in minor units (cents).
    pub prices: Vec<u64>,
    pub head: u8,
    pub accepted_total: u64,
    pub updated_at_secs: u64,
    pub held: Vec<Held>,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub enum Outcome {
    /// Joined the feed. `promoted` lists held reports this price confirmed, which joined with it.
    Accepted { promoted: Vec<u64> },
    /// Outside the feed's bounds; waiting for a peer quorum.
    Held,
    /// Not added, with the reason.
    Rejected { reason: String },
}

/// `price` is within `bps` of `reference`.
pub fn within_bps(price: u64, reference: u64, bps: u16) -> bool {
    reference > 0 && (price.abs_diff(reference) as u128) * BPS <= (reference as u128) * bps as u128
}

impl Feed {
    pub fn new(currency: String) -> Self {
        Self { currency, prices: Vec::new(), head: 0, accepted_total: 0, updated_at_secs: 0, held: Vec::new() }
    }

    /// Lower median of the accepted prices.
    pub fn median(&self) -> Option<u64> {
        if self.prices.is_empty() {
            return None;
        }
        let mut sorted = self.prices.clone();
        sorted.sort_unstable();
        Some(sorted[(sorted.len() - 1) / 2])
    }

    fn push(&mut self, price: u64, now_secs: u64) {
        if self.prices.len() < FEED_CAPACITY {
            self.prices.push(price);
        } else {
            self.prices[self.head as usize] = price;
        }
        self.head = ((self.head as usize + 1) % FEED_CAPACITY) as u8;
        self.accepted_total += 1;
        self.updated_at_secs = now_secs;
    }

    /// Offer a price. `bound` says the photo's hash is trustworthy (served by a trusted host); an
    /// unbound photo may only add a price inside an established feed's bounds.
    pub fn offer(&mut self, report_id: u64, reporter: &str, price: u64, bound: bool, now_secs: u64, p: &Params) -> Outcome {
        let established = self.prices.len() >= p.min_bounds_samples as usize;
        let in_bounds = match self.median() {
            Some(median) if established => within_bps(price, median, p.bounds_tolerance_bps),
            // A young feed has no bounds yet: the attested model's reading is the evidence.
            _ => true,
        };
        if !bound {
            if established && in_bounds {
                self.push(price, now_secs);
                return Outcome::Accepted { promoted: vec![] };
            }
            let reason = if established {
                "outside the feed's bounds, and photos from untrusted hosts can't wait for peers"
            } else {
                "photos from untrusted hosts can't start a feed"
            };
            return Outcome::Rejected { reason: reason.into() };
        }
        if in_bounds {
            self.push(price, now_secs);
            return Outcome::Accepted { promoted: vec![] };
        }

        self.held.retain(|h| now_secs.saturating_sub(h.at_secs) <= p.peer_window_secs);
        let tol = p.peer_tolerance_bps;
        let mut near: Vec<&Held> = self
            .held
            .iter()
            .filter(|h| h.reporter != reporter && within_bps(price, h.price, tol) && within_bps(h.price, price, tol))
            .collect();
        near.sort_by_key(|h| h.price.abs_diff(price));

        // The quorum is the tightest group around this price whose prices all agree with each other
        // (max within tolerance of min), one price per reporter.
        let (mut lo, mut hi) = (price, price);
        let mut cluster: Vec<&Held> = Vec::new();
        for h in near {
            let (l, u) = (lo.min(h.price), hi.max(h.price));
            if cluster.iter().all(|c| c.reporter != h.reporter) && within_bps(u, l, tol) {
                (lo, hi) = (l, u);
                cluster.push(h);
            }
        }

        if cluster.len() >= p.peer_quorum as usize {
            let promoted: Vec<u64> = cluster.iter().map(|h| h.report_id).collect();
            let prices: Vec<u64> = cluster.iter().map(|h| h.price).collect();
            self.held.retain(|h| !promoted.contains(&h.report_id));
            for held_price in prices {
                self.push(held_price, now_secs);
            }
            self.push(price, now_secs);
            return Outcome::Accepted { promoted };
        }

        if self.held.len() >= MAX_HELD {
            self.held.remove(0);
        }
        self.held.push(Held { report_id, reporter: reporter.to_string(), price, at_secs: now_secs });
        Outcome::Held
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn seeded() -> Feed {
        let mut f = Feed::new("NGN".into());
        let p = Params::default();
        for (i, price) in [100_000, 102_000, 101_000].into_iter().enumerate() {
            assert_eq!(f.offer(i as u64, &format!("r{i}"), price, true, 0, &p), Outcome::Accepted { promoted: vec![] });
        }
        f
    }

    #[test]
    fn bounds_are_inclusive_at_forty_percent() {
        let p = Params::default();
        let mut f = seeded();
        assert_eq!(f.median(), Some(101_000));
        assert_eq!(f.offer(10, "a", 141_400, true, 1, &p), Outcome::Accepted { promoted: vec![] });
        assert_eq!(f.offer(11, "b", 141_500, true, 1, &p), Outcome::Held);
    }

    #[test]
    fn two_colluders_are_held_but_a_quorum_moves_the_price() {
        let p = Params::default();
        let mut f = seeded();
        assert_eq!(f.offer(20, "x", 300_000, true, 10, &p), Outcome::Held);
        assert_eq!(f.offer(21, "y", 300_000, true, 11, &p), Outcome::Held, "one agreeing peer is below quorum");
        assert_eq!(f.prices.len(), 3, "colluders never reach the feed");

        let mut g = seeded();
        assert_eq!(g.offer(30, "p", 200_000, true, 10, &p), Outcome::Held);
        assert_eq!(g.offer(31, "q", 205_000, true, 11, &p), Outcome::Held);
        assert_eq!(g.offer(32, "r", 198_000, true, 12, &p), Outcome::Accepted { promoted: vec![30, 31] });
        assert_eq!(g.prices.len(), 6);
        assert!(g.held.is_empty());
    }

    #[test]
    fn a_reporter_cannot_be_their_own_quorum_and_old_holds_expire() {
        let p = Params::default();
        let mut f = seeded();
        f.offer(40, "x", 300_000, true, 0, &p);
        f.offer(41, "x", 300_000, true, 1, &p);
        assert_eq!(f.offer(42, "x", 300_000, true, 2, &p), Outcome::Held);
        f.offer(43, "y", 300_000, true, 3, &p);
        assert_eq!(f.offer(44, "z", 300_000, true, 3 + p.peer_window_secs + 10, &p), Outcome::Held, "x and y expired");
    }

    #[test]
    fn a_quorum_must_agree_with_itself() {
        let p = Params::default();
        let mut f = seeded();
        // 240k and 375k are each within 25% of 300k, but 56% apart from each other.
        assert_eq!(f.offer(50, "a", 240_000, true, 1, &p), Outcome::Held);
        assert_eq!(f.offer(51, "b", 375_000, true, 2, &p), Outcome::Held);
        assert_eq!(f.offer(52, "c", 300_000, true, 3, &p), Outcome::Held, "a spread of outliers is not a quorum");
        assert_eq!(f.prices.len(), 3);
    }

    #[test]
    fn untrusted_hosts_only_add_inside_established_bounds() {
        let p = Params::default();
        let mut young = Feed::new("NGN".into());
        assert!(matches!(young.offer(1, "u", 100_000, false, 0, &p), Outcome::Rejected { .. }), "can't start a feed");
        assert!(young.prices.is_empty());

        let mut f = seeded();
        assert_eq!(f.offer(60, "u", 105_000, false, 1, &p), Outcome::Accepted { promoted: vec![] }, "inside bounds");
        assert!(matches!(f.offer(61, "u", 300_000, false, 2, &p), Outcome::Rejected { .. }), "outside: not held");
        assert!(f.held.is_empty(), "never waits for peers, so it can't vouch for anyone");
    }

    #[test]
    fn ring_buffer_keeps_the_last_sixteen() {
        let p = Params::default();
        let mut f = Feed::new("NGN".into());
        for i in 0..20u64 {
            f.offer(i, "r", 100_000, true, i, &p);
        }
        assert_eq!(f.prices.len(), FEED_CAPACITY);
        assert_eq!(f.accepted_total, 20);
    }
}
