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
| `set_relayer`, `set_params`, `remove_signer`, `set_owner` | owner | |
| `get_feed`, `list_feeds`, `get_report`, `list_reports`, `get_reporter`, `report_for_image`, `get_prompts`, `get_signer`, `get_params` | view | Free to read |

**Feeds** follow the same rules as Signal's Solana program: feeds are keyed `CATEGORY:region:item`
(region from the store location the model read, else the user's region in the prompt) and priced in
the receipt's currency. Once a feed has 3 prices, a price within ±40% of its median joins directly.
One outside is held until 2 other reporters independently report within ±25% of it — so two
colluding accounts can't move an established feed, but a real price rise gets through.

Every filing emits a NEP-297 event (`EVENT_JSON:{"standard":"signal",…}`).

## Try it

Requires Rust, `cargo-near`, Node 24+, a testnet account in `~/.near-credentials/testnet/`, and a
NEAR AI Cloud key.

```bash
cargo test                                   # 23 unit tests, incl. real NEAR AI signatures
cargo near build non-reproducible-wasm       # → target/near/signal_near.wasm
npm install
node scripts/deploy.mjs                      # creates oracle.<owner>, deploys, allows the prompt
NEARAI_API_KEY=… node scripts/register-signer.mjs   # verifies TDX + GPU attestation, registers the key
NEARAI_API_KEY=… node scripts/file-audit.mjs https://raw.githubusercontent.com/zzzDavid/ICDAR-2019-SROIE/master/data/img/001.jpg
```

`file-audit.mjs` prints the transaction and what happened to each item. Then read the feed:

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
- **The image URL.** The contract checks the hash in the URL, not the bytes the model fetched. The
  reporter (who has the photo) can check it; the chain only sees the hash.
