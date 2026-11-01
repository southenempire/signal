# Signal Protocol

**A decentralized DePIN oracle verifying real-world retail price data on-chain via AI Vision.**

[Website](https://signal-bot-chi.vercel.app) · [Telegram Bot](https://t.me/OfficialSignalOracleBot) · [X (Twitter)](https://x.com/signalprotcol)

---

## The Problem

Existing oracle networks (Chainlink, Pyth) capture exchange-level and institutional price feeds. But the real economy — fuel at the pump, groceries on the shelf, local commodities at the market — happens offline. There is no decentralized oracle for **physical, street-level retail prices**. In emerging economies where informal retail dominates, this data gap is massive.

## The Solution

Signal Protocol turns everyday shoppers into verified data nodes. Users photograph real-world receipts and price tags via a Telegram bot. **Qwen3.8 Vision AI** (on NEAR AI Cloud, inside a TEE) audits each submission in real-time — rejecting screenshots, digital fakes, and manipulated images — then extracts item names, prices, and currency. Verified contributors earn instant on-chain micro-rewards.

```
📸 Snap a receipt   →   🧠 AI Vision verifies   →   ⛓️ Logged on-chain   →   💰 Earn USDC
```

---

## NEAR Hackathon

**Disclosure.** Signal existed before the hackathon: the Telegram bot, the Solana (Anchor) program and the
BOTChain mirror are the baseline, tagged `pre-hackathon`. Only the NEAR integration, built on the
`near-hackathon` branch during the event, is the entry:
[diff `pre-hackathon…hackathon-submission`](https://github.com/southenempire/signal/compare/pre-hackathon...hackathon-submission).

**What it adds.** Before, the bot was trusted to report what its vision model said. Now NEAR AI's
vision model audits each receipt inside a TEE (Intel TDX + NVIDIA GPU) and signs what it saw, and a NEAR
contract checks that signature on-chain before filing a single price. Receipt photos are never stored
or put on-chain — only their sha256.

| Part | Where |
| --- | --- |
| NEAR contract: on-chain TEE signature check, prompt check, replay/duplicate protection, price feeds with a peer quorum | [`signal-near/`](signal-near/) — deployed at `oracle.signal-southen.testnet` |
| Verified vision through NEAR AI Cloud, keeping the exact signed bytes | [`signal-bot/nearai.js`](signal-bot/nearai.js) |
| Bot files every verdict on NEAR as a relayer for anonymous reporter ids | [`signal-bot/near_oracle.js`](signal-bot/near_oracle.js) |
| Live attestation check (fresh nonce, TDX, GPU, key registered on NEAR) and every NEAR report | [`/verify`](https://signal-bot-chi.vercel.app/verify) |

**Try it**

1. Open [signal-bot-chi.vercel.app/verify](https://signal-bot-chi.vercel.app/verify) → see NEAR AI's attestation verified live with a fresh nonce, the key registered in the contract, and the latest reports filed on NEAR.
2. Send a receipt photo to [@OfficialSignalOracleBot](https://t.me/OfficialSignalOracleBot) → the reply links the NEAR transaction that filed it; the report appears on `/verify`.
3. `near view oracle.signal-southen.testnet list_feeds '{}'` → read the feeds straight from NEAR.
4. `cd signal-near && cargo test` → 22 tests pass, including real NEAR AI signatures and a one-byte forgery being rejected.
5. Reproduce a filing yourself: see [`signal-near/README.md`](signal-near/README.md#try-it).

**Built with:** near-sdk 5.30 (Rust) and cargo-near, near-api-js 7.4, NEAR AI Cloud (`Qwen/Qwen3.8-27B`) and
`@nearai/inference-sdk` 0.2.1, serde_json, hex, k256 (tests). AI coding tools: Claude Code (Anthropic) wrote and tested much of the NEAR integration with the author; Devin reviewed the codebase for bugs.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     USER (Telegram)                              │
│          📸 Photo Report → @OfficialSignalOracleBot              │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                ┌──────────▼──────────┐
                │   Signal Bot Core   │
                │  (Node.js/Telegraf)  │
                └──┬──────┬──────┬────┘
                   │      │      │
        ┌──────────▼┐  ┌──▼───┐  ┌▼───────────┐
        │ Qwen-3.8  │  │SQLite│  │  Express    │
        │ Vision AI │  │  DB  │  │  REST API   │
        │  (Groq)   │  │      │  │  /api/stats │
        └───────────┘  └──────┘  └──────┬──────┘
                                        │
   ┌────────────────────────────────────▼──────────────────────┐
   │                    Settlement Rails                       │
   │                                                           │
   │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐ │
   │  │   Solana     │  │  BOTChain    │  │ Yellow Network   │ │
   │  │  SPL USDC    │  │  Oracle Log  │  │ State Channels   │ │
   │  │  Payouts     │  │  (Chain 677) │  │ Gasless Settle   │ │
   │  └─────────────┘  └──────────────┘  └──────────────────┘ │
   └───────────────────────────────────────────────────────────┘
```

---

## Multi-Chain Deployments

| Chain | Type | Address / Endpoint |
|:------|:-----|:-------------------|
| **BOTChain** (Mainnet, Chain ID 677) | Oracle Contract | [`0x9119b3D7e7DcC540F08D62CeBC5bC2f83e8793f2`](https://scan.botchain.ai/address/0x9119b3D7e7DcC540F08D62CeBC5bC2f83e8793f2) |
| **Solana** (Devnet) | SPL USDC Payouts | `FVyGEtqSKPHkiKgeSa8imWW5gzWNN5A5txwJgs7zFQhb` |
| **Yellow Network** | State Channel Settlement | Gasless micro-rewards via Nitrolite SDK |

---

## Features

### Oracle Engine
- **AI Vision Verification** — Qwen3.8 27B (NEAR AI Cloud in a TEE; Groq as fallback) audits physical receipt photos in real-time
- **Anti-Fraud System** — SHA-256 image fingerprinting, duplicate rejection, daily rate limits
- **5 Reporting Categories** — Fuel, Grocery, Electricity, Rent, Global Physical Data
- **Multi-Rail Settlement** — Solana SPL USDC + BOTChain on-chain logging + Yellow Network gasless payouts

### Smart Contract (`SignalOracle.sol`)
- `recordPrice(category, usdcPrice, imageHash, reporter)` — Logs verified price data on-chain
- `getReport(index)` — Retrieves a specific verified report
- `getReportCount()` — Returns total number of on-chain reports
- Emits `PriceReported` events for indexing and analytics

### Telegram Bot
- Auto-generated Solana wallet per user on first interaction
- Real-time leaderboard and contributor rankings
- Withdrawal system to any external Solana wallet
- Full self-custody — users can export their private keys
- BOTChain Hub with live network status

### REST API
- `GET /api/stats` — Live network statistics (signalers, reports, payouts)
- `GET /api/reports` — Recent verified price reports
- `GET /api/leaderboard` — Top contributors

---

## Tech Stack

| Layer | Technology |
|:------|:-----------|
| Runtime | Node.js 20+ (ESM) |
| Bot Framework | Telegraf v4 |
| AI Vision | Qwen3.8 27B on NEAR AI Cloud (TEE, signed verdicts); Groq fallback |
| Blockchain (L1) | Solana (`@solana/web3.js`, `@solana/spl-token`) |
| Blockchain (EVM) | BOTChain via Ethers.js v6 |
| State Channels | Yellow Network Nitrolite SDK |
| Database | SQLite (better-sqlite3) |
| API Server | Express v5 |
| Smart Contracts | Solidity 0.8.x |

---

## Getting Started

### Prerequisites
- Node.js 20+
- A Telegram Bot Token ([create via @BotFather](https://t.me/BotFather))
- A Groq API Key ([get one here](https://console.groq.com))

### Installation

```bash
git clone https://github.com/southenempire/signal.git
cd signal
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```env
TELEGRAM_BOT_TOKEN=your_bot_token
GROQ_API_KEY=your_groq_api_key
RPC_URL=https://api.devnet.solana.com
USDC_MINT=your_usdc_mint_address
SOLANA_KEYPAIR_JSON=[your_wallet_keypair_array]

# BOTChain (Optional)
BOTCHAIN_RPC=https://mainnet-rpc.botchain.ai
BOTCHAIN_PRIVATE_KEY=your_botchain_private_key

# Yellow Network (Optional)
YELLOW_USER_PRIVATE_KEY=your_yellow_private_key
```

### Run

```bash
npm start
```

---

## Project Structure

```
signal-bot/
├── index.js              # Main bot logic, AI verification, settlement
├── db.js                 # SQLite database layer
├── yellow.js             # Yellow Network state channel integration
├── images.js             # Image storage and hash management
├── contracts/
│   ├── SignalOracle.sol   # On-chain oracle contract (Solidity)
│   └── deployed.json     # Deployment metadata (BOTChain)
├── deploy_botchain.js    # BOTChain deployment script
├── package.json
└── railway.toml          # Railway deployment config
```

---

## Ecosystem

Signal Protocol is part of the **BOTChain Ecosystem Incubation Program** and has applied for listings on:
- [DefiLlama](https://defillama.com) — TVL adapter submitted
- [Alchemy DApp Store](https://www.alchemy.com/dapps) — Application under review
- [Superteam Earn](https://superteam.fun) — Agentic Engineering Grant applicant

---

## Contributing

Contributions are welcome. Please open an issue first to discuss what you would like to change.

## License

MIT

---

**Built by [@Southen_](https://x.com/Southen13)**
