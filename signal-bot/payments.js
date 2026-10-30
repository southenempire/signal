/**
 * Solana payment rails for Signal Protocol.
 *
 *  - Standard SPL USDC transfer from the protocol reward pool.
 *  - MagicBlock Private Payments (PAYOUT_RAIL=magicblock): the Private Payments API
 *    builds an unsigned private SPL transfer routed through a Private Ephemeral
 *    Rollup; the protocol wallet signs it and sends it to the RPC the API names.
 *    The transaction is simulated first and only signed if its sole effect on the
 *    protocol wallet is paying out the reward (plus fees). Falls back to a standard
 *    transfer if the API or route is unavailable.
 *  - Jupiter auto-stake: a real USDC → jupUSD swap through the Jupiter Swap API,
 *    signed by the user's custodial wallet. Mainnet only (jupUSD has no devnet
 *    liquidity). An optional platform fee goes to the protocol treasury.
 */
import {
  PublicKey, Transaction, VersionedTransaction, Connection, SystemProgram,
} from '@solana/web3.js';
import {
  getOrCreateAssociatedTokenAccount, getAssociatedTokenAddressSync, transfer, getAccount,
  TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import fetch from 'node-fetch';

export const JUP_USD_MINT = 'JuprjznTrTSp2UFa3ZBUFgwdAmtZCq4MQCwysN55USD';

const PAYOUT_RAIL = (process.env.PAYOUT_RAIL || 'standard').toLowerCase();
const MAGICBLOCK_API_URL = process.env.MAGICBLOCK_API_URL || 'https://payments.magicblock.app';
const MAGICBLOCK_EPHEMERAL_RPC = process.env.MAGICBLOCK_EPHEMERAL_RPC || 'https://devnet.magicblock.app';

const MAX_FEE_LAMPORTS = 10_000_000; // 0.01 SOL: fees and rent a payout may cost the protocol wallet

const JUPITER_API_KEY = process.env.JUPITER_API_KEY;
const JUPITER_API_URL = process.env.JUPITER_API_URL || (JUPITER_API_KEY ? 'https://api.jup.ag' : 'https://lite-api.jup.ag');
const JUPITER_PLATFORM_FEE_BPS = parseInt(process.env.JUPITER_PLATFORM_FEE_BPS || '0', 10);
const JUPITER_FEE_ACCOUNT = process.env.JUPITER_FEE_ACCOUNT; // treasury jupUSD token account

let ctx = null;

/** @param {{connection: Connection, protocolWallet: import('@solana/web3.js').Keypair, usdcMint: PublicKey, rpcUrl: string, isSafeMode: boolean}} c */
export function initPayments(c) {
  ctx = c;
  console.log(`[Payments] Payout rail: ${PAYOUT_RAIL}${PAYOUT_RAIL === 'magicblock' ? ` (${MAGICBLOCK_API_URL})` : ''}`);
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

/**
 * Simulate an externally built transaction and throw unless its only effect on the protocol
 * wallet is: the USDC account drops by at most `maxUsdc` base units, every other token account
 * it owns is untouched, no authority or delegate changes, and SOL spent stays under MAX_FEE_LAMPORTS.
 */
export async function assertOnlyPaysOut(connection, tx, maxUsdc) {
  const wallet = ctx.protocolWallet.publicKey;
  const owned = (await Promise.all([TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID].map(programId =>
    connection.getTokenAccountsByOwner(wallet, { programId })))).flatMap(r => r.value);
  const addresses = [wallet, ...owned.map(a => a.pubkey)];
  const before = await connection.getMultipleAccountsInfo(addresses, 'confirmed');

  const vtx = tx instanceof VersionedTransaction
    ? tx
    : new VersionedTransaction(tx.compileMessage());
  const sim = await connection.simulateTransaction(vtx, {
    sigVerify: false,
    replaceRecentBlockhash: true,
    accounts: { encoding: 'base64', addresses: addresses.map(a => a.toBase58()) },
  });
  if (sim.value.err) throw new Error(`MagicBlock transfer fails in simulation: ${JSON.stringify(sim.value.err)}`);

  const after = sim.value.accounts;
  const solBefore = before[0]?.lamports ?? 0;
  const solAfter = after[0]?.lamports ?? 0;
  if (!after[0] || after[0].owner !== SystemProgram.programId.toBase58()) {
    throw new Error('MagicBlock transfer would reassign the protocol wallet');
  }
  if (solBefore - solAfter > MAX_FEE_LAMPORTS) {
    throw new Error(`MagicBlock transfer would spend ${solBefore - solAfter} lamports of SOL`);
  }

  let usdcSpent = 0n;
  for (let i = 1; i < addresses.length; i++) {
    const pre = before[i]?.data;
    const post = after[i] ? Buffer.from(after[i].data[0], 'base64') : null;
    if (!pre || !post) throw new Error(`MagicBlock transfer would close ${addresses[i].toBase58()}`);
    const preAmount = pre.readBigUInt64LE(64);
    const postAmount = post.readBigUInt64LE(64);
    // Everything except the balance (bytes 64..72) must be unchanged: owner, delegate, close authority, state.
    const strip = b => Buffer.concat([b.subarray(0, 64), b.subarray(72)]);
    if (!strip(pre).equals(strip(post))) {
      throw new Error(`MagicBlock transfer would change ownership or delegation of ${addresses[i].toBase58()}`);
    }
    const spent = preAmount - postAmount;
    if (pre.subarray(0, 32).equals(ctx.usdcMint.toBuffer())) {
      usdcSpent += spent;
    } else if (spent > 0n) {
      throw new Error(`MagicBlock transfer would move tokens out of ${addresses[i].toBase58()}`);
    }
  }
  if (usdcSpent > BigInt(maxUsdc)) {
    throw new Error(`MagicBlock transfer would move ${usdcSpent} USDC units, expected ≤ ${maxUsdc}`);
  }
}

async function payMagicBlock(userPubkey, amount) {
  const res = await fetch(`${MAGICBLOCK_API_URL}/v1/spl/transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: ctx.protocolWallet.publicKey.toBase58(),
      to: userPubkey.toBase58(),
      mint: ctx.usdcMint.toBase58(),
      amount: Math.round(amount * 1_000_000),
      cluster: isMainnet() ? 'mainnet' : 'devnet',
      visibility: 'private',
      fromBalance: 'base',
      toBalance: 'base',
      initIfMissing: true,
      initAtasIfMissing: true,
      memo: 'Signal Protocol reward',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`MagicBlock API ${res.status}: ${data?.error || data?.message || JSON.stringify(data)}`);

  const others = (data.requiredSigners || []).filter(s => s !== ctx.protocolWallet.publicKey.toBase58());
  if (others.length) throw new Error(`MagicBlock transfer needs extra signers: ${others.join(', ')}`);

  const raw = Buffer.from(data.transactionBase64, 'base64');
  const target = data.sendTo === 'ephemeral'
    ? new Connection(MAGICBLOCK_EPHEMERAL_RPC, 'confirmed')
    : ctx.connection;
  const legacy = data.version === 'legacy';
  const tx = legacy ? Transaction.from(raw) : VersionedTransaction.deserialize(raw);

  // The API built this transaction, so check what it does before the protocol wallet signs it.
  await assertOnlyPaysOut(target, tx, Math.round(amount * 1_000_000));

  let serialized;
  if (legacy) {
    tx.partialSign(ctx.protocolWallet);
    serialized = tx.serialize();
  } else {
    tx.sign([ctx.protocolWallet]);
    serialized = tx.serialize();
  }

  const sig = await target.sendRawTransaction(serialized, { skipPreflight: false });
  await target.confirmTransaction(
    { signature: sig, blockhash: data.recentBlockhash, lastValidBlockHeight: data.lastValidBlockHeight },
    'confirmed',
  );
  return sig;
}

/** Pay a reward on the configured rail. Returns { signature, rail } or null. */
export async function payReward(userPubkey, amount) {
  if (ctx.isSafeMode) {
    console.warn('[Safe Mode] Payout blocked: no production identity.');
    return null;
  }
  if (PAYOUT_RAIL === 'magicblock') {
    try {
      const signature = await payMagicBlock(userPubkey, amount);
      return { signature, rail: 'MagicBlock Private (PER)' };
    } catch (e) {
      console.warn('[Payments] MagicBlock payout failed, falling back to standard:', e.message);
    }
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
