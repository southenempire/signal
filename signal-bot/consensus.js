/**
 * Signal Protocol — consensus rules.
 *
 * Every AI-verified submission enters as PENDING with its reward locked.
 * Each priced item becomes an observation on a feed (CATEGORY:region:item) and is
 * checked two ways:
 *   1. Local price bounds — the median of accepted observations on that feed over
 *      the last BOUNDS_WINDOW_DAYS (needs MIN_BOUNDS_SAMPLES from other reporters).
 *   2. Peer reports — recent observations on the same feed from other reporters.
 *
 * A report is ACCEPTED (reward paid, recorded on-chain) when most of its items are
 * confirmed, SLASHED (reward forfeited, reputation cut, slash recorded on-chain)
 * when most are contradicted, and otherwise waits for peers. After
 * PENDING_TIMEOUT_HOURS with no verdict, reporters in good standing are accepted
 * (new feeds have to start somewhere); everyone else expires without a reward.
 *
 * This file is pure logic — no DB, chain or Telegram — so it can be unit tested.
 */

export const RULES = {
  BOUNDS_WINDOW_DAYS: 30,
  MIN_BOUNDS_SAMPLES: 3,
  BOUNDS_TOLERANCE: 0.40,   // ±40% of the local median
  PEER_WINDOW_HOURS: 72,
  PEER_TOLERANCE: 0.25,     // two reporters "agree" within ±25%
  PEER_QUORUM: 2,           // distinct contradicting peers needed to slash without bounds
  PENDING_TIMEOUT_HOURS: 48,
  BOOTSTRAP_MIN_REPUTATION: 40,

  REPUTATION_START: 50,
  REPUTATION_ACCEPT: +3,
  REPUTATION_SLASH: -20,
  REPUTATION_DUPLICATE: -10,
  REPUTATION_FAKE: -15,
  REPUTATION_BANNED_BELOW: 15,

  BASE_REWARD_USDC: 0.20,
  POINTS_PER_ACCEPTED: 150,
};

export function median(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const within = (price, reference, tolerance) =>
  reference > 0 && Math.abs(price - reference) / reference <= tolerance;

/**
 * Judge one observation.
 * @param {number} price         observed unit price (USD)
 * @param {{price_usd:number}[]} history  accepted observations on the feed (other reporters)
 * @param {{price_usd:number, telegram_id:number}[]} peers  recent peer observations
 * @returns {{verdict:'confirmed'|'contradicted'|'undetermined', detail:string}}
 */
export function evaluateObservation(price, history, peers, rules = RULES) {
  let bounds = 'none';
  let boundsMedian = null;
  if (history.length >= rules.MIN_BOUNDS_SAMPLES) {
    boundsMedian = median(history.map(h => h.price_usd));
    bounds = within(price, boundsMedian, rules.BOUNDS_TOLERANCE) ? 'agree' : 'disagree';
  }

  // Count distinct peer reporters, each judged by their own median price.
  const byReporter = new Map();
  for (const p of peers) {
    if (!byReporter.has(p.telegram_id)) byReporter.set(p.telegram_id, []);
    byReporter.get(p.telegram_id).push(p.price_usd);
  }
  let peerAgree = 0, peerDisagree = 0;
  for (const prices of byReporter.values()) {
    if (within(price, median(prices), rules.PEER_TOLERANCE)) peerAgree++;
    else peerDisagree++;
  }

  const detail = `bounds=${bounds}${boundsMedian ? `@${boundsMedian.toFixed(2)}` : ''} peers=+${peerAgree}/-${peerDisagree}`;

  if (bounds === 'agree') return { verdict: 'confirmed', detail };
  if (peerAgree > 0 && peerAgree >= peerDisagree) return { verdict: 'confirmed', detail };
  if (bounds === 'disagree' && peerAgree === 0) return { verdict: 'contradicted', detail };
  if (bounds === 'none' && peerAgree === 0 && peerDisagree >= rules.PEER_QUORUM) {
    return { verdict: 'contradicted', detail };
  }
  return { verdict: 'undetermined', detail };
}

/**
 * Decide a whole report from its observations' verdicts.
 * @returns {{decision:'accept'|'slash'|'expire'|'pending', reason:string}}
 */
export function decideReport(verdicts, ageHours, reputation, rules = RULES) {
  const n = verdicts.length;
  const confirmed = verdicts.filter(v => v === 'confirmed').length;
  const contradicted = verdicts.filter(v => v === 'contradicted').length;

  if (n === 0) return { decision: 'expire', reason: 'no priced items' };
  if (contradicted * 2 > n) return { decision: 'slash', reason: `${contradicted}/${n} items outside local bounds or contradicted by peers` };
  if (confirmed * 2 > n) return { decision: 'accept', reason: `${confirmed}/${n} items confirmed` };

  if (ageHours >= rules.PENDING_TIMEOUT_HOURS) {
    return reputation >= rules.BOOTSTRAP_MIN_REPUTATION
      ? { decision: 'accept', reason: 'no contradicting data after timeout; reporter in good standing' }
      : { decision: 'expire', reason: 'no confirmation after timeout and low reputation' };
  }
  return { decision: 'pending', reason: `waiting for peers (${confirmed} confirmed, ${contradicted} contradicted of ${n})` };
}

export function clampReputation(r) {
  return Math.max(0, Math.min(100, Math.round(r)));
}

/** Locked reward for a new report: scales from 0.5× to 1.5× base with reputation. */
export function rewardFor(reputation, rules = RULES) {
  return Number((rules.BASE_REWARD_USDC * (0.5 + clampReputation(reputation) / 100)).toFixed(2));
}

export function isBanned(reputation, rules = RULES) {
  return reputation < rules.REPUTATION_BANNED_BELOW;
}

// ─── Feed keys ────────────────────────────────────────────────────────────────

export const slug = (s) => String(s || '')
  .toLowerCase()
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')
  .slice(0, 40);

/** Region from the receipt's store location, else the user's saved city, else global. */
export function regionFor(store, userRegion) {
  const country = slug(store?.country).slice(0, 2);
  const city = slug(store?.city);
  if (country && city) return `${country}-${city}`;
  if (userRegion) return userRegion;
  return 'global';
}

export function feedKey(category, region, canonicalItem) {
  return `${category}:${region}:${slug(canonicalItem) || 'unknown'}`;
}
