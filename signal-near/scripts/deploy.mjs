// Deploy (or upgrade) the contract to oracle.<owner>, initialise it, and allow the bot's prompt.
// Build first: cargo near build non-reproducible-wasm
//
//   node scripts/deploy.mjs            # create oracle.<owner> if needed, deploy, init
//   node scripts/deploy.mjs --upgrade  # redeploy code only
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { KeyPair, nearToYocto, teraToGas } from 'near-api-js';
import { VISION_PROMPT } from '../../signal-bot/vision_prompt.js';
import { CONTRACT, NETWORK, OWNER, loadAccount, provider, txLink, view } from './near.mjs';

const wasm = fs.readFileSync(new URL('../target/near/signal_near.wasm', import.meta.url));
const upgrade = process.argv.includes('--upgrade');
const owner = loadAccount(OWNER);
const credentials = path.join(os.homedir(), '.near-credentials', NETWORK, `${CONTRACT}.json`);

const exists = await provider.viewAccount({ accountId: CONTRACT }).then(() => true, () => false);
if (!exists) {
  if (!CONTRACT.endsWith(`.${OWNER}`)) throw new Error(`${CONTRACT} must be a sub-account of ${OWNER}`);
  const key = KeyPair.fromRandom('ed25519');
  fs.writeFileSync(credentials, JSON.stringify({ account_id: CONTRACT, public_key: key.getPublicKey().toString(), private_key: key.toString() }), { mode: 0o600 });
  await owner.createSubAccount({
    accountOrPrefix: CONTRACT.slice(0, -(OWNER.length + 1)),
    publicKey: key.getPublicKey(),
    nearToTransfer: nearToYocto('5'),
  });
  console.log(`created ${CONTRACT} (key saved to ${credentials})`);
}

const contract = loadAccount(CONTRACT);
const deployed = await contract.deployContract(new Uint8Array(wasm));
console.log(`deployed ${wasm.length} bytes: ${txLink(deployed.transaction.hash)}`);
if (upgrade) process.exit(0);

const init = await contract.callFunctionRaw({ contractId: CONTRACT, methodName: 'new', args: { owner: OWNER }, gas: teraToGas('30') });
console.log(`initialised, owner ${OWNER}: ${txLink(init.transaction.hash)}`);

const promptSha256 = createHash('sha256').update(VISION_PROMPT).digest('hex');
await owner.callFunctionRaw({ contractId: CONTRACT, methodName: 'set_prompt', args: { prompt_sha256: promptSha256, allowed: true }, gas: teraToGas('30') });
console.log(`allowed prompt ${promptSha256}`);
console.log('prompts:', await view('get_prompts'));
console.log('next: node scripts/register-signer.mjs');
