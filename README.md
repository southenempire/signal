# Signal Protocol
> **The Physical Truth Layer for the Agent Economy.**
> 
> [**View Cinematic Pitch Deck**](https://signal-bot-chi.vercel.app/pitch.html) | [**Try the Bot**](https://t.me/OfficialSignalOracleBot)

Signal is a decentralized physical oracle network on Solana that provides sovereign, real-time truth for autonomous entities. We bridge the physical-to-digital gap by turning global nodes into verified data providers. Signal enables AI agents to see, hear, and verify the physical world with cryptographic certainty.

**Zero Friction. Sub-second Finality. Machine-Ready Truth.**

---

## How It Works

```
📸 Snap a photo          →  🧠 Vision AI verifies     →  💰 Earn USDC instantly
(price tag, fuel pump,       (Claude-3.5-Sonnet          (settled via MagicBlock
receipt, shelf label)        authenticates truth)         private transfers)
```

1. **Report** — Send a photo of any real-world price to the Signal Telegram bot
2. **Verify** — Claude-3.5-Sonnet Vision AI extracts and validates the data in real-time
3. **Earn** — USDC is deposited to your auto-generated Solana wallet via MagicBlock private payments
4. **Yield** — Optionally stake earned USDC into jupUSD via Jupiter V6 for yield

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER (Telegram)                          │
│         📸 Photo Report  →  📱 @OfficialSignalOracleBot         │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Signal Bot Core   │
                    │   (Node.js/Telegraf) │
                    └──┬───────┬───────┬──┘
                       │       │       │
              ┌────────▼──┐ ┌──▼────┐ ┌▼──────────┐
              │ Claude 3.5│ │SQLite │ │  Express   │
              │ Vision AI │ │  DB   │ │  REST API  │
              │ (Anthropic)│ │       │ │ /api/stats │
              └────────┴──┘ └───────┘ └──────┬────┘
                       │                      │
              ┌────────▼──────────────────────▼────┐
              │          Solana Devnet               │
              │  ┌──────────┐  ┌─────────────────┐  │
              │  │MagicBlock│  │  Jupiter V6 API  │  │
              │  │ Private  │  │  USDC → jupUSD   │  │
              │  │ Payments │  │  Yield Staking   │  │
              │  └──────────┘  └─────────────────┐  │
              └─────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|:------|:-----------|:--------|
| **Reporting Layer** | Telegram Bot (Telegraf) | Zero-friction user onboarding for human and hardware nodes |
| **Verification Engine** | Claude-3.5-Sonnet + Gemini Flash | Multi-provider Vision AI for physical data auditing |
| **Blockchain Core** | Solana (Web3.js + Anchor) | Programmable settlement, rewards, and protocol governance |
| **Privacy & Speed** | MagicBlock Ephemeral Rollups | Sub-second finality for physical reports via private rollups |
| **Liquidity Layer** | Jupiter V6 Aggregator | Real-time yield generation (USDC → jupUSD) for nodes |
| **Agent Access** | Signal Agent SDK | Programmatic physical data procurement for autonomous agents |
| **Dashboard** | Next.js 14 + Three.js | Real-time visualization of global network truth |

---

## Features

### Physical Oracle Protocol
- **Vision AI Auditing**: Claude-3.5-Sonnet primary → Gemini 1.5 Flash fallback
- **Sub-second Settlement**: MagicBlock Ephemeral Rollups for near-instant on-chain finality
- **Integrity Engine**: SHA-256 fingerprinting to prevent physical data spoofing
- **Yield-Bearing Rewards**: Auto-staking of node rewards into jupUSD via Jupiter

### Agent-First Infrastructure
- **Signal SDK**: A developer-first library for autonomous agents to request 'ground truth'
- **Truth Tax**: Transparent, on-chain protocol fees for data requests
- **Geographic Mesh**: Global distribution of nodes for localized verification

### Telegram Oracle Bot
- **5 reporting categories**: Fuel, Grocery, Electricity, Rent, Global Physical Data
- **Dual AI verification**: Claude-3.5-Sonnet primary → Gemini 1.5 Flash fallback
- **Anti-fraud system**: Image hash deduplication, daily rate limits, agent spend policies
- **Auto-generated wallets**: Each user gets a Solana wallet on first interaction
- **Jupiter integration**: Auto-stake USDC earnings to jupUSD for yield
- **Withdrawal system**: Send USDC/jupUSD to any external Solana wallet
- **Private key export**: Full self-custody — users own their keys
- **Real-time leaderboard**: Point-based ranking system for top contributors

### Web Dashboard
- **Waitlist capture**: Email collection with Resend API notifications
- **Network stats API**: Live signaler count, report volume, total payouts
- **Responsive design**: Mobile-first with animated UI and glassmorphism effects

---

## Quick Start

### Prerequisites
- Node.js 18+
- A Telegram Bot Token ([create one via @BotFather](https://t.me/BotFather))
- An Anthropic API key ([get one here](https://console.anthropic.com))

### Run the Bot Locally

```bash
cd telegram-bot
npm install

# Set environment variables
export TELEGRAM_BOT_TOKEN="your_bot_token"
export ANTHROPIC_API_KEY="your_anthropic_key"
export RPC_URL="https://api.devnet.solana.com"
export SECRET_KEY="your_encryption_key_64_hex_chars"

npm start
```

### Run the Dashboard Locally

```bash
npm install
npm run dev
# Open http://localhost:3000
```

---

## Environment Variables

| Variable | Required | Description |
|:---------|:--------:|:------------|
| `TELEGRAM_BOT_TOKEN` | ✅ | Telegram bot API token from @BotFather |
| `ANTHROPIC_API_KEY` | ✅ | Claude Vision AI for photo verification |
| `RPC_URL` | ❌ | Solana RPC endpoint (defaults to devnet) |
| `USDC_MINT` | ❌ | SPL token mint address (defaults to devnet USDC) |
| `SECRET_KEY` | ❌ | AES-256 encryption key for user wallet storage |
| `SOLANA_KEYPAIR_JSON` | ❌ | Protocol wallet private key (enables real payouts) |
| `GEMINI_API_KEY` | ❌ | Fallback Vision AI provider |
| `RESEND_API_KEY` | ❌ | Email notifications for waitlist signups |

---

## Project Structure

```
signal/
├── telegram-bot/           # Core Telegram Oracle Bot
│   ├── index.js            # Bot logic, AI verification, Solana payments
│   ├── db.js               # SQLite database with AES-256-GCM encryption
│   ├── images.js           # Image processing, hashing, dedup
│   └── package.json
├── app/                    # Next.js 14 Dashboard
│   ├── page.tsx            # Main landing page
│   └── globals.css         # Design system
├── apps/bot/               # Vercel-deployed waitlist frontend
│   └── app/
│       ├── waitlist/       # Countdown + email capture UI
│       └── api/waitlist/   # Serverless API with Resend integration
└── README.md
```

---

## Live Deployment

| Service | URL | Status |
|:--------|:----|:------:|
| **Telegram Bot** | [@OfficialSignalOracleBot](https://t.me/OfficialSignalOracleBot) | 🟢 Live |
| **Dashboard** | Vercel | 🟢 Live |
| **Bot Infrastructure** | Railway | 🟢 Live |

---

## Sovereign Verification & Resilience

Signal Protocol is designed for high-availability physical auditing. The verification pipeline follows a multi-tiered consensus model:

1. **Primary Audit**: High-precision Vision AI (Claude-3.5-Sonnet) extracts raw physical variables.
2. **Fallback Logic**: If the primary AI is unreachable or rate-limited, the system employs **Sovereign Demo Mode**. This is an on-chain simulation of oracle consensus that ensures sub-second finality and protocol continuity.
3. **Integrity Layer**: Regardless of the verification tier, the **Integrity Engine** (SHA-256 fingerprinting) remains active to prevent data farming and duplicate submissions.

---

## Security

- **Wallet encryption**: All stored private keys are encrypted with AES-256-GCM
- **Image deduplication**: SHA-256 hashing prevents duplicate report submissions
- **Agent policies**: Configurable daily report limits and per-session spend caps
- **Safe Mode**: Bot operates without real payouts when no production identity is configured
- **No secrets in repo**: All sensitive data is managed via environment variables

---

## License

MIT

---

Built on Solana · Verified by Claude · Powered by Jupiter · Secured by MagicBlock
