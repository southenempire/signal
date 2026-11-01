// Verify NEAR AI's model attestation (Intel TDX quote, NVIDIA GPU evidence, signer binding) and
// register the attested signing key in the contract. Only the owner can register keys.
//
//   NEARAI_API_KEY=... node scripts/register-signer.mjs [model]
import { createHash } from 'node:crypto';
import { AttestationClient, verifyModelAttestation } from '@nearai/inference-sdk/node';
import { teraToGas } from 'near-api-js';
import { CONTRACT, OWNER, loadAccount, txLink, view } from './near.mjs';

const model = process.argv[2] || 'Qwen/Qwen3.8-27B';
const client = new AttestationClient({ apiKey: process.env.NEARAI_API_KEY });
const fetched = await client.fetchModelAttestations({ model, signingAlgo: 'ecdsa' });
if (!fetched.attestations.length) throw new Error(`NEAR AI returned no attestation for ${model}`);

const owner = loadAccount(OWNER);
for (const attestation of fetched.attestations) {
  // Throws unless the TDX quote, its nonce binding, the measurements and the GPU evidence all verify.
  const verified = await verifyModelAttestation({ attestation, clientBinding: fetched.clientBinding });
  if (verified.tcbStatus !== 'UpToDate') throw new Error(`TCB status ${verified.tcbStatus}: not registering`);
  const address = verified.signer.signingAddress.toLowerCase();
  const attestationSha256 = createHash('sha256').update(JSON.stringify(attestation)).digest('hex');
  console.log(`verified ${model} signer ${address} (TCB ${verified.tcbStatus}, attestation ${attestationSha256.slice(0, 16)}…)`);

  if (await view('get_signer', { address })) {
    console.log('  already registered');
    continue;
  }
  const tx = await owner.callFunctionRaw({
    contractId: CONTRACT,
    methodName: 'register_signer',
    args: { address, model, attestation_sha256: attestationSha256 },
    gas: teraToGas('30'),
  });
  console.log(`  registered: ${txLink(tx.transaction.hash)}`);
}
