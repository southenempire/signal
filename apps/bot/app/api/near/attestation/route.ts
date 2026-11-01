import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { AttestationClient, verifyModelAttestation } from '@nearai/inference-sdk/node';
import { NEAR_CONTRACT, nearView } from '@/lib/near';

// Live check of NEAR AI's model attestation, run on every request with a fresh random nonce:
// the Intel TDX quote, the NVIDIA GPU evidence, the signing key bound to them, and whether that
// key is the one registered in the Signal contract on NEAR. Nothing is cached or stored.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODEL = process.env.NEARAI_VISION_MODEL || 'Qwen/Qwen3.8-27B';

type Check = { label: string; ok: boolean; detail: string };

export async function GET() {
  if (!process.env.NEARAI_API_KEY) {
    return NextResponse.json({ ok: false, error: 'NEARAI_API_KEY is not configured on this deployment' }, { status: 503 });
  }
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
    return NextResponse.json({ ok, model: MODEL, contract: NEAR_CONTRACT, checkedAt, attestations: results });
  } catch (e) {
    return NextResponse.json({ ok: false, model: MODEL, checkedAt, error: (e as Error).message.slice(0, 300) }, { status: 502 });
  }
}
