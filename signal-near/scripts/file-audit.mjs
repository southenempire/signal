// Audit a receipt photo with NEAR AI's TEE model and file the signed verdict on-chain, as yourself.
//
//   NEARAI_API_KEY=... node scripts/file-audit.mjs <image-url> [category] [region] [account]
import { createHash } from 'node:crypto';
import { nearToYocto, teraToGas } from 'near-api-js';
import { nearAiAudit } from '../../signal-bot/nearai.js';
import { CONTRACT, OWNER, loadAccount, txLink, view } from './near.mjs';

const [imageUrl, category = 'GROCERY', region, accountId = OWNER] = process.argv.slice(2);
if (!imageUrl) throw new Error('usage: node file-audit.mjs <image-url> [category] [region] [account]');

const image = Buffer.from(await (await fetch(imageUrl)).arrayBuffer());
const imageSha256 = createHash('sha256').update(image).digest('hex');
const existing = await view('report_for_image', { image_sha256: imageSha256 });
if (existing !== null) throw new Error(`photo already filed as report ${existing}`);

console.log(`auditing ${imageUrl} with NEAR AI…`);
const audit = await nearAiAudit({ imageUrl, imageSha256, category, region });
console.log(`completion ${audit.completionId}, signed by ${audit.signature.signing_address}`);
console.log('verdict:', JSON.stringify(audit.verdict));

const account = loadAccount(accountId);
const tx = await account.callFunctionRaw({
  contractId: CONTRACT,
  methodName: 'submit_verdict',
  args: { request: audit.request, response: audit.response, signature: audit.signature.signature },
  gas: teraToGas('100'),
  deposit: nearToYocto('0.05'), // storage; the unused part is refunded
});
const status = tx.status;
if (status?.Failure) throw new Error(`contract refused: ${JSON.stringify(status.Failure)}`);
const report = JSON.parse(Buffer.from(status.SuccessValue, 'base64').toString());
console.log(`filed report ${report.id} (${report.status}): ${txLink(tx.transaction.hash)}`);
for (const item of report.items) console.log(`  ${item.feed}  ${item.price / 100} ${report.currency}  →`, item.outcome);
