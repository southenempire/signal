/**
 * Solana payment rails for Signal Protocol.
 *
 *  - Standard SPL USDC transfer from the protocol reward pool.
 *  - Jupiter auto-stake: a real USDC → jupUSD swap through the Jupiter Swap API,
 *    signed by the user's custodial wallet. Mainnet only (jupUSD has no devnet
 *    liquidity). An optional platform fee goes to the protocol treasury.
 */
import { PublicKey, VersionedTransaction, Connection } from '@solana/web3.js';
import {
  getOrCreateAssociatedTokenAccount, getAssociatedTokenAddressSync, transfer, getAccount,
  TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import fetch from 'node-fetch';

export const JUP_USD_MINT = 'JuprjznTrTSp2UFa3ZBUFgwdAmtZCq4MQCwysN55USD';

const JUPITER_API_KEY = process.env.JUPITER_API_KEY;
const JUPITER_API_URL = process.env.JUPITER_API_URL || (JUPITER_API_KEY ? 'https://api.jup.ag' : 'https://lite-api.jup.ag');
const JUPITER_PLATFORM_FEE_BPS = parseInt(process.env.JUPITER_PLATFORM_FEE_BPS || '0', 10);
const JUPITER_FEE_ACCOUNT = process.env.JUPITER_FEE_ACCOUNT; // treasury jupUSD token account

let ctx = null;

/** @param {{connection: Connection, protocolWallet: import('@solana/web3.js').Keypair, usdcMint: PublicKey, rpcUrl: string, isSafeMode: boolean}} c */
export function initPayments(c) {
  ctx = c;
}

export const isMainnet = () =>
  process.env.SOLANA_CLUSTER === 'mainnet' || /mainnet/.test(ctx?.rpcUrl || '');

async function tokenProgramFor(mint) {
  const info = await ctx.connection.getAccountInfo(mint);
  return info?.owner?.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
}

export async function getTokenBalance(owner, mint = ctx.usdcMint) {
  try {
    const programId = await tokenProgramFor(mint);
    // Read only: a missing token account just means a zero balance, so don't create (and pay for) one.
    const ata = getAssociatedTokenAddressSync(mint, owner, false, programId);
    const acct = await getAccount(ctx.connection, ata, 'confirmed', programId);
    return Number(acct.amount) / 1_000_000;
  } catch { return 0; }
}

/** Send `amount` of `mint` (6 decimals) from `fromKeypair` to `toOwner`. Protocol wallet pays rent. */
export async function sendToken(fromKeypair, toOwner, amount, mint = ctx.usdcMint) {
  const programId = await tokenProgramFor(mint);
  const fromATA = await getOrCreateAssociatedTokenAccount(
    ctx.connection, ctx.protocolWallet, mint, fromKeypair.publicKey, false, 'confirmed', undefined, programId,
  );
  const toATA = await getOrCreateAssociatedTokenAccount(
    ctx.connection, ctx.protocolWallet, mint, toOwner, false, 'confirmed', undefined, programId,
  );
  return transfer(
    ctx.connection, fromKeypair, fromATA.address, toATA.address, fromKeypair,
    BigInt(Math.round(amount * 1_000_000)), [], undefined, programId,
  );
}

async function payStandard(userPubkey, amount) {
  try {
    return await sendToken(ctx.protocolWallet, userPubkey, amount);
  } catch (e) {
    console.error('[Payments] Standard payout error:', e.message);
    return null;
  }
}

/** Pay a reward from the protocol wallet. Returns { signature, rail } or null. */
export async function payReward(userPubkey, amount) {
  if (ctx.isSafeMode) {
    console.warn('[Safe Mode] Payout blocked: no production identity.');
    return null;
  }
  const signature = await payStandard(userPubkey, amount);
  return signature ? { signature, rail: 'Solana SPL' } : null;
}

/**
 * Swap the user's USDC into jupUSD via Jupiter. Real transaction, signed by the user's
 * custodial wallet, which must hold SOL for fees.
 * @returns {{signature: string, outAmount: number}}
 */
export async function swapUsdcToJupUsd(userKeypair, usdcAmount) {
  if (!isMainnet()) throw new Error('Jupiter swaps run on Solana mainnet only; this bot is on devnet.');

  const headers = { 'Content-Type': 'application/json', ...(JUPITER_API_KEY ? { 'x-api-key': JUPITER_API_KEY } : {}) };
  const feeOn = JUPITER_PLATFORM_FEE_BPS > 0 && JUPITER_FEE_ACCOUNT;

  const params = new URLSearchParams({
    inputMint: ctx.usdcMint.toBase58(),
    outputMint: JUP_USD_MINT,
    amount: String(Math.round(usdcAmount * 1_000_000)),
    slippageBps: '50',
    ...(feeOn ? { platformFeeBps: String(JUPITER_PLATFORM_FEE_BPS) } : {}),
  });
  const quoteRes = await fetch(`${JUPITER_API_URL}/swap/v1/quote?${params}`, { headers });
  const quote = await quoteRes.json();
  if (!quoteRes.ok || !quote.outAmount) throw new Error(`Jupiter quote failed: ${quote.error || quoteRes.status}`);

  const swapRes = await fetch(`${JUPITER_API_URL}/swap/v1/swap`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: userKeypair.publicKey.toBase58(),
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto',
      ...(feeOn ? { feeAccount: JUPITER_FEE_ACCOUNT } : {}),
    }),
  });
  const swap = await swapRes.json();
  if (!swapRes.ok || !swap.swapTransaction) throw new Error(`Jupiter swap build failed: ${swap.error || swapRes.status}`);

  const tx = VersionedTransaction.deserialize(Buffer.from(swap.swapTransaction, 'base64'));
  tx.sign([userKeypair]);
  const signature = await ctx.connection.sendRawTransaction(tx.serialize(), { maxRetries: 3 });
  const lastValidBlockHeight = swap.lastValidBlockHeight
    ?? (await ctx.connection.getLatestBlockhash('confirmed')).lastValidBlockHeight;
  await ctx.connection.confirmTransaction(
    { signature, blockhash: tx.message.recentBlockhash, lastValidBlockHeight }, 'confirmed',
  );

  return { signature, outAmount: Number(quote.outAmount) / 1_000_000 };
}
