// Create a relayer account for the Telegram bot (<name>.<owner>) and allow it to file for its users.
// The key is saved to ~/.near-credentials/<network>/; put it in the bot's NEAR_PRIVATE_KEY.
//
//   node scripts/add-relayer.mjs [name] [near-to-fund]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { KeyPair, nearToYocto, teraToGas } from 'near-api-js';
import { CONTRACT, NETWORK, OWNER, loadAccount, provider, txLink } from './near.mjs';

const [name = 'bot', fund = '2'] = process.argv.slice(2);
const relayer = `${name}.${OWNER}`;
const owner = loadAccount(OWNER);
const credentials = path.join(os.homedir(), '.near-credentials', NETWORK, `${relayer}.json`);

const exists = await provider.viewAccount({ accountId: relayer }).then(() => true, () => false);
if (!exists) {
  const key = KeyPair.fromRandom('ed25519');
  fs.writeFileSync(credentials, JSON.stringify({ account_id: relayer, public_key: key.getPublicKey().toString(), private_key: key.toString() }), { mode: 0o600 });
  await owner.createSubAccount({ accountOrPrefix: name, publicKey: key.getPublicKey(), nearToTransfer: nearToYocto(fund) });
  console.log(`created ${relayer} with ${fund} NEAR (key saved to ${credentials})`);
}

const tx = await owner.callFunctionRaw({ contractId: CONTRACT, methodName: 'set_relayer', args: { account: relayer, allowed: true }, gas: teraToGas('30') });
console.log(`${relayer} is a relayer: ${txLink(tx.transaction.hash)}`);
