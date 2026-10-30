# Signal Oracle — Solana program

On-chain consensus, locked rewards and slashing for Signal Protocol's physical price oracle.
Anchor 1.1.2 · SPL Token · tests on solana-bankrun.

## What it does

People photograph receipts and price tags; Signal's vision model reads each priced item. This
program decides whether each price is believed. Every report locks a USDC reward from a
program-owned pool, then gets checked against the local feed's median and against other
reporters' prices for the same item. Confirmed reports are paid and join the feed; contradicted
ones are slashed (reward stays in the pool, reputation drops). The result is a set of per-item,
per-city price feeds any Solana program can read, backed by a pool whose rules are enforced
on-chain rather than by the bot.

## How it works

### Accounts

```
SYSTEM PROGRAM OWNS        OUR PROGRAM OWNS                         TOKEN PROGRAM OWNS
───────────────────        ────────────────                         ──────────────────
admin wallet ──────────▶   Config  ["config"]                ──authority of──▶  Vault  ATA(config, USDC)
attester (Signal bot)        rules, attester, total_locked                       the reward pool
reporter wallet ───seed──▶ Reporter ["reporter", wallet]                         Reporter ATA(wallet, USDC)
                             reputation 0–100, accepted, slashed, locked          where rewards land
                           Feed   ["feed", sha256("FUEL:ng-lagos:petrol_litre")]
                             last 16 accepted prices → median
                           Report ["report", feed, image_hash]
                             price, locked reward, bounds verdict,
                             confirmations, contradictions, status
                           PeerLink ["peer", report_a, report_b]
                             exists ⇒ this pair was already compared
```

Prices and rewards are 6-decimal micro-units, like USDC (`800_000` = $0.80).

### Instructions

| Instruction | Who signs | What happens | The guard |
|---|---|---|---|
| `initialize` | admin | Creates Config and the vault ATA | Tolerances ≤ 100%, non-zero windows and reward |
| `fund_pool` | anyone | USDC from funder into the vault | `amount > 0` |
| `submit_report` | attester + reporter | Creates the Report, locks the reward, checks local bounds | `has_one = attester`; reputation ≥ ban floor; unlocked pool ≥ reward; `init` on the image-hash PDA blocks duplicates |
| `peer_check` | anyone (crank) | Two reports on one feed confirm or contradict each other | Same feed, different reporters, ≤ 72h apart, canonical order, PeerLink `init` so a pair counts once |
| `settle` | anyone (crank) | Accept → pay from vault, push price to feed, +3 rep. Slash → release lock, −20 rep. Expire → release lock | Report still pending; evidence or timeout reached |
| `flag_duplicate` | attester | −10 reputation for a wallet that resubmitted a photo | The existing Report PDA is the proof |
| `flag_fake` | attester | −15 reputation for a photo the vision check caught as faked | `has_one = attester`; image hash goes in the event as evidence |

### Decision rule (`settle`)

- **confirmed** = local bounds agree, **or** (feed too new for bounds) ≥1 peer agrees and agreeing ≥ disagreeing, **or** (bounds disagree) ≥ `peer_quorum` peers agree and agreeing > disagreeing
- **contradicted** = bounds disagree with no peer support, **or** (feed too new for bounds) ≥ `peer_quorum` peers disagree and none agree
- confirmed → **accept**; contradicted → **slash**
- neither, after `pending_timeout_secs` (48h) → **expire** if the price disagrees with the bounds, else accept if reputation ≥ 40, otherwise **expire**
- neither, before the timeout → `StillPending`

Reward = `base_reward × (50 + reputation) / 100`, so 0.5× at reputation 0 and 1.5× at 100.

### Off-chain vs on-chain

| Off-chain (Signal bot) | On-chain (this program) |
|---|---|
| Reading the photo with vision AI, currency conversion, item names | Who gets paid, how much, and when |
| Signing as attester to vouch "this price came from a real photo" | Locking, releasing and paying rewards from the vault |
| Calling `peer_check` / `settle` as a crank | Bounds checks, peer agreement, slashing, reputation, duplicate blocking, feed medians |

## What it costs

Rent is paid by the attester (reporters never need SOL), except PeerLink and reporter ATAs, which
the cranker pays.

| Account | Bytes (incl. 8-byte discriminator) | Rent, approx. |
|---|---|---|
| Report (one per priced item) | 133 | 0.0018 SOL |
| Feed (one per item × city) | 187 | 0.0022 SOL |
| Reporter (one per wallet) | 58 | 0.0013 SOL |
| PeerLink (one per compared pair) | 9 | 0.0010 SOL |

Compute units, measured in the test suite (max per instruction):

| initialize | fund_pool | submit_report | peer_check | settle | flag_duplicate / flag_fake |
|---|---|---|---|---|---|
| 40,854 | 22,387 | 40,351 | 21,685 | 78,112 (incl. creating the reporter's ATA) | ~10,500 |

Reports and PeerLinks are never closed, on purpose: the Report PDA is what blocks a duplicate
photo, so closing it would reopen that hole. Reclaiming rent from old PeerLinks is a safe follow-up.

## How you would attack it

- **The attester is trusted.** The program cannot see a photo. A compromised attester key can file
  any price for any wallet. Mitigations: keep the key in a KMS/HSM, rotate via an admin
  instruction (not built yet), and watch `ReportSubmitted` events for anomalies.
- **Sybil peers.** One person with several Telegram accounts can confirm their own fake price.
  `SameReporter` only stops the same wallet. Overriding a feed's bounds takes `peer_quorum`
  agreeing reporters and a report outside the bounds never passes on timeout, so a pair of
  wallets can't move an established feed; a larger ring still can. Real defences are off-chain (phone/KYC-lite per
  wallet) or on-chain stake per reporter; today reputation is the only cost.
- **Poisoning a new feed.** Before a feed has `min_bounds_samples` accepted prices there are no
  bounds, so the first few reports set them. Coordinated early reporters can anchor a feed. Higher
  `min_bounds_samples` and timeout-acceptance only for high-reputation reporters raise the bar.
- **Cranking selectively.** `peer_check` is permissionless, so a reporter can pick which peers to
  compare against (only agreeing ones). The rule requires agreeing ≥ disagreeing, so anyone else
  can crank the disagreeing pairs too, but nobody is forced to.
- **Same photo, different item.** The duplicate guard is per (feed, photo). Filing one receipt
  under several items is allowed by design (one receipt, many prices), so the attester must not
  invent items that aren't on it.
- **Draining the pool.** Not possible without accepted reports: payouts only happen in `settle`,
  only up to the locked reward, and `total_locked` stops new reports when the pool is fully committed.

## Build, test, generate the client

```bash
anchor build
npx ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts
npx codama run js   # TypeScript client in clients/js, from target/idl/signal_oracle.json
```

## Devnet

| | Address |
|---|---|
| Program | `HmCLsXYjktA3EaSmipee7qzDNTefJASUWaXeiafwmquS` |
| Config | `9JuGskPf57Dc5kFphLegDjSujK8MoUeDQyhR6T7vBVSc` |
| Reward vault | `oEbtdoTmn9Jjz2rhrxqPfNfReTqAVADmB7YRRXNeL1u` |
| Test USDC mint | `EESdc7GihN61fSxBERHeggR4bihVGnzfWcM5sGRZfL2p` |
| Admin (upgrade authority, mint authority) | `EHujnJSXxjWSXdiuXYLRbAi3Vtt4p9BGuusYR8w4zCqW` — kept off the server |
| Attester (the bot's only Solana key) | `2nk5gWSpKEViCqJL6vp1SmFfWr4dVUXJLnhzTxR8VPUW` |

The first deployment (`FQaPnaSi…r86S`) was closed after the Railway incident because its single
key was stored on Railway.

Set up a cluster (initialize + fund the pool) with:

```bash
ADMIN_KEYPAIR=<admin.json> ATTESTER=<bot wallet> USDC_MINT=<mint> FUND_USDC=1000 npx ts-node -P tsconfig.json scripts/init-devnet.ts
```

Keys are split: the admin key never goes to the server, so a server leak can file and crank
reports but cannot upgrade the program, mint test USDC, or change the config.
