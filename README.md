# Signal Protocol: Proof-of-Physical Work Oracle

**The human-verifiable physical infrastructure network on Solana.**

Signal Protocol establishes a decentralized oracle network capable of synchronizing off-chain physical data (commodities, retail pricing, energy rates) with on-chain smart contracts. By crowd-sourcing data via a globally distributed human node network and securing consensus through deterministic crypto-economic staking, Signal bridges the execution gap between AI agents and physical world commerce.

---

## 🏗 System Architecture

Signal operates as a high-throughput **Turborepo** monorepo, decoupling the edge-data extraction from the on-chain consensus mechanisms.

- **`apps/bot` (Edge Extraction Client)**  
  A Telegram-native application abstracting wallet creation and key management. The client captures physical-world telemetrics via imagery, calculates local cryptographic hashes to prevent replay attacks, and streams data to the ingestion layer.
- **`apps/dashboard` (Data Marketplace)**  
  The Signal Network Explorer. Institutional data buyers and AI agents can query the explorer for real-time telemetry, geographic price distributions, and network volume metrics.
- **`packages/signal-sdk` (Consumer Client)**  
  A native TypeScript SDK for institutional partners. Interfaces directly with the Signal API aggregation layer, enabling localized fetching of securely verified real-world states.
- **`packages/anchor-program` (Consensus Ledger)**  
  The Truth Ledger maintained natively on Solana. Enforces stake-slashing variables and standardizes the Proof-of-Physical Work incentive model via autonomous PDA (Program Derived Address) vaults.

## ⚙️ Core Mechanisms

### 1. Proof-of-Physical Work (PoPW)
Unlike standard hardware-constrained DePINs, Signal leverages commodity hardware (smartphones). Reporters (nodes) submit photographic evidence of pricing data (e.g., fuel pump displays, localized retail inventory).

### 2. Vision AI Consensus
Signal utilizes multimodal LLMs (Vision) as the primary verification layer. Image data is evaluated against localized baselines. Accepted deviations update the oracle pricing state; out-of-bounds variations require secondary manual consensus or are immediately rejected.

### 3. Slashing and Staking
Data integrity is maintained through economic bounds. Node operators must stake an initial requirement of SOL.  
- **Valid Reports**: Node earns $USDC yield from the protocol treasury.  
- **Malformed/Duplicate Data**: Node hardware hashes are localized, and collateral is mathematically slashed to deter Sybil-based extraction.

## 💻 Integration (Signal SDK)

Signal Protocol exposes physical data seamlessly for automated on-chain execution, designed specifically for AI Agents requiring physical-world context.

```bash
npm install @signal-network/sdk @solana/web3.js
```

```typescript
import { SignalClient } from '@signal-network/sdk';

// Initialize connection to the Signal Aggregation Layer
const client = new SignalClient({ 
  apiUrl: "https://api.signal-network.io/v1" 
});

// Fetch strictly verified edge telemetry 
const data = await client.getLatestPrice({
  category: 'FUEL',
  minConfidence: 0.95
});

console.log(`Verified Sub-Second Price: $${data.price}`);
```

## 🛠 Operator Setup

To spin up a local network instance and aggregation node:

```bash
# 1. Boot the dependencies
pnpm install

# 2. Launch the Web3 Explorer / Dashboard
cd apps/dashboard
pnpm dev

# 3. Boot the API & Oracle Edge Node (Telegram)
cd apps/bot
npm install
npm start
```

## 🔐 Security & Non-Custodial Infrastructure

Signal uses `AES-256-GCM` encryption to securely manage zero-friction ephemeral wallets on the edge layer. Node operators maintain exact sovereignty over their earned yields and stake collateral, interacting entirely over Solana mainnet validation.

---

*Signal Protocol was fundamentally designed and architected as a submission for the Solana Colosseum Hackathon.*
