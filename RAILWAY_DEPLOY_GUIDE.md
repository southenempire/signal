# Deployment

Signal runs as two deployments from this repository:

| Part | Folder | Host |
| --- | --- | --- |
| Telegram bot + public API | `signal-bot/` | Railway |
| Website | `apps/bot/` | Vercel |

The Solana program (`signal-program/`) is deployed separately with Anchor; see its README.

## Bot on Railway

1. Create a Railway service from this GitHub repository with **root directory `signal-bot`**. `signal-bot/railway.toml` sets Node 20 and `node index.js`.
2. Add a **volume mounted at `/app/data`**. The bot's SQLite database (users' encrypted custodial wallets, reports) lives there.
3. Set the variables below.
4. Give the service a public domain targeting **port 8080** (the port Railway assigns the app). The website reads `https://<domain>/api/stats` and `/api/feeds`.

| Variable | What it is |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | From @BotFather |
| `GROQ_API_KEY` | Vision model access (Groq) |
| `SECRET_KEY` | Encrypts users' custodial wallets. Rotating it requires `scripts/rotate-secret-key.js` |
| `SOLANA_KEYPAIR_JSON` | The bot's attester keypair (signs and pays for report submissions) |
| `RPC_URL` | Solana RPC, e.g. `https://api.devnet.solana.com` |
| `USDC_MINT` | Reward token mint |
| `SIGNAL_PROGRAM` | `on` to use the Solana program for consensus |
| `MAX_ONCHAIN_ITEMS` | Items per receipt filed on-chain (default 5) |
| `REPORTER_SALT` | Hashes Telegram IDs into anonymous on-chain reporter IDs |
| `BOTCHAIN_PRIVATE_KEY` | Owner key of the BOTChain mirror contract |
| `BOTCHAIN_ORACLE_ADDRESS` | BOTChain mirror contract address |
| `DEMO_MODE` | `false` in production |

Optional: `GROQ_VISION_MODEL` (override the vision model), `SIGNAL_ATTESTER_KEYPAIR_JSON` (separate attester key), and the `PAYOUT_RAIL` / `MAGICBLOCK_*` / `JUPITER_*` settings described in `signal-bot/README.md`.

`signal-bot/scripts/push-railway-env.sh` copies values from `signal-bot/.env` into Railway without printing them.

The program's admin key never goes to Railway: only the attester key does.

## Website on Vercel

1. Import the repository with **root directory `apps/bot`** (Next.js).
2. Optional: set `SIGNAL_API_URL` to the bot's Railway domain. The site falls back to the production bot if it isn't set.
