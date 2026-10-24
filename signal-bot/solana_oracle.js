/**
 * Client for the signal_oracle Solana program (../signal-program).
 *
 * The program is the source of truth for consensus: it locks rewards, checks local
 * price bounds and peer agreement, pays from its vault, slashes, and keeps reputation
 * and feed medians. The bot is the attester (it vouches for the vision-AI parse and pays
 * rent) and a crank (it calls peer_check and settle; anyone else could too).
 */
import anchor from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, VersionedTransaction } from '@solana/web3.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { createHash } from 'crypto';
import { createRequire } from 'module';
import bs58 from 'bs58';

const { AnchorProvider, Program, BN } = anchor;
const require = createRequire(import.meta.url);
const IDL = require('./idl/signal_oracle.json');

// Report account layout (after the 8-byte discriminator): reporter 32, feed 32, image_hash 32,
// price 8, reward 8, submitted_at 8, bounds 1, confirmations 1, contradictions 1, status 1.
const OFFSET_FEED = 8 + 32;
const OFFSET_STATUS = 8 + 32 + 32 + 32 + 8 + 8 + 8 + 1 + 1 + 1;
const STATUS_PENDING = 0;

let program = null;
let attester = null;
let usdcMint = null;

const seed = (s) => Buffer.from(s);
const pda = (...seeds) => PublicKey.findProgramAddressSync(seeds, program.programId)[0];

export const feedIdFor = (feedKey) => createHash('sha256').update(feedKey).digest();
export const feedIdHex = (feedKey) => feedIdFor(feedKey).toString('hex');

export const configPda = () => pda(seed('config'));
export const feedPda = (feedKey) => pda(seed('feed'), feedIdFor(feedKey));
export const reporterPda = (wallet) => pda(seed('reporter'), wallet.toBuffer());
export const reportPda = (feed, imageHashHex) => pda(seed('report'), feed.toBuffer(), Buffer.from(imageHashHex, 'hex'));
const peerPda = (a, b) => pda(seed('peer'), a.toBuffer(), b.toBuffer());
const vaultAta = () => getAssociatedTokenAddressSync(usdcMint, configPda(), true);

const toMicro = (usd) => new BN(Math.max(1, Math.round(usd * 1_000_000)));
const fromMicro = (bn) => Number(bn.toString()) / 1_000_000;
const statusName = (s) => Object.keys(s)[0];
const errorCode = (e) => e?.error?.errorCode?.code || (String(e?.message || '').match(/Error Code: (\w+)/) || [])[1] || null;

export const isEnabled = () => !!program;
export const programId = () => program?.programId;

/**
 * @param {{ connection: import('@solana/web3.js').Connection,
 *           attesterKeypair: import('@solana/web3.js').Keypair,
 *           usdcMint: PublicKey }} opts
 */
export function initOracle({ connection, attesterKeypair, usdcMint: mint }) {
  attester = attesterKeypair;
  usdcMint = mint;
  const sign = (tx) => {
    if (tx instanceof VersionedTransaction) tx.sign([attester]);
    else tx.partialSign(attester);
    return tx;
  };
  const wallet = {
    publicKey: attester.publicKey,
    payer: attester,
    signTransaction: async (tx) => sign(tx),
    signAllTransactions: async (txs) => txs.map(sign),
  };
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  program = new Program(IDL, provider);
  console.log(`[Oracle] Solana program ${program.programId.toBase58()} · attester ${attester.publicKey.toBase58()}`);
}

export async function getConfig() {
  try { return await program.account.config.fetch(configPda()); } catch { return null; }
}

export async function poolBalance() {
  try {
    const bal = await program.provider.connection.getTokenAccountBalance(vaultAta());
    return Number(bal.value.uiAmount);
  } catch { return null; }
}

/** On-chain reputation record, or null if this wallet has never reported. */
export async function getReporter(wallet) {
  try {
    const r = await program.account.reporter.fetch(reporterPda(wallet));
    return { reputation: r.reputation, accepted: r.accepted, slashed: r.slashed, lockedUsd: fromMicro(r.locked) };
  } catch { return null; }
}

export async function reportExists(feedKey, imageHashHex) {
  const info = await program.provider.connection.getAccountInfo(reportPda(feedPda(feedKey), imageHashHex));
  return !!info;
}

/** File one priced item. The reporter's custodial keypair co-signs; the attester pays. */
export async function submitReport({ reporterKeypair, feedKey, imageHashHex, priceUsd }) {
  const feed = feedPda(feedKey);
  const report = reportPda(feed, imageHashHex);
  const signature = await program.methods
    .submitReport([...feedIdFor(feedKey)], [...Buffer.from(imageHashHex, 'hex')], toMicro(priceUsd))
    .accountsPartial({
      attester: attester.publicKey,
      reporterWallet: reporterKeypair.publicKey,
      config: configPda(),
      reporter: reporterPda(reporterKeypair.publicKey),
      feed,
      report,
      vault: vaultAta(),
      systemProgram: SystemProgram.programId,
    })
    .signers([reporterKeypair])
    .rpc();
  const r = await program.account.report.fetch(report);
  return { report: report.toBase58(), signature, rewardUsd: fromMicro(r.reward), bounds: statusName(r.bounds) };
}

export async function flagDuplicate({ offenderWallet, feedKey, imageHashHex }) {
  return program.methods
    .flagDuplicate([...Buffer.from(imageHashHex, 'hex')])
    .accountsPartial({
      attester: attester.publicKey,
      config: configPda(),
      existingReport: reportPda(feedPda(feedKey), imageHashHex),
      offenderWallet,
      offender: reporterPda(offenderWallet),
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export async function flagFake({ offenderWallet, imageHashHex }) {
  return program.methods
    .flagFake([...Buffer.from(imageHashHex, 'hex')])
    .accountsPartial({
      attester: attester.publicKey,
      config: configPda(),
      offenderWallet,
      offender: reporterPda(offenderWallet),
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

async function peerCheck(r1, r2) {
  const [a, b] = Buffer.compare(r1.toBuffer(), r2.toBuffer()) < 0 ? [r1, r2] : [r2, r1];
  return program.methods
    .peerCheck()
    .accountsPartial({
      cranker: attester.publicKey,
      config: configPda(),
      reportA: a,
      reportB: b,
      peerLink: peerPda(a, b),
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

async function settle(reportKey, report) {
  return program.methods
    .settle()
    .accountsPartial({
      cranker: attester.publicKey,
      usdcMint,
      config: configPda(),
      report: reportKey,
      reporter: reporterPda(report.reporter),
      feed: report.feed,
      reporterWallet: report.reporter,
      reporterAta: getAssociatedTokenAddressSync(usdcMint, report.reporter),
      vault: vaultAta(),
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

let cranking = false;

/**
 * One crank pass: compare every pending report with its uncompared peers, then try to settle
 * every pending report. Returns the reports that settled in this pass.
 * @returns {Promise<{report: string, reporter: string, status: string, rewardUsd: number,
 *   priceUsd: number, feed: string, signature: string, reputation: number|null, feedMedianUsd: number|null,
 *   feedSamples: number}[]>}
 */
export async function crank() {
  if (!program || cranking) return [];
  cranking = true;
  try {
    const cfg = await getConfig();
    if (!cfg) return [];
    const window = Number(cfg.peerWindowSecs.toString());

    const pending = await program.account.report.all([
      { memcmp: { offset: OFFSET_STATUS, bytes: bs58.encode(Uint8Array.from([STATUS_PENDING])) } },
    ]);
    if (!pending.length) return [];

    // 1. Peer checks for every pending report against same-feed reports from other reporters.
    const byFeed = new Map();
    for (const p of pending) {
      const k = p.account.feed.toBase58();
      if (!byFeed.has(k)) byFeed.set(k, []);
      byFeed.get(k).push(p);
    }
    for (const [feed, pendingOnFeed] of byFeed) {
      const all = await program.account.report.all([{ memcmp: { offset: OFFSET_FEED, bytes: feed } }]);
      const candidates = all.filter((r) => ['pending', 'accepted'].includes(statusName(r.account.status)));
      const pairs = new Map();
      for (const p of pendingOnFeed) {
        for (const q of candidates) {
          if (q.publicKey.equals(p.publicKey) || q.account.reporter.equals(p.account.reporter)) continue;
          const gap = Math.abs(Number(p.account.submittedAt.toString()) - Number(q.account.submittedAt.toString()));
          if (gap > window) continue;
          const [a, b] = Buffer.compare(p.publicKey.toBuffer(), q.publicKey.toBuffer()) < 0 ? [p.publicKey, q.publicKey] : [q.publicKey, p.publicKey];
          pairs.set(`${a.toBase58()}:${b.toBase58()}`, [a, b]);
        }
      }
      const list = [...pairs.values()];
      for (let i = 0; i < list.length; i += 100) {
        const chunk = list.slice(i, i + 100);
        const infos = await program.provider.connection.getMultipleAccountsInfo(chunk.map(([a, b]) => peerPda(a, b)));
        for (let j = 0; j < chunk.length; j++) {
          if (infos[j]) continue; // already compared
          await peerCheck(...chunk[j]).catch((e) => console.warn('[Oracle] peer_check failed:', errorCode(e) || e.message));
        }
      }
    }

    // 2. Settle whatever now has enough evidence (or has timed out).
    const settled = [];
    for (const p of pending) {
      const fresh = await program.account.report.fetch(p.publicKey);
      try {
        const signature = await settle(p.publicKey, fresh);
        const after = await program.account.report.fetch(p.publicKey);
        const [rep, feed] = await Promise.all([
          getReporter(after.reporter),
          program.account.feed.fetch(after.feed),
        ]);
        settled.push({
          report: p.publicKey.toBase58(),
          reporter: after.reporter.toBase58(),
          status: statusName(after.status),
          rewardUsd: fromMicro(after.reward),
          priceUsd: fromMicro(after.price),
          feed: after.feed.toBase58(),
          signature,
          reputation: rep?.reputation ?? null,
          feedMedianUsd: feedMedian(feed),
          feedSamples: Number(feed.totalSamples.toString()),
        });
      } catch (e) {
        const code = errorCode(e);
        if (code !== 'StillPending') console.warn(`[Oracle] settle ${p.publicKey.toBase58()} failed:`, code || e.message);
      }
    }
    return settled;
  } finally {
    cranking = false;
  }
}

function feedMedian(feed) {
  const n = feed.len;
  if (!n) return null;
  const prices = feed.prices.slice(0, n).map((p) => Number(p.toString())).sort((a, b) => a - b);
  return prices[Math.floor((n - 1) / 2)] / 1_000_000;
}

/** Every feed on-chain, keyed by feed id hex. */
export async function listFeeds() {
  const feeds = await program.account.feed.all();
  return feeds.map((f) => ({
    address: f.publicKey.toBase58(),
    feedIdHex: Buffer.from(f.account.feedId).toString('hex'),
    medianUsd: feedMedian(f.account),
    samples: Number(f.account.totalSamples.toString()),
    updatedAt: Number(f.account.updatedAt.toString()),
  }));
}

export async function reportCount() {
  const cfg = await getConfig();
  return cfg ? Number(cfg.reportCount.toString()) : null;
}
