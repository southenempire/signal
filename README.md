# Signal: The Intelligence Layer for Agentic Commerce

**Building the "Eyes and Ears" of the Physical World on Solana.**

## 🌐 The Vision
AI agents are increasingly capable of *thinking* (LLMs) and *transacting* (Solana), but they are blind to the *physical world*. They cannot verify fuel prices in Lagos, grain levels in Ukraine, or local retail inventory in NYC. 

**Signal** is a Decentralized Physical Infrastructure Network (DePIN) that bridges this intelligence gap. We provide high-fidelity, verified, real-world data feeds that AI agents need to execute commerce in the physical world.

## 🏗️ Production-Grade Architecture
This repository is structured as a **Turborepo Monorepo** for senior-level engineering standards.

- **`apps/dashboard`**: The Signal Intelligence Portal. A premium marketplace for data buyers.
- **`apps/bot`**: Zero-friction onboarding via Telegram Mini Apps. 
- **`packages/anchor-program`**: The "Truth Ledger" smart contract. Hardened with PDA security and event-driven state.
- **`packages/signal-sdk`**: Professional-grade TypeScript SDK for institutional integration.

## 💸 The Signal Economy
- **Protocol Service Fee**: 10% on every data purchase.
- **Verification Staking**: Reporters stake 0.01 SOL per report to guarantee data integrity.
- **Slashing**: Fraudulent reports result in 100% loss of stake to the honest reward pool.

## 🚀 Scaling to "Beyond Human Composition"
Signal is designed to be the backbone of **Agentic Commerce**. As millions of AI agents begin managing physical logistics, they will query Signal via our SDK to make real-time decisions, creating an unstoppable feedback loop of real-world intelligence.

---

## 🛠️ Developer Setup (Senior Workflow)

### 1. Build the Monorepo
```bash
pnpm install
pnpm build
```

### 2. Deploy the Truth Ledger
```bash
cd packages/anchor-program
anchor build
anchor deploy
```

### 3. Launch the Intelligence Portal
```bash
cd apps/dashboard
pnpm dev
```

---

*Signal was built for the Solana Frontier Hackathon (2026).*
