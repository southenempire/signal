// Read-only view of the Signal program on Solana devnet: where NEAR-verified prices are paid.
import { createHash } from 'node:crypto';
import { Connection, PublicKey } from '@solana/web3.js';

export const SOLANA_PROGRAM = new PublicKey(process.env.SIGNAL_SOLANA_PROGRAM || 'HmCLsXYjktA3EaSmipee7qzDNTefJASUWaXeiafwmquS');
const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');

export const solscan = (path: string) => `https://solscan.io/${path}?cluster=devnet`;

const pda = (...seeds: Buffer[]) => PublicKey.findProgramAddressSync(seeds, SOLANA_PROGRAM)[0];
const configPda = () => pda(Buffer.from('config'));

/** The Solana report account a NEAR-verified price is filed under. */
export function reportAddress(feedKey: string, imageSha256: string): PublicKey {
  const feed = pda(Buffer.from('feed'), createHash('sha256').update(feedKey).digest());
  return pda(Buffer.from('report'), feed.toBuffer(), Buffer.from(imageSha256, 'hex'));
}

// Report layout after the 8-byte discriminator: reporter 32, feed 32, image_hash 32, price 8,
// reward 8, submitted_at 8, bounds 1, confirmations 1, contradictions 1, status 1.
const REWARD_OFFSET = 8 + 32 + 32 + 32 + 8;
const STATUS_OFFSET = REWARD_OFFSET + 8 + 8 + 3;
const STATUS = ['pending', 'accepted', 'slashed', 'expired'] as const;

export type SolanaFiling = { report: string; url: string; status: (typeof STATUS)[number]; rewardUsdc: number } | null;

export async function readFilings(addresses: PublicKey[]): Promise<SolanaFiling[]> {
  const out: SolanaFiling[] = [];
  for (let i = 0; i < addresses.length; i += 100) {
    const infos = await connection.getMultipleAccountsInfo(addresses.slice(i, i + 100));
    infos.forEach((info, j) => {
      const address = addresses[i + j].toBase58();
      out.push(info ? {
        report: address,
        url: solscan(`account/${address}`),
        status: STATUS[info.data[STATUS_OFFSET]] ?? 'pending',
        rewardUsdc: Number(info.data.readBigUInt64LE(REWARD_OFFSET)) / 1_000_000,
      } : null);
    });
  }
  return out;
}

/** The key the Solana program accepts filings from (config.attester). */
export async function programAttester(): Promise<string | null> {
  const info = await connection.getAccountInfo(configPda());
  return info ? new PublicKey(info.data.subarray(8 + 32, 8 + 64)).toBase58() : null;
}
