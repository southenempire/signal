# Signal Bot

The Telegram bot behind [@OfficialSignalOracleBot](https://t.me/OfficialSignalOracleBot). For the project
overview, the architecture, and the NEAR Hackathon entry, see the [root README](../README.md).

## What it does

1. Takes a receipt or price-tag photo from a user. The photo is held in memory only and served to NEAR AI
   through a share link that expires after 10 minutes.
2. Sends it to Qwen3.8 27B on NEAR AI Cloud, which audits it inside a TEE and signs the request and response
   ([`nearai.js`](nearai.js)).
3. Files the signed verdict on the NEAR contract `oracle.signal-southen.testnet`, as a relayer for an
   anonymous reporter id ([`near_oracle.js`](near_oracle.js)).
4. For each price NEAR accepts, relays the Solana filing that the NEAR contract built and NEAR's MPC network
   signed. The Solana program pays the reward in USDC from its vault ([`solana_oracle.js`](solana_oracle.js)).
5. Mirrors settled results to the SignalOracle contract on BOTChain ([`botchain.js`](botchain.js)).

If NEAR AI is unreachable the bot refuses the photo instead of falling back to another model.

Each user gets a custodial Solana wallet on `/start`. The key can be exported at any time; the export
message deletes itself after 60 seconds.

## Run

```bash
npm install
npm start
```

Node.js 22 or newer. Configure `.env`:

```env
TELEGRAM_BOT_TOKEN=
RPC_URL=https://api.devnet.solana.com
USDC_MINT=
SOLANA_KEYPAIR_JSON=[...]          # protocol wallet (fee payer)

# NEAR AI vision and the NEAR contract
NEARAI_API_KEY=
PUBLIC_URL=https://your-bot-host   # NEAR AI fetches photos from here (Railway sets RAILWAY_PUBLIC_DOMAIN)
NEAR_NETWORK=testnet
NEAR_ACCOUNT_ID=bot.signal-southen.testnet
NEAR_PRIVATE_KEY=ed25519:...
SIGNAL_NEAR_CONTRACT=oracle.signal-southen.testnet
NEAR_ATTESTS_SOLANA=on             # NEAR files on Solana via Chain Signatures

# BOTChain mirror (optional)
BOTCHAIN_RPC=https://rpc.botchain.ai
BOTCHAIN_PRIVATE_KEY=              # SignalOracle owner
BOTCHAIN_ORACLE_ADDRESS=0x...
REPORTER_SALT=                     # hashes Telegram IDs into on-chain reporter ids
```

Optional and off on the live bot: `SOLANA_CLUSTER=mainnet` enables the Jupiter jupUSD auto-stake, and
`PAYOUT_RAIL=magicblock` switches the off-chain fallback payouts to MagicBlock.

## Files

```
index.js            Telegram handlers and the report pipeline
nearai.js           NEAR AI Cloud client, keeps the exact signed bytes
near_oracle.js      NEAR contract client (relayer, Chain Signatures requests)
solana_oracle.js    Solana program client
settlement.js       Settles reports and mirrors them to BOTChain
vision_prompt.js    The registered vision prompt
images.js           In-memory photos and expiring share links
db.js               SQLite (users, reputation, pending reports)
contracts/          SignalOracle.sol on BOTChain
```

## License

MIT
