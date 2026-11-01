// Read-only calls to the Signal contract on NEAR (signal-near), straight over JSON-RPC.

export const NEAR_NETWORK = process.env.NEAR_NETWORK || 'testnet';
export const NEAR_CONTRACT = process.env.SIGNAL_NEAR_CONTRACT || 'oracle.signal-southen.testnet';
const RPC_URL = process.env.NEAR_RPC_URL
  || (NEAR_NETWORK === 'mainnet' ? 'https://free.rpc.fastnear.com' : 'https://test.rpc.fastnear.com');

export const explorer = (path: string) =>
  `https://${NEAR_NETWORK === 'mainnet' ? '' : 'testnet.'}nearblocks.io/${path}`;

export async function nearView<T>(method: string, args: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'signal',
      method: 'query',
      params: {
        request_type: 'call_function',
        finality: 'final',
        account_id: NEAR_CONTRACT,
        method_name: method,
        args_base64: Buffer.from(JSON.stringify(args)).toString('base64'),
      },
    }),
  });
  const body = await res.json();
  if (body.error || body.result?.error) {
    throw new Error(`NEAR view ${method} failed: ${JSON.stringify(body.error || body.result.error).slice(0, 200)}`);
  }
  return JSON.parse(Buffer.from(body.result.result).toString());
}
