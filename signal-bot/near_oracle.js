/**
 * Files NEAR AI's signed receipt audits with the Signal contract on NEAR (signal-near).
 *
 * The bot is a relayer: it pays the gas and storage and names an anonymous reporter id for the
 * Telegram user. It cannot change what gets filed — the contract checks the TEE signature over
 * the exact request and response bytes and refuses anything else.
 */
import { createHash } from 'node:crypto';
import { Account, JsonRpcProvider, nearToYocto, teraToGas } from 'near-api-js';

const NETWORK = process.env.NEAR_NETWORK || 'testnet';
const CONTRACT = process.env.SIGNAL_NEAR_CONTRACT;
const ACCOUNT_ID = process.env.NEAR_ACCOUNT_ID;
const PRIVATE_KEY = process.env.NEAR_PRIVATE_KEY;
const RPC_URL = process.env.NEAR_RPC_URL || (NETWORK === 'mainnet' ? 'https://free.rpc.fastnear.com' : 'https://test.rpc.fastnear.com');
const REPORTER_SALT = process.env.REPORTER_SALT;

let account = null;
let provider = null;

export function initNearOracle() {
  if (!CONTRACT || !ACCOUNT_ID || !PRIVATE_KEY || !REPORTER_SALT) {
    console.log('[NEAR] Oracle off — set SIGNAL_NEAR_CONTRACT, NEAR_ACCOUNT_ID, NEAR_PRIVATE_KEY and REPORTER_SALT to file on NEAR');
    return false;
  }
  provider = new JsonRpcProvider({ url: RPC_URL });
  account = new Account(ACCOUNT_ID, provider, PRIVATE_KEY);
  console.log(`[NEAR] Filing verdicts to ${CONTRACT} on ${NETWORK} as ${ACCOUNT_ID}`);
  return true;
}

export const isNearEnabled = () => account !== null;

export const nearTxLink = (hash) => `https://${NETWORK === 'mainnet' ? '' : 'testnet.'}nearblocks.io/txns/${hash}`;

/** Anonymous, stable reporter id for a Telegram user. The salt keeps it from being traced back. */
export const nearReporterId = (telegramId) =>
  `tg:${createHash('sha256').update(`${REPORTER_SALT}:${telegramId}`).digest('hex').slice(0, 32)}`;

/**
 * @param {{request:string, response:string, signature:string, telegramId:number}} p
 * @returns {Promise<{report: object, txHash: string}>}
 */
export async function fileVerdict({ request, response, signature, telegramId }) {
  if (!account) throw new Error('NEAR oracle is not configured');
  const tx = await account.callFunctionRaw({
    contractId: CONTRACT,
    methodName: 'submit_verdict',
    args: { request, response, signature, reporter: nearReporterId(telegramId) },
    gas: teraToGas('100'),
    deposit: nearToYocto('0.05'), // storage; the contract refunds what it doesn't use
  });
  if (tx.status?.Failure) throw new Error(`contract refused: ${JSON.stringify(tx.status.Failure).slice(0, 300)}`);
  const report = JSON.parse(Buffer.from(tx.status.SuccessValue, 'base64').toString());
  return { report, txHash: tx.transaction.hash };
}

/** The id a relayed Telegram user has on-chain: namespaced by this relayer account. */
export const relayedReporter = (telegramId) => `${ACCOUNT_ID}/${nearReporterId(telegramId)}`;

/** Make sure the NEAR contract knows which Solana wallet this user's rewards and reputation go to. */
export async function ensureSolanaWallet(telegramId, wallet) {
  const registered = await provider.callFunction({ contractId: CONTRACT, method: 'get_solana_wallet', args: { reporter: relayedReporter(telegramId) } });
  if (registered === wallet.toBase58()) return;
  const tx = await account.callFunctionRaw({
    contractId: CONTRACT,
    methodName: 'register_solana_wallet',
    args: { wallet: wallet.toBase58(), reporter: nearReporterId(telegramId) },
    gas: teraToGas('30'),
  });
  if (tx.status?.Failure) throw new Error(`register_solana_wallet refused: ${JSON.stringify(tx.status.Failure).slice(0, 200)}`);
}

/** Run a contract call that ends in an MPC-signed Solana transaction; returns it as base64. */
async function mpcSigned(methodName, args) {
  const tx = await account.callFunctionRaw({ contractId: CONTRACT, methodName, args, gas: teraToGas('150') });
  if (tx.status?.Failure) throw new Error(`${methodName} refused: ${JSON.stringify(tx.status.Failure).slice(0, 300)}`);
  const value = JSON.parse(Buffer.from(tx.status.SuccessValue, 'base64').toString());
  if (!value) throw new Error(`${methodName}: the MPC network did not sign`);
  return value;
}

/** MPC-signed Solana filing of one accepted price from a NEAR report. */
export const signSolanaReport = (reportId, itemIndex, accounts, recentBlockhash) =>
  mpcSigned('sign_solana_report', { report_id: reportId, item_index: itemIndex, accounts, recent_blockhash: recentBlockhash });

/** MPC-signed Solana penalty for a NEAR report the model judged a fake. */
export const signSolanaFraud = (reportId, accounts, recentBlockhash) =>
  mpcSigned('sign_solana_fraud', { report_id: reportId, accounts, recent_blockhash: recentBlockhash });

export async function getNearReport(id) {
  return provider.callFunction({ contractId: CONTRACT, method: 'get_report', args: { id } });
}

/** All feeds on NEAR, for the API and website. */
export async function listNearFeeds() {
  if (!provider) return [];
  const feeds = [];
  for (let from = 0; ; from += 100) {
    const page = await provider.callFunction({ contractId: CONTRACT, method: 'list_feeds', args: { from_index: from, limit: 100 } });
    feeds.push(...page);
    if (page.length < 100) return feeds;
  }
}

export async function nearStats() {
  if (!provider) return null;
  const [reports, feeds] = await Promise.all([
    provider.callFunction({ contractId: CONTRACT, method: 'reports_count', args: {} }),
    provider.callFunction({ contractId: CONTRACT, method: 'feeds_count', args: {} }),
  ]);
  return { contract: CONTRACT, network: NETWORK, reports, feeds };
}
