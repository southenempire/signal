// Shared NEAR helpers for the scripts: network, accounts from ~/.near-credentials, explorer links.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Account, JsonRpcProvider } from 'near-api-js';

export const NETWORK = process.env.NEAR_NETWORK || 'testnet';
export const RPC_URL = process.env.NEAR_RPC_URL || (NETWORK === 'mainnet' ? 'https://free.rpc.fastnear.com' : 'https://test.rpc.fastnear.com');
export const OWNER = process.env.NEAR_OWNER || 'signal-southen.testnet';
export const CONTRACT = process.env.SIGNAL_NEAR_CONTRACT || `oracle.${OWNER}`;

export const provider = new JsonRpcProvider({ url: RPC_URL });

/** An account whose key is in ~/.near-credentials/<network>/<id>.json, or NEAR_PRIVATE_KEY. */
export function loadAccount(accountId) {
  const file = path.join(os.homedir(), '.near-credentials', NETWORK, `${accountId}.json`);
  const key = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).private_key : process.env.NEAR_PRIVATE_KEY;
  if (!key) throw new Error(`No key for ${accountId}: expected ${file} or NEAR_PRIVATE_KEY`);
  return new Account(accountId, provider, key);
}

export const view = (methodName, args = {}) => provider.callFunction({ contractId: CONTRACT, method: methodName, args });

export const txLink = (hash) => `https://${NETWORK === 'mainnet' ? '' : 'testnet.'}nearblocks.io/txns/${hash}`;
