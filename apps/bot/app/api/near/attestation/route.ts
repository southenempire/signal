import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { AttestationClient, verifyModelAttestation } from '@nearai/inference-sdk/node';
import { NEAR_CONTRACT, nearView } from '@/lib/near';

// Live check of NEAR AI's model attestation with a fresh random nonce: the Intel TDX quote, the
// NVIDIA GPU evidence, the signing key bound to them, and whether that key is the one registered
// in the Signal contract on NEAR. A check costs NEAR AI and NVIDIA calls (~15 s), so one runs at a
// time and its result is shared for a minute; the response says when it ran and with which nonce.
// No user data is involved, and nothing is stored beyond that in-memory minute.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODEL = process.env.NEARAI_VISION_MODEL || 'Qwen/Qwen3.8-27B';

const SHARE_MS = 60_000;

type Check = { label: string; ok: boolean; detail: string };
type Result = { status: number; body: Record<string, unknown> };

let last: { at: number; result: Result } | null = null;
let running: Promise<Result> | null = null;

export async function GET() {
  if (!process.env.NEARAI_API_KEY) {
    return NextResponse.json({ ok: false, error: 'NEARAI_API_KEY is not configured on this deployment' }, { status: 503 });
  }
  if (!last || Date.now() - last.at > SHARE_MS) {
    running ??= runCheck().finally(() => { running = null; });
    last = { at: Date.now(), result: await running };
  }
  return NextResponse.json(last.result.body, { status: last.result.status });
}

async function runCheck(): Promise<Result> {
  const checkedAt = new Date().toISOString();
  try {
    const client = new AttestationClient({ apiKey: process.env.NEARAI_API_KEY });
    const fetched = await client.fetchModelAttestations({ model: MODEL, signingAlgo: 'ecdsa' });
    if (!fetched.attestations.length) throw new Error(`NEAR AI returned no attestation for ${MODEL}`);

    const results = [];
    for (const attestation of fetched.attestations) {
      const checks: Check[] = [
        {
          label: 'Fresh nonce',
          ok: true,
          detail: `${fetched.clientBinding.nonce} — generated for this check and echoed back by NEAR AI`,
        },
      ];
      let address: string | null = null;
      try {
        // Throws unless the TDX quote, its nonce binding, the measurements and the GPU evidence verify.
        const v = await verifyModelAttestation({ attestation, clientBinding: fetched.clientBinding });
        address = v.signer.signingAddress.toLowerCase();
        checks.push(
          {
            label: 'Intel TDX quote',
            ok: v.tcbStatus === 'UpToDate',
            detail: `signature and measurements verified; TCB ${v.tcbStatus}${v.advisoryIds.length ? `, advisories ${v.advisoryIds.join(', ')}` : ', no advisories'}`,
          },
          { label: 'NVIDIA GPU evidence', ok: v.gpuEvidence === 'verified', detail: `NRAS verdict: ${v.gpuEvidence}` },
          { label: 'Signing key bound to the quote', ok: true, detail: address },
        );
      } catch (e) {
        checks.push({ label: 'Attestation verification', ok: false, detail: (e as Error).message.slice(0, 300) });
      }

      if (address) {
        const signer = await nearView<{ model: string; attestation_sha256: string } | null>('get_signer', { address })
          .catch(() => null);
        checks.push({
          label: `Registered in ${NEAR_CONTRACT}`,
          ok: signer?.model === MODEL,
          detail: signer ? `registered for ${signer.model}` : 'this key is not registered: the contract would refuse its verdicts',
        });
      }
      results.push({
        address,
        evidenceSha256: createHash('sha256').update(JSON.stringify(attestation)).digest('hex'),
        checks,
      });
    }

    const ok = results.every((r) => r.checks.every((c) => c.ok));
    return { status: 200, body: { ok, model: MODEL, contract: NEAR_CONTRACT, checkedAt, attestations: results } };
  } catch (e) {
    return { status: 502, body: { ok: false, model: MODEL, checkedAt, error: (e as Error).message.slice(0, 300) } };
  }
}
