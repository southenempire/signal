# Signal Bot: The Intelligence Layer for Agentic Commerce

**The Human-Powered Oracle Network on Solana.**

## 🌐 The Vision
AI agents are increasingly capable of *thinking* (LLMs) and *transacting* (Solana), but they are blind to the *physical world*. They cannot verify fuel prices in Lagos, grain levels in Ukraine, or local retail inventory in NYC. 

**Signal Bot** is a Decentralized Physical Infrastructure Network (DePIN) that bridges this intelligence gap. We provide high-fidelity, verified, real-world data feeds that AI agents need to execute commerce in the physical world.

## 🏗️ Architecture (Turborepo Monorepo)

| Component | Path | Description |
|---|---|---|
| **Dashboard** | `apps/dashboard` | Premium Intelligence Portal — marketplace for data buyers |
| **Telegram Bot** | `apps/bot` | Zero-friction onboarding — report prices, earn USDC |
| **Anchor Program** | `packages/anchor-program` | Truth Ledger smart contract (PDA security, events) |
| **Signal SDK** | `packages/signal-sdk` | TypeScript SDK for institutional integration |

## 🔧 Tech Stack
- **Blockchain**: Solana (USDC payouts, on-chain consensus)
- **Bot**: Telegraf + Express API
- **Dashboard**: Next.js 15, Tailwind CSS, Space Grotesk
- **Database**: SQLite (better-sqlite3) with AES-256-GCM encrypted wallets
- **Verification**: Vision AI (GPT-4o) for price extraction
- **Infrastructure**: Railway (bot 24/7) + Vercel (dashboard)

## 💸 The Signal Economy
- **Protocol Service Fee**: 10% on every data purchase.
- **Verification Staking**: Reporters stake 0.01 SOL per report to guarantee data integrity.
- **Slashing**: Fraudulent reports result in 100% loss of stake to the honest reward pool.

## 🚀 How It Works
1. **Open the Bot** → Message [@OfficialSignalOracleBot](https://t.me/OfficialSignalOracleBot) on Telegram
2. **Report Real Data** → Snap a photo of a fuel price, receipt, or electricity bill
3. **Earn USDC** → Vision AI verifies, USDC lands in your wallet instantly

## 🛠️ Developer Setup

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Run the Dashboard
```bash
cd apps/dashboard
pnpm dev
```

### 3. Run the Bot
```bash
cd apps/bot
cp .env.example .env   # Fill in your tokens
npm start
```

### 4. Deploy the Anchor Program
```bash
cd packages/anchor-program
anchor build
anchor deploy
```

## 🔗 Links
- **Telegram Bot**: [@OfficialSignalOracleBot](https://t.me/OfficialSignalOracleBot)
- **GitHub**: [github.com/southenempire/signal](https://github.com/southenempire/signal)

---

*Signal Bot was built for the Colosseum Frontier Hackathon (2026).*
