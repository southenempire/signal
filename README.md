# Signal Protocol

**A decentralized DePIN oracle verifying real-world retail price data on-chain via AI Vision.**

[Website](https://signal-bot-chi.vercel.app) · [Telegram Bot](https://t.me/OfficialSignalOracleBot) · [Pitch Deck](https://signal-bot-chi.vercel.app/pitch.html) · [X (Twitter)](https://x.com/signalprotcol)

---

## The Problem

Existing oracle networks (Chainlink, Pyth) capture exchange-level and institutional price feeds. But the real economy — fuel at the pump, groceries on the shelf, local commodities at the market — happens offline. There is no decentralized oracle for **physical, street-level retail prices**. In emerging economies where informal retail dominates, this data gap is massive.

## The Solution

Signal Protocol turns everyday shoppers into verified data nodes. Users photograph real-world receipts and price tags via a Telegram bot. **Qwen-3.6 Vision AI** audits each submission in real-time — rejecting screenshots, digital fakes, and manipulated images — then extracts item names, prices, and currency. Verified contributors earn instant on-chain micro-rewards.

```
📸 Snap a receipt   →   🧠 AI Vision verifies   →   ⛓️ Logged on-chain   →   💰 Earn USDC
```

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
        │ Qwen-3.6  │  │SQLite│  │  Express    │
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
| **BOTChain** (Mainnet, Chain ID 677) | Oracle Contract | [`0x19ab0982C0ea2C4790Fcc0eA6b48e9F2dE017243`](https://scan.botchain.ai/address/0x19ab0982C0ea2C4790Fcc0eA6b48e9F2dE017243) |
| **Solana** (Devnet) | SPL USDC Payouts | `FVyGEtqSKPHkiKgeSa8imWW5gzWNN5A5txwJgs7zFQhb` |
| **Yellow Network** | State Channel Settlement | Gasless micro-rewards via Nitrolite SDK |

---

## Features

### Oracle Engine
- **AI Vision Verification** — Qwen-3.6 27B (via Groq Cloud) audits physical receipt photos in real-time
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
| AI Vision | Qwen-3.6 27B via Groq Cloud API |
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
