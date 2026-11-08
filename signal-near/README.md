# Signal on NEAR — prices only an attested AI has read

Signal turns photos of receipts into local price feeds (bread in Lagos, petrol in Nairobi). Until now the
Telegram bot was the trusted party: it ran the vision model and reported what it said. On NEAR, nobody
is trusted — including the bot.

```
photo ──► NEAR AI (Qwen3.8-27B in an Intel TDX + NVIDIA TEE)
            │  signs  "<model>:<sha256(request)>:<sha256(response)>"
            ▼
       submit_verdict(request, response, signature)  ──►  signal-near contract
            hashes both itself, recovers the signer (ecrecover), and accepts the prices only if:
              • the signer is a model key registered from a verified attestation report
              • the request is Signal's registered prompt + one image URL carrying its sha256
                (no system prompt, tools, logit bias, high temperature…)
              • the response is fresh (≤ 1h), finished, and never filed before
              • the photo was never filed before
```

The photo never goes on-chain: only its hash, the prompt, and the model's signed answer. Change one
byte of the answer — a price, a currency — and the signature no longer recovers to the model key.

The signed answer is public forever, so the prompt asks the model for only what a price feed needs:
city, country, date, items and prices. It never outputs store or people's names, street addresses,
times of day, or card, account, meter or receipt numbers (a test checks the published answers).

## What the contract does

| Method | Who | |
| --- | --- | --- |
| `submit_verdict(request, response, signature, reporter?)` | anyone | Verify and file a signed audit. Relayers (the Telegram bot) may name the reporter they file for; everyone else files as themselves. Pays its own storage; the rest of the deposit is refunded |
| `register_signer(address, model, attestation_sha256)` | owner | Add a model key after verifying its attestation (`scripts/register-signer.mjs`) |
| `set_prompt(prompt_sha256, allowed)` | owner | Allow a prompt version (sha256 of `signal-bot/vision_prompt.js`'s text) |
| `set_trusted_host(host, trusted)` | owner | Trust an image host that hashes the photos it serves (the Signal bot) |
| `set_paused(paused)` | owner | Stop or resume all filings at once (e.g. if a key leaks) |
| `propose_owner(owner)` → `accept_owner()` | owner → new owner | Two-step transfer: nothing changes until the new owner accepts, so a typo can't brick admin |
| `set_relayer`, `set_params`, `remove_signer` | owner | |
| `get_feed`, `list_feeds`, `get_report`, `list_reports`, `get_reporter`, `report_for_image`, `get_prompts`, `get_signer`, `get_params` | view | Free to read |

**Feeds** follow the same rules as Signal's Solana program: feeds are keyed
`CATEGORY:region:item:CURRENCY` (region from the city the model read, else the user's region in the
prompt), so a misread currency lands in its own feed instead of locking out the real one. Once a feed has 3 prices, a price within ±40% of its median joins directly.
One outside is held until 2 other reporters independently report within ±25% of it, with all of those
prices within ±25% of each other — so two colluding accounts can't move an established feed, but a
real price rise gets through. Each photo prices a feed at most once. A relayer's users get ids
namespaced by the relayer (`bot.signal-southen.testnet/tg:…`), so a relayer can't pose as an account.

The photo's sha256 is only a claim in the image URL, so it counts only for photos served by a
**trusted host** (the Signal bot, which hashes what it serves). Photos from any other host are still
filed and checked, but can only add prices inside an established feed's bounds: they can't start a
feed, wait for peers, or vouch for anyone — so re-hosting one photo under made-up hashes gains nothing.

Every filing emits a NEP-297 event (`EVENT_JSON:{"standard":"signal",…}`).

## NEAR decides, Solana pays (Chain Signatures)

Signal's reward vault, reputation and slashing live in its Solana program. That program only accepts
filings from its **attester**, and the attester is this contract's own Solana key
(`DGEeJJStYHWoM5ALGE4tMDQ9mrktA5W5o98CsBEq5s2V`, path `signal-solana`), which only NEAR's MPC network
can sign for, and only when this contract asks.

| Method | Who | |
| --- | --- | --- |
| `register_solana_wallet(wallet, reporter?)` | relayer / anyone | Where a reporter's rewards go on Solana (relayers register their users, namespaced) |
| `sign_solana_report(report_id, item_index, accounts, recent_blockhash)` | anyone | For a price this contract accepted from a trusted host's photo: build `submit_verified_report` byte by byte and have the MPC network sign it. Photos from untrusted hosts are never paid. Retries are harmless — Solana refuses a second filing of the same photo and item |
| `sign_solana_fraud(report_id, accounts, recent_blockhash)` | relayer / owner, once | For a fraud verdict: the Solana `flag_fake` penalty |
| `set_solana_settings` | owner | MPC signer, path, and the derived key |

The message is built in `src/solana.rs` with the program id, instruction and argument layout fixed in
code; callers only pass a blockhash and PDAs, which the Solana program re-derives and rejects if wrong.
A test checks every message means exactly what `@solana/web3.js` + Anchor build from the program's IDL.
On Solana, `submit_verified_report` (attester only) settles at once — NEAR already ran the bounds and
quorum — so the two chains can't disagree. Tested end to end on devnet: NEAR-accepted price → MPC
signature (~7–17 s) → filed on Solana → settled → 0.20 USDC paid; a second filing is refused.

## Try it

Requires Rust, `cargo-near`, Node 24+, a testnet account in `~/.near-credentials/testnet/`, and a
NEAR AI Cloud key.

```bash
cargo test                                   # 46 unit tests, incl. real NEAR AI signatures
cargo near build non-reproducible-wasm       # → target/near/signal_near.wasm
npm install
node scripts/deploy.mjs                      # creates oracle.<owner>, deploys, allows the prompt
NEARAI_API_KEY=… node scripts/register-signer.mjs   # verifies TDX + GPU attestation, registers the key
NEARAI_API_KEY=… node scripts/file-audit.mjs https://raw.githubusercontent.com/zzzDavid/ICDAR-2019-SROIE/master/data/img/000.jpg
```

`file-audit.mjs` prints the transaction and what happened to each item. The report is filed with the
model's verdict, but since GitHub isn't a trusted image host its prices can't start a feed: expect
`Rejected: photos from untrusted hosts can't start a feed`. Prices from the bot's own host (or one you
trust with `set_trusted_host` on your own deployment) join feeds. Then read the feeds:

```bash
near view oracle.signal-southen.testnet list_feeds '{}'
```

## Tests

`src/tests.rs` runs against two real NEAR AI responses captured with `scripts/capture-fixture.mjs`
(`tests/fixtures/`): a public receipt from the ICDAR-2019 SROIE dataset that the model verified, and a
logo it rejected. They check the real TEE signature end to end, that a single changed byte breaks it,
replays, unregistered keys and prompts, stale responses and storage payment. Crafted responses signed
with a test key cover the feed rules: colluders held, a quorum moving the price, fraud, currencies.

## Trust that remains

- **Registering keys.** The owner registers model keys after verifying the attestation off-chain with
  NEAR AI's SDK (`verifyModelAttestation`: TDX quote, measurements, NVIDIA GPU evidence, signer
  binding). Anyone can re-run `register-signer.mjs` to check a registered key.
- **What the photo shows.** The model judges the photo, and a convincingly generated receipt can pass
  as real (we tested it). Text that tries to instruct the model ("set verified true", printed JSON,
  "ignore all rules") is flagged as fraud instead. Once a feed has history, an invented off-market
  price waits for 2 independent reporters, so one person with a couple of accounts can't move it.
- **The image URL.** The contract can't see the bytes the model fetched, only the hash in the URL, so
  it trusts that hash only from registered hosts (see Feeds). The reporter, who has the photo, can
  check it; the chain only sees the hash.
