# Signal Protocol

**A private price oracle for the street economy: shoppers photograph receipts, NEAR AI checks them inside a TEE, NEAR decides, Solana pays.**

[Website](https://signal-bot-chi.vercel.app) · [Telegram Bot](https://t.me/OfficialSignalOracleBot) · [X (Twitter)](https://x.com/signalprotcol)

### For judges: one minute

- **What:** a receipt photo becomes a verified price on NEAR, and the person who sent it is paid in USDC on Solana.
- **Why it is private:** the photo is checked inside NEAR AI's TEE and never stored. Only its SHA-256 goes on-chain, and the published answer holds city, date, items and prices, never names, addresses or card numbers.
- **Why you can trust it:** our NEAR contract checks NEAR AI's TEE signature itself (`ecrecover`) before filing a price, and only that contract's Chain Signatures key can pay on Solana.
- **Live data (8 Nov 2026):** 12 reports from 10 reporters on NEAR (Lagos, Port Harcourt, Johor Bahru, Seri Kembangan), 37 prices paid on Solana. Early, and every one checkable.
- **Check it yourself:** [`/verify`](https://signal-bot-chi.vercel.app/verify) runs the TEE attestation live · `near view oracle.signal-southen.testnet list_feeds '{}'` · `cd signal-near && cargo test` (46 pass, including a one-byte forgery being rejected).
- **Known limits:** one relayer, custodial wallets and testnet keys. See [Trust model and known limits](#trust-model-and-known-limits).

---

## The Problem

Existing oracle networks (Chainlink, Pyth) capture exchange-level and institutional price feeds. But the real economy — fuel at the pump, groceries on the shelf, local commodities at the market — happens offline. There is no decentralized oracle for **physical, street-level retail prices**. In emerging economies where informal retail dominates, this data gap is massive.

## The Solution

Signal turns everyday shoppers into price reporters without exposing them. Users photograph receipts and price tags in a Telegram bot. **Qwen3.8 Vision** on NEAR AI Cloud audits each photo inside a confidential TEE: it rejects screenshots, edited or generated images and prompt injections, extracts the items, prices and currency, and drops everything that identifies a person or shop. The photo is never stored. Accepted prices earn on-chain micro-rewards.

```
📸 Snap a receipt   →   🧠 AI Vision (NEAR TEE)   →   ⛓️ NEAR Decides   →   💰 Solana Pays USDC
```

---

## NEAR Hackathon

**Disclosure.** Signal existed before the hackathon: the Telegram bot, the Solana (Anchor) program, and the
BOTChain mirror are the baseline, tagged `pre-hackathon`. Only the NEAR integration, built on the
`near-hackathon` branch during the event, is the entry:
[diff `pre-hackathon…hackathon-submission`](https://github.com/southenempire/signal/compare/pre-hackathon...hackathon-submission).

**What it adds.** Before, the bot was trusted to report what its vision model said. Now NEAR AI's
vision model audits each receipt inside a TEE (Intel TDX + NVIDIA GPU) and cryptographically signs what it saw. A NEAR
contract checks that signature on-chain before filing a single price. Rewards are still paid on Solana,
but only for prices NEAR accepted: the NEAR contract is the Solana program's attester through Chain
Signatures, so no bot or server key can file. Receipt photos are never stored or put on-chain — only
their SHA-256 hash.

**Why pay on Solana?** Our users' wallets and USDC liquidity live on Solana; NEAR supplies the
trust. Chain Signatures exist for exactly this: the NEAR contract decides, and its key is the only
one that can pay on Solana.

**Track.** `privacy`. NEAR features used: Private AI on NEAR AI Cloud (TEE, Intel TDX + NVIDIA GPU,
attestation checked with a fresh nonce), the TEE's signature verified on-chain in our own NEAR contract,
Chain Signatures (the NEAR contract is the only key that can file on Solana), and per-reporter
reputation with fraud flagging.

**Other entry (Q-015).** The same author also submits **GhostAgent**, a separate project: a NEAR vault
that lets an AI agent pay invoices only with a decision signed inside NEAR AI Cloud's TEE (tracks
`security` and `agents`). Both use the same technique — a NEAR contract checking NEAR AI's TEE signature
with `ecrecover`, and Chain Signatures — for different products, with separate repositories, contracts and deployments.

| Part | Where |
| --- | --- |
| NEAR contract: on-chain TEE signature check, prompt hash check, replay/duplicate protection, price feeds with a peer quorum | [`signal-near/`](signal-near/) — deployed at `oracle.signal-southen.testnet` |
| Verified vision through NEAR AI Cloud, keeping the exact signed bytes | [`signal-bot/nearai.js`](signal-bot/nearai.js) |
| Bot files every verdict on NEAR as a relayer for anonymous reporter ids | [`signal-bot/near_oracle.js`](signal-bot/near_oracle.js) |
| **NEAR decides, Solana pays**: the NEAR contract is the Solana program's attester through Chain Signatures. For each price it accepts, it builds the Solana filing itself and NEAR's MPC network signs it; the Solana program pays the reward from its vault. No bot or server key can file | [`signal-near/src/solana.rs`](signal-near/src/solana.rs), `update_attester` + `submit_verified_report` in [`signal-program/`](signal-program/) |
| Live attestation check (fresh nonce, TDX, GPU, key registered on NEAR), the Solana attester check, and every NEAR report with its Solana payout | [`/verify`](https://signal-bot-chi.vercel.app/verify) |

**Try it**

1. Open [signal-bot-chi.vercel.app/verify](https://signal-bot-chi.vercel.app/verify) → see NEAR AI's attestation verified live with a fresh nonce, the key registered in the contract, and the latest reports filed on NEAR.
2. Send a receipt photo to [@OfficialSignalOracleBot](https://t.me/OfficialSignalOracleBot) → the reply links the NEAR transaction that filed it and confirms the accepted prices are being paid on Solana; on `/verify` each accepted price shows "→ Solana: accepted, 0.20 USDC paid" with a link to its Solana account.
3. `near view oracle.signal-southen.testnet list_feeds '{}'` → read the feeds straight from NEAR.
4. `cd signal-near && cargo test` → 46 tests pass, including real NEAR AI signatures, a one-byte forgery being rejected, the published answer holding no personal details, and feed-stuffing attempts being refused.
5. Reproduce a filing yourself: see [`signal-near/README.md`](signal-near/README.md#try-it).

No real data is needed: the tests use captured NEAR AI responses ([`signal-near/tests/fixtures`](signal-near/tests/fixtures)),
and `file-audit.mjs` runs on a receipt from the public SROIE research dataset instead of your own
(see [`signal-near/README.md`](signal-near/README.md#try-it)).

**Built with:** near-sdk 5.30 (Rust) and cargo-near, near-api-js 7.4, NEAR AI Cloud (`Qwen/Qwen3.8-27B`) and
`@nearai/inference-sdk` 0.2.1, Anchor 1.1.2 (Solana), serde_json, hex, k256 (tests). AI coding tools: Claude Code (Anthropic) wrote and tested much of the NEAR integration with the author; Devin reviewed the codebase for bugs.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  USER (Telegram)  photographs a receipt / price tag / fuel pump  │
└─────────────────────────────────┬────────────────────────────────┘
                                  │ photo (held in memory only)
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│  SIGNAL BOT (relayer)  sends the photo to NEAR AI, files the     │
│  signed verdict on NEAR, relays the MPC-signed tx to Solana      │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│  NEAR AI CLOUD (TEE: Intel TDX + NVIDIA GPU)                     │
│  Audits the image, extracts prices, signs (ECDSA secp256k1)      │
└─────────────────────────────────┬────────────────────────────────┘
                                  │ signed request + response
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│  NEAR CONTRACT  oracle.signal-southen.testnet                    │
│  ecrecover on the TEE signature · prompt hash · price rules      │
│  Builds the Solana filing · Chain Signatures MPC signs (Ed25519) │
└─────────────────────────────────┬────────────────────────────────┘
                                  │ Solana tx signed by NEAR's key
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│  SOLANA PROGRAM (Devnet)  HmCLsXYj…mquS                          │
│  Accepts filings only from the NEAR attester · pays USDC         │
└──────────────────────────────────────────────────────────────────┘
```

### Trust model and known limits

- **One root of trust: the NEAR contract owner.** The owner registers which NEAR AI signing key and
  which prompt hash the contract accepts, so a malicious owner could register a fake key. Both are
  public: `get_signer` and `get_prompts` on `oracle.signal-southen.testnet`, and `/verify` checks the
  live key against NEAR AI's attestation with a fresh nonce. The owner can pause filing
  (`set_paused`), and ownership moves only in two steps (`propose_owner`, `accept_owner`).
- **Solana trusts NEAR.** The Solana program accepts filings only from the NEAR contract's Chain
  Signatures key and accepts them on the next settlement pass, without its own bounds or peer
  checks. Those run on NEAR before that (`feed.offer`): a price far from a feed's median is held for
  peers or refused.
- **The bot is custodial and is the only relayer today.** It holds each user's Solana key (exportable
  at any time) and registers their payout wallet on NEAR. A compromised bot could redirect rewards or
  file as made-up users, but cannot forge NEAR AI's signature or reuse a photo. The bot keeps users,
  reputation and wallet keys (AES-encrypted) in SQLite on its host; photos stay in memory only. The
  contract already accepts several relayers (`set_relayer`); running more than one is an operational
  step, not a contract change.
- **Fake reporters (sybils).** Defences today: NEAR AI flags edited, generated and screenshot photos
  as fraud on-chain; each photo pays once per item (by its hash, on NEAR and on Solana); a price far
  from the feed's median is held until other reporters confirm it; each user can send at most 10
  reports a day. What is not solved: one person with many accounts and many genuine receipts. That needs
  identity or stake per reporter, planned before mainnet.
- **Photos cannot be re-checked later, by design.** NEAR AI fetches the photo from a short-lived link
  on the bot's server that is deleted after the check. Keeping receipts would mean storing people's
  purchases, so only the photo's SHA-256 is kept on-chain. The reporter can prove a photo with their
  own copy; nobody else can see it.
- **Testnet keys.** The NEAR owner key, the bot's NEAR key and the Solana upgrade authority are
  single keys today. Before mainnet they move to a multisig or hardware-backed signer, and users get
  to bring their own wallet (wallet changes would then need that wallet's signature).
- **Website analytics.** The site uses Vercel Web Analytics: page views only, no cookies, no
  personal data. The bot sends nothing to it.

---

## Who Pays

**Brands.** Companies already pay field teams to walk into shops and record shelf prices. Signal
gets the same price from a shopper's photo, checked by private AI, for about $0.20 in rewards per
price (every payout is visible on Solana). Example from live data: the price of a 125 g sardine tin
in Port Harcourt, from a real receipt, verified on NEAR and paid on Solana.

The model: a brand funds a campaign ("the price of our product in 100 Lagos shops this month"),
shoppers collect it, and Signal keeps a fee on top of the rewards. On-chain apps and aid groups that
need local prices are the next buyers. **No one pays yet:** rewards come from a testnet pool today,
and the next step is one paid pilot in one city.

**Before buyers, rewards are never paid out of pocket.** Mainnet rewards switch on only when outside
money is in the vault: prizes and grants first, then our raise, then buyers who deposit a campaign's
rewards before anyone collects. The Solana program cannot pay more than the vault holds (a filing
fails with `PoolExhausted`). At $0.20 a price, 1,000 verified prices cost $200, and rewards go to a
short list of staples in one city, so the money builds a few strong feeds instead of many thin ones.

### Roadmap

| Stage | What |
|---|---|
| Now | Telegram bot: no download, works on cheap phones and slow data. NEAR AI checks every photo, NEAR decides, Solana pays |
| Next | Telegram Mini App, mainnet, first paid pilot in Nigeria |
| Later | Android app with offline capture and wallets owned by users; Ghana and Kenya; paid feeds for on-chain apps |

---

## Multi-Chain Deployments

| Chain | Type | Address / Endpoint |
|:------|:-----|:-------------------|
| **NEAR** (Testnet) | Confidential TEE Oracle & Feeds | [`oracle.signal-southen.testnet`](https://testnet.nearblocks.io/address/oracle.signal-southen.testnet) |
| **Solana** (Devnet) | Anchor Consensus & USDC Vault | [`HmCLsXYjktA3EaSmipee7qzDNTefJASUWaXeiafwmquS`](https://explorer.solana.com/address/HmCLsXYjktA3EaSmipee7qzDNTefJASUWaXeiafwmquS?cluster=devnet) |
| **BOTChain** (Mainnet, Chain ID 677) | EVM Mirror Oracle Registry | [`0x9119b3D7e7DcC540F08D62CeBC5bC2f83e8793f2`](https://scan.botchain.ai/address/0x9119b3D7e7DcC540F08D62CeBC5bC2f83e8793f2) |

---

## Features

### Oracle Engine
- **Verifiable AI Vision** — Qwen3.8 27B inside a Confidential TEE on NEAR AI Cloud audits physical receipt photos in real-time.
- **Anti-Fraud & Slashing** — SHA-256 image fingerprinting, duplicate race-condition locking, visual prompt injection defense, and automated reputation slashing.
- **Privacy by Design** — Receipt photos are held in memory only and never go on-chain (only their SHA-256 hash). Telegram IDs never touch a chain: reporters appear only as pseudonymous Solana wallets and salted ids, and locations only at city level.
- **Dual-Chain Consensus** — the NEAR contract enforces local median bounds and peer quorums; the Solana program pays from its vault and keeps each reporter's reputation in a PDA.

### Smart Contracts
- **NEAR Contract (`signal-near/src/lib.rs`):**
  - Verifies NEAR AI's TEE signature on-chain (ECDSA secp256k1 via `ecrecover`) against the registered, attested signer.
  - Checks the prompt hash against the owner-registered prompt.
  - Generates cross-chain Solana filing payloads for NEAR Chain Signatures MPC.
  - Two-step ownership transfer (`propose_owner` / `accept_owner`) and an emergency pause (`set_paused`).
- **Solana Program (`signal-program/programs/signal_oracle/src/lib.rs`):**
  - PDA-governed USDC reward vault and per-reporter reputation tracking (0–100).
  - Rotatable attester authority pointing directly to NEAR's Chain Signatures MPC public key.
  - On-chain duplicate photo prevention and peer-confirmation checks.
- **EVM Mirror (`signal-bot/contracts/SignalOracle.sol`):**
  - `recordPrice(feedKey, usdcPrice, imageHash, reporterId, wallet, feedMedian, feedSamples, newReputation)` logs verified data to BOTChain L1.

### Telegram Bot
- Custodial Solana wallet created per user on `/start`; the user can export its key at any time.
- 60-second ephemeral self-deleting private key export for user security.
- In-flight photo concurrency locks to prevent double-spending or duplicate submission races.
- Direct links to NEAR transaction proofs and Solana payout accounts.

---

## Monorepo Layout

```
colosseum-frontier/
├── apps/bot/             # Next.js 14 web app, /verify explorer & API proxy routes
├── signal-near/          # NEAR smart contract (Rust), TEE signature checks & MPC solana.rs
├── signal-program/       # Solana Anchor program (Rust), PDA reward vaults & reputation
└── signal-bot/           # Telegram bot client, NEAR AI TEE integration & relayer
    ├── index.js          # Telegram bot handlers & pipeline orchestration
    ├── nearai.js         # NEAR AI Cloud inference & TEE attestation client
    ├── near_oracle.js    # NEAR contract relayer client
    ├── solana_oracle.js  # Solana Anchor program client
    ├── db.js             # SQLite persistence (users, reputation, pending holds)
    └── contracts/        # EVM Solidity oracle contract (BOTChain)
```

---

## Tech Stack

| Layer | Technology |
|:------|:-----------|
| Runtime | Node.js 22 (bot), Node.js 24 (website) |
| Web Explorer | Next.js 14 (App Router), Tailwind CSS, Framer Motion |
| Bot Framework | Telegraf v4 |
| Confidential AI | Qwen3.8 27B on NEAR AI Cloud (TEE Enclave, signed verdicts) |
| Blockchain (NEAR) | NEAR SDK 5.30 (Rust), NEAR Chain Signatures MPC |
| Blockchain (Solana)| Anchor 1.1.2 (Rust), `@solana/web3.js`, `@solana/spl-token` |
| Blockchain (EVM) | BOTChain via Ethers.js v6 (Solidity 0.8.20) |
| Database | SQLite (`better-sqlite3`) |

---

## Getting Started

### Prerequisites
- Node.js 22+ for the bot, Node.js 24 for the website
- Rust & Cargo (with `wasm32-unknown-unknown` target for NEAR contract)
- A Telegram Bot Token ([create via @BotFather](https://t.me/BotFather))
- A NEAR AI API Key ([create via NEAR AI Cloud](https://cloud.near.ai))

### Environment Variables

Configure `signal-bot/.env`:

```env
TELEGRAM_BOT_TOKEN=your_bot_token
NEARAI_API_KEY=your_nearai_api_key
PUBLIC_URL=https://your-bot-host   # NEAR AI fetches photos from here
RPC_URL=https://api.devnet.solana.com
USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
SOLANA_KEYPAIR_JSON=[your_wallet_keypair_array]

# NEAR Integration
NEAR_NETWORK=testnet
NEAR_ACCOUNT_ID=bot.signal-southen.testnet
SIGNAL_NEAR_CONTRACT=oracle.signal-southen.testnet
NEAR_PRIVATE_KEY=ed25519:...
NEAR_ATTESTS_SOLANA=on          # NEAR files on Solana via Chain Signatures

# BOTChain (Optional)
BOTCHAIN_RPC=https://rpc.botchain.ai
BOTCHAIN_PRIVATE_KEY=your_botchain_private_key
```

### Running Locally

```bash
# 1. Run NEAR Contract Unit Tests (46 passing)
cd signal-near && cargo test

# 2. Run the Next.js Frontend
cd apps/bot && npm run dev

# 3. Run the Signal Telegram Bot
cd signal-bot && npm start
```

---

## License

MIT

---

**Built by [@Southen_](https://x.com/Southen13)**
