/**
 * BOTChain (Chain ID 677) client for the SignalOracle contract.
 *
 * Only the contract owner can write, so BOTCHAIN_PRIVATE_KEY must be the deployer.
 * Writes go through a single queue so concurrent reports never collide on nonces.
 */
import { ethers } from 'ethers';

const BOTCHAIN_RPC = process.env.BOTCHAIN_RPC || 'https://rpc.botchain.ai';
export const ORACLE_ADDRESS = process.env.BOTCHAIN_ORACLE_ADDRESS || '0x9119b3D7e7DcC540F08D62CeBC5bC2f83e8793f2';
const PRIVATE_KEY = process.env.BOTCHAIN_PRIVATE_KEY || process.env.YELLOW_USER_PRIVATE_KEY;

// Salt keeps Telegram IDs private: reporterId = keccak256(salt:telegramId).
const REPORTER_SALT = process.env.REPORTER_SALT || process.env.SECRET_KEY || 'signal';

export const ORACLE_ABI = [
  'function recordPrice(string feedKey, uint256 usdcPrice, string imageHash, bytes32 reporterId, address wallet, uint256 feedMedian, uint256 feedSamples, uint8 newReputation) returns (uint256)',
  'function slash(bytes32 reporterId, string imageHash, string reason, uint8 newReputation)',
  'function getFeed(string feedKey) view returns (uint256 medianPrice, uint256 samples, uint256 updatedAt)',
  'function getFeedCount() view returns (uint256)',
  'function getReportCount() view returns (uint256)',
  'function getReputation(bytes32 reporterId) view returns (uint8)',
];

export const provider = new ethers.JsonRpcProvider(BOTCHAIN_RPC, 677, { staticNetwork: true });
const reader = new ethers.Contract(ORACLE_ADDRESS, ORACLE_ABI, provider);
const writer = PRIVATE_KEY
  ? new ethers.Contract(ORACLE_ADDRESS, ORACLE_ABI, new ethers.Wallet(PRIVATE_KEY, provider))
  : null;

if (!writer) {
  console.warn('[BOTChain] BOTCHAIN_PRIVATE_KEY missing — consensus results will NOT be recorded on-chain.');
}

export const isOracleConfigured = () => !!writer;

export function reporterIdFor(telegramId) {
  return ethers.keccak256(ethers.toUtf8Bytes(`${REPORTER_SALT}:${telegramId}`));
}

const toCents = (usd) => BigInt(Math.max(0, Math.round(usd * 100)));
const toHash = (h) => (h ? `0x${h}` : '');

let queue = Promise.resolve();
function enqueue(fn) {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

async function send(label, call) {
  if (!writer) return { success: false, error: 'BOTChain oracle not configured' };
  return enqueue(async () => {
    try {
      const tx = await call();
      await tx.wait();
      console.log(`[BOTChain] ${label}: ${tx.hash}`);
      return { success: true, hash: tx.hash };
    } catch (e) {
      const msg = e.shortMessage || e.message;
      console.error(`[BOTChain] ${label} failed:`, msg);
      return { success: false, error: msg };
    }
  });
}

/** Record one accepted observation plus the feed's new median and the reporter's reputation. */
export function recordObservation({ feedKey, priceUsd, imageHash, telegramId, wallet, feedMedianUsd, feedSamples, reputation }) {
  return send(`recordPrice ${feedKey} @ $${priceUsd.toFixed(2)}`, () => writer.recordPrice(
    feedKey, toCents(priceUsd), toHash(imageHash), reporterIdFor(telegramId),
    wallet || ethers.ZeroAddress, toCents(feedMedianUsd), BigInt(feedSamples), reputation,
  ));
}

export function recordSlash({ telegramId, imageHash, reason, reputation }) {
  return send(`slash (${reason})`, () => writer.slash(
    reporterIdFor(telegramId), toHash(imageHash), reason.slice(0, 200), reputation,
  ));
}

export async function getReportCount() {
  try { return Number(await reader.getReportCount()); } catch { return null; }
}

export async function getFeedCount() {
  try { return Number(await reader.getFeedCount()); } catch { return null; }
}
