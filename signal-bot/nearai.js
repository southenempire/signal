/**
 * NEAR AI Cloud — verifiable receipt audits.
 *
 * The vision model runs in a TEE and signs `<model>:<sha256(request)>:<sha256(response)>`. We keep
 * the exact request and response bytes so the NEAR contract (signal-near) can hash them itself and
 * check that signature on-chain. The photo is passed by URL with its sha256, so it never goes
 * on-chain: only the request (prompt + URL) and the model's answer do.
 */
import { createHash } from 'node:crypto';
import { promptFor } from './vision_prompt.js';

export const NEARAI_API = process.env.NEARAI_API_URL || 'https://cloud-api.near.ai/v1';
export const NEARAI_MODEL = process.env.NEARAI_VISION_MODEL || 'Qwen/Qwen3.8-27B';

const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// A stuck request fails the audit (the user is asked to retry) instead of hanging the bot.
const COMPLETION_TIMEOUT_MS = 90_000;

/** The exact request body the contract accepts: one user message, the prompt and one image URL. */
export function buildAuditRequest({ imageUrl, imageSha256, category, region, model = NEARAI_MODEL }) {
  const url = `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}sha256=${imageSha256}`;
  return JSON.stringify({
    model,
    temperature: 0.1,
    max_tokens: 3072,
    // Thinking makes the 27B model 5× slower and sometimes runs out of tokens before answering.
    chat_template_kwargs: { enable_thinking: false },
    messages: [{ role: 'user', content: [
      { type: 'text', text: promptFor(category, region) },
      { type: 'image_url', image_url: { url } },
    ] }],
  });
}

/** Strip a fenced or reasoned answer down to its JSON verdict. */
export function parseVerdict(content) {
  const cleaned = (content || '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON verdict in response');
  return JSON.parse(cleaned.slice(start, end + 1));
}

/**
 * Audit a photo with NEAR AI and fetch the TEE signature over the exact bytes exchanged.
 * @returns {Promise<{request:string, response:string, completionId:string, verdict:object, signature:{text:string, signature:string, signing_address:string}}>}
 */
export async function nearAiAudit({ imageUrl, imageSha256, category, region, apiKey = process.env.NEARAI_API_KEY }) {
  if (!apiKey) throw new Error('NEARAI_API_KEY is not set');
  const request = buildAuditRequest({ imageUrl, imageSha256, category, region });
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    // Sign with the canonical model id, and keep the response bytes exactly as signed.
    'x-no-aliasing': 'true',
    'Accept-Encoding': 'identity',
  };

  let response;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${NEARAI_API}/chat/completions`, { method: 'POST', headers, body: request, signal: AbortSignal.timeout(COMPLETION_TIMEOUT_MS) });
    response = await res.text();
    if (res.ok) break;
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      await sleep(3000 * attempt);
      continue;
    }
    throw new Error(`NEAR AI ${res.status}: ${response.slice(0, 200)}`);
  }

  const parsed = JSON.parse(response);
  const content = parsed.choices?.[0]?.message?.content;
  const verdict = parseVerdict(content);

  // The signature is stored a moment after the completion returns.
  const expected = `${NEARAI_MODEL}:${sha256(request)}:${sha256(response)}`;
  let signature = null;
  for (let attempt = 0; attempt < 10 && !signature; attempt++) {
    if (attempt) await sleep(1500);
    const res = await fetch(`${NEARAI_API}/signature/${parsed.id}?model=${encodeURIComponent(NEARAI_MODEL)}&signing_algo=ecdsa`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
    }).catch(() => ({ ok: false }));
    if (!res.ok) continue;
    const s = await res.json();
    if (s.signature && s.text === expected) signature = s;
  }
  if (!signature) throw new Error(`No TEE signature for completion ${parsed.id}`);

  return { request, response, completionId: parsed.id, verdict, signature };
}
