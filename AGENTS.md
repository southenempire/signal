# Zerion Sovereign Agent: Signal Protocol Fork 🤖

This project implements an autonomous on-chain agent built on a fork of the **Zerion CLI** infrastructure. The agent acts as the automated "Physical-to-Digital" bridge for the Signal DePIN network.

## Zerion Track Fulfillment
- **Fork Source**: This agent logic is built directly on top of the Zerion CLI execution engine.
- **Real Transactions**: Every node report results in a real on-chain payout and an autonomous rebalancing swap via the Zerion-integrated Jupiter router.
- **Scoped Policies**: To ensure agent safety and institutional reliability, we have implemented strict autonomous policies:
    - **SPEND_LIMIT_USDC**: $50.00 maximum per transaction to prevent wallet drain.
    - **CHAIN_LOCK**: Restricted to `solana-devnet` (or mainnet-beta) for execution integrity.
    - **REAL-WORLD VERIFICATION**: Autonomous rebalancing only occurs after successful Claude-3.5-Sonnet vision auditing of physical truth.

## Agent Architecture
1. **Wallet Layer**: Powered by Zerion's wallet management patterns.
2. **Strategy Layer**: The agent monitors physical price physical data via the Signal Oracle.
3. **Execution Layer**:
    - **Settlement**: MagicBlock Private Payments for anonymous rewards.
    - **Rebalancing**: Jupiter V6 for swapping rewards into yield-bearing `jupUSD`.

## Policy Demo
The agent's policy engine is hard-coded in `apps/bot/index.js` under `AGENT_POLICIES`. Any transaction exceeding these limits is automatically suppressed by the internal Zerion-style execution guard.

---
*Built for the Colosseum Frontier Hackathon 2026*
