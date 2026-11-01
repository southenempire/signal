// Allow the bot's current prompt on-chain (sha256 of signal-bot/vision_prompt.js's VISION_PROMPT),
// or retire an old one once the bot no longer uses it. Owner only.
//
//   node scripts/register-prompt.mjs                 # allow the current prompt
//   node scripts/register-prompt.mjs --retire <hash> # stop accepting an old prompt
import { createHash } from 'node:crypto';
import { teraToGas } from 'near-api-js';
import { VISION_PROMPT } from '../../signal-bot/vision_prompt.js';
import { CONTRACT, OWNER, loadAccount, txLink, view } from './near.mjs';

const retire = process.argv.indexOf('--retire');
const promptSha256 = retire === -1 ? createHash('sha256').update(VISION_PROMPT).digest('hex') : process.argv[retire + 1];
const allowed = retire === -1;
if (!/^[0-9a-f]{64}$/.test(promptSha256 || '')) throw new Error('usage: register-prompt.mjs [--retire <64-hex hash>]');

const tx = await loadAccount(OWNER).callFunctionRaw({
  contractId: CONTRACT,
  methodName: 'set_prompt',
  args: { prompt_sha256: promptSha256, allowed },
  gas: teraToGas('30'),
});
console.log(`${allowed ? 'allowed' : 'retired'} prompt ${promptSha256}: ${txLink(tx.transaction.hash)}`);
console.log('prompts now accepted:', await view('get_prompts'));
