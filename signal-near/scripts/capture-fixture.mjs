// Capture a real NEAR AI receipt audit (request bytes, response bytes, TEE signature) as a test fixture.
//
//   NEARAI_API_KEY=... node scripts/capture-fixture.mjs <image-url> <category> <fixture-name> [region]
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { nearAiAudit, NEARAI_MODEL } from '../../signal-bot/nearai.js';

const [imageUrl, category = 'GROCERY', name, region] = process.argv.slice(2);
if (!imageUrl || !name) throw new Error('usage: node capture-fixture.mjs <image-url> <category> <name> [region]');

const image = Buffer.from(await (await fetch(imageUrl)).arrayBuffer());
const imageSha256 = createHash('sha256').update(image).digest('hex');
const audit = await nearAiAudit({ imageUrl, imageSha256, category, region });

const out = new URL(`../tests/fixtures/${name}.json`, import.meta.url);
fs.writeFileSync(out, JSON.stringify({
  model: NEARAI_MODEL,
  image_sha256: imageSha256,
  request: audit.request,
  response: audit.response,
  signature: audit.signature,
}, null, 2) + '\n');
console.log(`saved ${out.pathname}`, audit.verdict);
