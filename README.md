# Signal Protocol

**A decentralized DePIN oracle verifying real-world retail price data on-chain via AI Vision.**

[Website](https://signal-bot-chi.vercel.app) · [Telegram Bot](https://t.me/OfficialSignalOracleBot) · [X (Twitter)](https://x.com/signalprotcol)

---

## The Problem

Existing oracle networks (Chainlink, Pyth) capture exchange-level and institutional price feeds. But the real economy — fuel at the pump, groceries on the shelf, local commodities at the market — happens offline. There is no decentralized oracle for **physical, street-level retail prices**. In emerging economies where informal retail dominates, this data gap is massive.

## The Solution

Signal Protocol turns everyday shoppers into verified data nodes. Users photograph real-world receipts and price tags via a Telegram bot. **Qwen3.8 Vision AI** (on NEAR AI Cloud, inside a Confidential TEE) audits each submission in real-time — rejecting screenshots, digital fakes, manipulated images, and prompt injections — then extracts item names, prices, and currency. Verified contributors earn instant on-chain micro-rewards.

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
- **Dual-Chain Consensus** — NEAR smart contract enforces peer quorums and local median bounds, while Solana Anchor program enforces vault payouts and non-custodial reputation PDAs.

### Smart Contracts
- **NEAR Contract (`signal-near/src/lib.rs`):**
  - Verifies NEAR AI's TEE signature on-chain (ECDSA secp256k1 via `ecrecover`) against the registered, attested signer.
  - Checks the prompt hash against the owner-registered prompt.
  - Generates cross-chain Solana filing payloads for NEAR Chain Signatures MPC.
  - Two-step ownership transfer (`nominate_owner` / `accept_ownership`) and emergency circuit breaker.
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
