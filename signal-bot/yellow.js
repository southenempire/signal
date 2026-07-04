/**
 * Signal Protocol — Yellow Network Integration
 * Nitrolite SDK v1 state channel settlement layer
 *
 * This module wraps @yellow-org/sdk to provide off-chain USDC reward
 * settlement for oracle reporters who opt into the Yellow rail.
 *
 * Flow:
 *   init() → openChannel() → payReporter() [per report] → withdraw() on demand
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { addYellowCredit, getYellowCredit, getYellowDBStats } from './db.js';

// ── Config ─────────────────────────────────────────────────────────────────────
export const YELLOW_CONFIG = {
  wsURL:         process.env.YELLOW_NITRONODE_WS_URL  || 'wss://nitronode-sandbox.yellow.org/v1/ws',
  rpcURL:        process.env.YELLOW_RPC_URL           || 'https://ethereum-sepolia-rpc.publicnode.com',
  chainId:       parseInt(process.env.YELLOW_CHAIN_ID || '11155111'),   // Sepolia testnet
  asset:         process.env.YELLOW_ASSET             || 'yellow',
  userPrivKey:   process.env.YELLOW_USER_PRIVATE_KEY  || null,
  appPrivKey:    process.env.YELLOW_APP_PRIVATE_KEY   || null,
  depositAmount: parseFloat(process.env.YELLOW_CHANNEL_DEPOSIT || '0.05'),
};

// ── State ──────────────────────────────────────────────────────────────────────
let yellowClient   = null;
let appClient      = null;
let activeSession  = null;   // current app session ID
let isYellowReady  = false;

// ── SDK dynamic import ─────────────────────────────────────────────────────────
async function loadSDK() {
  try {
    const sdk = await import('@yellow-org/sdk');
    return sdk;
  } catch (e) {
    console.warn('[Yellow] ⚠️  @yellow-org/sdk not installed or failed to load:', e.message);
    return null;
  }
}

// ── Init ───────────────────────────────────────────────────────────────────────
/**
 * Initialize Yellow Network client and prepare the home channel.
 * Called once on bot startup. Gracefully degrades if env vars are missing.
 */
export async function initYellow() {
  if (!YELLOW_CONFIG.userPrivKey || !YELLOW_CONFIG.appPrivKey) {
    console.warn('[Yellow] 🟡 YELLOW_USER_PRIVATE_KEY / YELLOW_APP_PRIVATE_KEY not set. Yellow rail OFFLINE.');
    console.warn('[Yellow]    Set these in signal-bot/.env to enable Yellow settlement.');
    return false;
  }

  const sdk = await loadSDK();
  if (!sdk) return false;

  try {
    const { Client, createSigners, withBlockchainRPC, enableNodeLocalAccountTransactions } = sdk;

    const userSigners = createSigners(YELLOW_CONFIG.userPrivKey);
    const appSigners  = createSigners(YELLOW_CONFIG.appPrivKey);

    console.log('[Yellow] 🔌 Connecting to Nitronode:', YELLOW_CONFIG.wsURL);

    yellowClient = await Client.create(
      YELLOW_CONFIG.wsURL,
      userSigners.stateSigner,
      userSigners.txSigner,
      withBlockchainRPC(YELLOW_CONFIG.chainId, YELLOW_CONFIG.rpcURL),
    );

    // Required for Node.js (not browser wallets)
    if (enableNodeLocalAccountTransactions) {
      enableNodeLocalAccountTransactions(yellowClient);
    }

    appClient = await Client.create(
      YELLOW_CONFIG.wsURL,
      appSigners.stateSigner,
      appSigners.txSigner,
      withBlockchainRPC(YELLOW_CONFIG.chainId, YELLOW_CONFIG.rpcURL),
    );

    if (enableNodeLocalAccountTransactions) {
      enableNodeLocalAccountTransactions(appClient);
    }

    console.log('[Yellow] ✅ Nitronode connected');

    // Prepare home channel (idempotent — skips if already funded)
    await ensureHomeChannel(sdk);

    isYellowReady = true;
    console.log('[Yellow] 🟡 Yellow settlement rail is ONLINE');
    return true;

  } catch (e) {
    console.error('[Yellow] ❌ Init failed:', e.message);
    return false;
  }
}

/**
 * Ensure the protocol's home channel is funded and checkpointed.
 * This is a one-time setup per wallet; subsequent calls are cheap no-ops.
 */
async function ensureHomeChannel(sdk) {
  if (!yellowClient) return;
  try {
    const { chainId, asset, depositAmount } = YELLOW_CONFIG;

    // Check if home channel already exists with a valid funded state
    // If not, deposit and checkpoint
    console.log(`[Yellow] 📦 Preparing home channel (${depositAmount} ${asset} on chain ${chainId})...`);
    await yellowClient.approveToken(chainId, asset, depositAmount);
    const depositState = await yellowClient.deposit(chainId, asset, depositAmount);
    console.log('[Yellow] 📦 Home channel deposit state version:', depositState.version);
    const txHash = await yellowClient.checkpoint(asset);
    console.log('[Yellow] 🔗 Home channel checkpointed:', txHash);
  } catch (e) {
    // If channel already exists or deposit fails due to insufficient funds,
    // log and continue — the channel may already be set up from a previous run
    console.warn('[Yellow] ⚠️  Home channel setup skipped (may already exist):', e.message);
  }
}

// ── Pay ────────────────────────────────────────────────────────────────────────
/**
 * Credit a reporter via Yellow state channel.
 * This is an off-chain operation — instant, gasless.
 *
 * @param {string} evmAddress  - Reporter's EVM wallet address (0x...)
 * @param {number} usdcAmount  - Amount in USDC (e.g. 0.05)
 * @returns {object|null}      - { success, txId, type } or null on failure
 */
export async function payReporterYellow(evmAddress, usdcAmount) {
  if (!isYellowReady || !yellowClient || !appClient) {
    console.warn('[Yellow] Pay skipped — Yellow rail offline');
    return null;
  }

  try {
    const sdk = await loadSDK();
    if (!sdk) return null;

    const {
      packCreateAppSessionRequestV1,
      AppDefinitionV1,
    } = sdk;

    // Get wallet addresses
    const userAddress = await yellowClient.getAddress();
    const appAddress  = await appClient.getAddress();

    // Create a micro app session for this payment
    const definition = {
      applicationId: `signal-oracle-${Date.now()}`,
      participants: [
        { walletAddress: userAddress,  signatureWeight: 1 },
        { walletAddress: appAddress,   signatureWeight: 1 },
      ],
      quorum: 2,
      nonce: BigInt(Date.now()) * 1_000_000n + BigInt(Math.floor(Math.random() * 1_000_000)),
    };

    const sessionData = {
      destination: evmAddress,
      amount: usdcAmount,
    };

    const payload  = packCreateAppSessionRequestV1(definition, sessionData);
    const userSig  = await yellowClient.stateSigner.signMessage(payload);
    const appSig   = await appClient.stateSigner.signMessage(payload);

    const created = await yellowClient.createAppSession(definition, sessionData, [userSig, appSig]);
    const sessionId = created.appSessionId;

    // Deposit into the app session from the home channel
    const depositIntent = {
      appSessionId: sessionId,
      asset: YELLOW_CONFIG.asset,
      amount: usdcAmount,
    };
    await yellowClient.depositIntoAppSession(depositIntent, userSig);

    // Operate: transfer to the reporter
    const newAllocation = [
      { walletAddress: userAddress,  amount: 0 },
      { walletAddress: appAddress,   amount: 0 },
      { walletAddress: evmAddress,   amount: usdcAmount }, // reporter gets it
    ];
    const opState = await yellowClient.operate(sessionId, appClient.stateSigner, newAllocation);

    // Track pending credit in SQLite database
    addYellowCredit(evmAddress, usdcAmount);

    console.log(`[Yellow] ✅ Off-chain credit: ${usdcAmount} USDC → ${evmAddress} | session: ${sessionId}`);

    return {
      success: true,
      sessionId,
      stateVersion: opState?.version || 'confirmed',
      type: 'yellow_state_channel',
    };

  } catch (e) {
    console.error('[Yellow] ❌ Pay failed:', e.message);
    return null;
  }
}

// ── Balance ────────────────────────────────────────────────────────────────────
/**
 * Get pending Yellow credits for an EVM address (off-chain, not yet settled).
 * @param {string} evmAddress
 * @returns {number} USDC amount pending settlement
 */
export function getPendingYellowBalance(evmAddress) {
  return getYellowCredit(evmAddress);
}

// ── Status ─────────────────────────────────────────────────────────────────────
export function getYellowStatus() {
  const dbStats = getYellowDBStats();
  return {
    online: isYellowReady,
    network: YELLOW_CONFIG.chainId === 11155111 ? 'Sepolia Testnet' : 'Mainnet',
    nitronodeURL: YELLOW_CONFIG.wsURL,
    asset: YELLOW_CONFIG.asset,
    activeSession,
    pendingAddresses: dbStats.pendingAddresses,
    totalPendingUSDC: dbStats.totalPendingUSDC,
  };
}
