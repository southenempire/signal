import 'dotenv/config';
import express from 'express';
import cors from 'cors';
/**
 * Signal Protocol Bot — Physical Truth Oracle
 * Integrated: Yellow Network (Nitrolite state channel settlement)
 */
import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  const origLookup = dns.lookup;
  dns.lookup = (hostname, options, callback) => {
    if (typeof options === 'function') { callback = options; options = {}; }
    dns.resolve4(hostname, (err, addrs) => {
      if (!err && addrs && addrs.length > 0) {
        if (options && options.all) {
          return callback(null, addrs.map(a => ({ address: a, family: 4 })));
        }
        return callback(null, addrs[0], 4);
      }
      return origLookup(hostname, options, callback);
    });
  };
} catch (dnsErr) {
  console.warn('[DNS] Local DNS fallback setup skipped:', dnsErr.message);
}

import { Telegraf, Markup } from 'telegraf';
import {
  Connection, Keypair, PublicKey, LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { readFileSync } from 'fs';

import {
  getOrCreateUser, savePendingReport, getUserPendingLocked, setUserRegion,
  getLeaderboard, getRecentReports, getNetworkStats, getFeedsSummary,
  getAcceptedFeedPrices, getUserTotalEarned, getDailyReportCount, isImageDuplicate,
  getFeedKeyForImageHash, getAllFeedKeys, setReputation,
  saveYellowLink, getYellowLink
} from './db.js';
import { saveReportImage } from './images.js';
import bs58 from 'bs58';
import fetch from 'node-fetch';
import {
  initYellow,
  payReporterYellow,
  getPendingYellowBalance,
  getYellowStatus,
} from './yellow.js';
import {
  RULES, rewardFor, isBanned, regionFor, feedKey, slug, median,
} from './consensus.js';
import { settlePending, crankChain, penalize } from './settlement.js';
import * as oracle from './solana_oracle.js';
import { ORACLE_ADDRESS, getReportCount, getFeedCount, isOracleConfigured } from './botchain.js';
import {
  initPayments, payReward, getTokenBalance, sendToken, swapUsdcToJupUsd, isMainnet, JUP_USD_MINT,
} from './payments.js';
import { toUsd } from './fx.js';

// ─── Config ───────────────────────────────────────────────────────────────────
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const RPC_URL   = process.env.RPC_URL || 'https://api.devnet.solana.com';
const USDC_MINT = process.env.USDC_MINT || '4zMMC9srvvSbhvWxREz676cgVT7n8uyT8D5KWW2EGQuD';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
// Groq retires model names; override in Railway without a code change if this one goes away.
const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || 'qwen/qwen3.8-27b';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SETTLE_INTERVAL_MS = 5 * 60 * 1000;
const MAX_ITEMS_PER_REPORT = 10;
// Each item filed on-chain locks its own reward, so cap how many items one receipt can file.
const MAX_ONCHAIN_ITEMS = parseInt(process.env.MAX_ONCHAIN_ITEMS || '5', 10);

// ─── Zerion Agent Policies ────────────────────────────────────────────────────
const AGENT_POLICIES = {
    SPEND_LIMIT_USDC: 50.00, // Policy: Max $50 payout per node session
    CHAIN_LOCK: 'solana-devnet',
    EXPIRY_WINDOW_MIN: 60
};

// ─── Solana Identity ──────────────────────────────────────────────────────────
const connection = new Connection(RPC_URL, 'confirmed');

let protocolWallet;
let IS_SAFE_MODE = false;

try {
  if (process.env.SOLANA_KEYPAIR_JSON) {
    console.log('[Identity] Initializing Sovereign Wallet from Environment Variable...');
    protocolWallet = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(process.env.SOLANA_KEYPAIR_JSON))
    );
  } else {
    // Attempt local fallback for development
    try {
      const idPath = `${process.env.HOME || '/tmp'}/.config/solana/id.json`;
      console.log(`[Identity] Attempting Fallback: ${idPath}`);
      protocolWallet = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(readFileSync(idPath, 'utf8')))
      );
    } catch (fallbackErr) {
       console.warn('[Identity] WARNING: No local or env identity found. Entering SAFE MODE.');
       IS_SAFE_MODE = true;
       // Create an ephemeral burner key so the API still starts
       protocolWallet = Keypair.generate(); 
    }
  }
} catch (err) {
  console.error(`[Identity] CRITICAL: Initialization Error: ${err.message}`);
  IS_SAFE_MODE = true;
  protocolWallet = Keypair.generate();
}

const mintPubkey = new PublicKey(USDC_MINT);

if (IS_SAFE_MODE) {
    console.log('🛡️ [SAFE MODE ACTIVE]: Payouts and Swaps are disabled until SOLANA_KEYPAIR_JSON is configured.');
}

console.log('🔗 RPC:', RPC_URL);
console.log('💳 Protocol wallet:', protocolWallet.publicKey.toBase58());
console.log('💵 USDC Mint:', USDC_MINT);

initPayments({ connection, protocolWallet, usdcMint: mintPubkey, rpcUrl: RPC_URL, isSafeMode: IS_SAFE_MODE });

// Solana program: on-chain consensus, reward vault, slashing and reputation.
// The bot is the attester (vouches for the AI parse, pays rent) and a crank.
// SIGNAL_PROGRAM=off falls back to the off-chain engine in settlement.js.
if (!IS_SAFE_MODE && process.env.SIGNAL_PROGRAM !== 'off') {
  const attesterKeypair = process.env.SIGNAL_ATTESTER_KEYPAIR_JSON
    ? Keypair.fromSecretKey(new Uint8Array(JSON.parse(process.env.SIGNAL_ATTESTER_KEYPAIR_JSON)))
    : protocolWallet;
  oracle.initOracle({ connection, attesterKeypair, usdcMint: mintPubkey });
}
const runSettlement = () => (oracle.isEnabled()
  ? crankChain(settlementDeps)
  : settlePending(settlementDeps)
).catch(e => console.error('[Consensus] settle error:', e.message));

// ─── Pending actions (these are ephemeral — OK to be in-memory) ──────────────
const pendingReport = new Map();

const getUSDC = (pubkey) => getTokenBalance(pubkey, mintPubkey);
const getJupUSD = (pubkey) => getTokenBalance(pubkey, new PublicKey(JUP_USD_MINT));

const escapeHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ─── Bot ──────────────────────────────────────────────────────────────────────
let bot;
if (BOT_TOKEN) {
  try {
    bot = new Telegraf(BOT_TOKEN);
  } catch (e) {
    console.error('⚠️ [Bot] Failed to initialize Telegraf instance:', e.message);
  }
} else {
  console.warn('⚠️ [Bot] TELEGRAM_BOT_TOKEN missing. Telegram interface will be OFFLINE.');
}

const MAIN_MENU = Markup.keyboard([
  ['📸 Report a Price', '💰 My Rewards'],
  ['🏆 Leaderboard',   '📖 How It Works'],
  ['🚀 BOTChain Hub',  '🌐 Network Status'],
  ['📍 Set My City']
]).resize();

// /start
if (bot) {
  bot.start(async (ctx) => {
  const user = getOrCreateUser(ctx.from.id);
  const sol  = await connection.getBalance(user.keypair.publicKey);

  // Fund new users with gas SOL
  if (user.isNew) {
    connection.requestAirdrop(user.keypair.publicKey, 0.1 * LAMPORTS_PER_SOL).catch(() => {});
  }

  await ctx.replyWithHTML(
    `👋 <b>Welcome to Signal Bot!</b>\n\n` +
    `The DePIN oracle on Solana — report real-world prices and earn USDC instantly. No wallet needed.\n\n` +
    `🔑 <b>Your Wallet</b>\n<code>${user.publicKey}</code>\n\n` +
    `💰 SOL Balance: <b>${(sol / LAMPORTS_PER_SOL).toFixed(4)} SOL</b>\n` +
    `📊 Signal Points: <b>${user.points} PTS</b>\n` +
    `📸 Reports: <b>${user.reportCount}</b>`,
    MAIN_MENU
  );
});
}

// How It Works
if (bot) {
  bot.hears('📖 How It Works', async (ctx) => {
  await ctx.replyWithHTML(
    `<b>📖 How Signal Bot Works</b>\n\n` +
    `<b>1. Capture</b> → Send a photo of a receipt, shelf tag or fuel pump\n` +
    `<b>2. Parse</b> → Vision AI rejects screenshots and fakes, then reads every item, the store, the time and the total\n` +
    `<b>3. Consensus</b> → Each price is checked against local price bounds and peer reports from other signalers. Your reward is locked meanwhile.\n` +
    `<b>4. Settle</b> → The Signal program on Solana decides. Accepted: it pays your reward from its on-chain pool and adds the price to the feed (mirrored to BOTChain). Contradicted: reward forfeited and you are slashed.\n\n` +
    `<b>Reputation:</b> starts at ${RULES.REPUTATION_START}/100. +${RULES.REPUTATION_ACCEPT} per accepted report, ${RULES.REPUTATION_SLASH} per slash, ${RULES.REPUTATION_DUPLICATE} for duplicates. Higher reputation earns bigger rewards; below ${RULES.REPUTATION_BANNED_BELOW} you can't report.\n\n` +
    `<i>Consensus on Solana · Mirrored to BOTChain · Token: USDC</i>`,
    MAIN_MENU
  );
});
}

// Report menu
if (bot) {
  bot.hears('📸 Report a Price', async (ctx) => {
  await ctx.reply(
    '📍 What are you reporting?',
    Markup.inlineKeyboard([
      [Markup.button.callback('⛽ Fuel / Gas Price',    'FUEL'), Markup.button.callback('🛒 Grocery / Food', 'GROCERY')],
      [Markup.button.callback('💡 Electricity Rate',     'ELECTRICITY')],
      [Markup.button.callback('🏠 Rent / Property Price','RENT')],
      [Markup.button.callback('📦 Global Physical Data', 'GENERIC')],
    ])
  );
});
}

// Category selection
if (bot) {
  bot.action(['FUEL','GROCERY','ELECTRICITY','RENT','GENERIC'], async (ctx) => {
  pendingReport.set(ctx.from.id, ctx.match[0]);
  const labels = {
    FUEL: '⛽ Fuel / Gas',
    GROCERY: '🛒 Grocery / Recipes',
    ELECTRICITY: '💡 Electricity',
    RENT: '🏠 Rent / Property',
    GENERIC: '📦 Global Data',
  };
  await ctx.answerCbQuery();
  await ctx.replyWithHTML(
    `📸 <b>${labels[ctx.match[0]]} Report</b>\n\n` +
    `Send a clear photo with the price visible. Make sure lighting is good and the tag/display is readable.\n\n` +
    `<i>Tip: Price tags, fuel pump screens, and receipts all work great.</i>`
  );
});
}

// ─── Consensus settlement wiring ───────────────────────────────────────────────
const settlementDeps = {
  payReward: async (telegramId, amount) => {
    const u = getOrCreateUser(telegramId);
    const result = await payReward(u.keypair.publicKey, amount);
    // Bonus rail: Yellow Network credit for users who linked an EVM wallet
    const evmAddress = getYellowLink(telegramId);
    if (evmAddress) {
      payReporterYellow(evmAddress, amount).catch(e => console.warn('[Yellow] Bonus payout error (non-critical):', e.message));
    }
    return result;
  },
  onAccepted: (telegramId, amount) => {
    const evmAddress = getYellowLink(telegramId);
    if (evmAddress) {
      payReporterYellow(evmAddress, amount).catch(e => console.warn('[Yellow] Bonus payout error (non-critical):', e.message));
    }
  },
  notify: async (telegramId, html) => {
    if (!bot) return;
    await bot.telegram.sendMessage(telegramId, html, { parse_mode: 'HTML', disable_web_page_preview: true })
      .catch(e => console.warn(`[Notify] ${telegramId}:`, e.message));
  },
};

// Photo handler — Vision AI receipt parsing, then consensus
const VISION_PROMPT = `You are the Signal verification engine. You audit photos of real-world prices and extract structured data.

RULES
1. Reject screenshots of apps, web pages, charts, trading screens, memes, selfies, stock photos and anything shown on a digital screen other than a physical fuel pump display. Set "verified": false.
2. If the image looks edited, generated, composited, or the numbers look tampered with, set "verified": false AND "fraudSuspected": true. Only use fraudSuspected for deliberate fakes, never for blurry or unreadable photos.
3. Accept real photos of printed receipts or POS slips, fuel pump displays, shelf price tags or price boards, and utility bills or meters.
4. Extract every priced line item (max 10). For each give a canonicalItem: a short snake_case product key that ignores brand and pack design, including size where it matters. Use these keys when they fit: petrol_litre, diesel_litre, kerosene_litre, cooking_gas_kg, electricity_kwh, rent_month_1bed, bread_loaf, rice_kg, rice_50kg_bag, beans_kg, garri_kg, flour_kg, sugar_kg, salt_kg, vegetable_oil_litre, palm_oil_litre, milk_litre, eggs_dozen, egg_single, chicken_kg, beef_kg, fish_kg, tomatoes_kg, onions_kg, potatoes_kg, yam_tuber, plantain_bunch, sardine_tin, noodles_pack, spaghetti_pack, water_bottle_75cl, soft_drink_bottle, soap_bar, detergent_kg. Otherwise invent a clear key in the same style.
5. unitPrice is the price of ONE unit as described by canonicalItem, in the receipt's currency (for fuel: price per litre, not the total).
6. Read the store name, address, city and ISO 3166-1 alpha-2 country code if they are printed. Read the receipt date/time if printed (ISO 8601).
7. documentType is one of: receipt, price_tag, fuel_pump, utility_bill, other. category is one of: FUEL, GROCERY, ELECTRICITY, RENT, GENERIC.
8. currency is the ISO 4217 code (NGN, KES, GHS, USD, EUR, ...). Do NOT convert to USD.

Respond with ONLY a JSON object:
{
  "verified": true,
  "fraudSuspected": false,
  "reason": "short explanation",
  "documentType": "receipt",
  "category": "GROCERY",
  "currency": "NGN",
  "total": 4680.00,
  "receiptTimestamp": "2026-10-20T14:32:00",
  "store": { "name": "...", "address": "...", "city": "Lagos", "country": "NG" },
  "items": [
    { "name": "Golden Penny Spaghetti 500g", "canonicalItem": "spaghetti_pack", "quantity": 2, "unitPrice": 950.00 }
  ]
}`;

async function runVisionAudit(imageBase64, category) {
  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`[Vision] Groq ${GROQ_VISION_MODEL} audit for ${category} (attempt ${attempt})`);
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: GROQ_VISION_MODEL,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: `${VISION_PROMPT}\n\nThe user labelled this photo as: ${category}.` },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            ],
          }],
          temperature: 0.1,
          max_tokens: 3072,
        }),
      });
      const data = await res.json();
      if (data.error) {
        if (data.error.code === 'rate_limit_exceeded' || /rate limit/i.test(data.error.message || '')) {
          await new Promise(r => setTimeout(r, 3500));
          lastError = new Error('Rate limit');
          continue;
        }
        throw new Error(`Groq API Error: ${data.error.message}`);
      }
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error('Groq response malformed');

      // Strip reasoning blocks and code fences, then take the outermost JSON object.
      const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim();
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start === -1 || end <= start) throw new Error('No JSON verdict in response');
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch (e) {
      lastError = e;
      console.error(`[Vision] attempt ${attempt} failed: ${e.message}`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw lastError;
}

const CATEGORIES = ['FUEL', 'GROCERY', 'ELECTRICITY', 'RENT', 'GENERIC'];

if (bot) {
  bot.on('photo', async (ctx) => {
  const user     = getOrCreateUser(ctx.from.id);
  const selected = pendingReport.get(ctx.from.id) || 'GROCERY';
  pendingReport.delete(ctx.from.id);

  // Reputation lives on-chain when the program is enabled; the local copy is a cache.
  if (oracle.isEnabled()) {
    const onchain = await oracle.getReporter(user.keypair.publicKey);
    if (onchain) {
      user.reputation = onchain.reputation;
      setReputation(ctx.from.id, onchain.reputation);
    }
  }
  if (isBanned(user.reputation)) {
    return ctx.replyWithHTML(`⛔ <b>Reporting suspended</b>\nYour reputation (${user.reputation}/100) is below the network minimum after repeated slashes.`);
  }

  // Zerion Agent Policy Check: Daily Limit
  const DAILY_LIMIT = 10;
  if (getDailyReportCount(ctx.from.id) >= DAILY_LIMIT) {
    return ctx.replyWithHTML(`⚠️ <b>Policy Violation: Daily Limit Reached</b>\nYour agent is limited to ${DAILY_LIMIT} reports/day.`);
  }

  await ctx.reply('🔍 Image received! Qwen Vision is parsing and auditing your receipt...');

  const { filepath: imagePath, hash: imageHash, base64: imageBase64 } = await saveReportImage(ctx, selected, ctx.from.id);

  // Duplicate data is slashed, not just rejected.
  if (imageHash && isImageDuplicate(imageHash)) {
    const rep = await penalize({
      kind: 'duplicate', telegramId: ctx.from.id, wallet: user.keypair.publicKey, category: selected,
      imagePath, imageHash, feedKey: getFeedKeyForImageHash(imageHash), reason: 'duplicate image',
    });
    return ctx.replyWithHTML(`✂️ <b>Slashed: duplicate data.</b>\nThis exact photo was already submitted.\n⭐ Reputation: ${rep}/100`);
  }

  let audit;
  if (process.env.DEMO_MODE === 'true') {
    console.log('[Vision] 🎥 DEMO MODE: skipping AI, using a fixed sample receipt');
    audit = {
      verified: true, reason: 'Demo mode sample', documentType: 'receipt', category: selected,
      currency: 'USD', total: 5.00, store: { name: 'Demo Store', city: 'Demo', country: 'XX' },
      items: [{ name: 'Demo item', canonicalItem: 'demo_item', quantity: 1, unitPrice: 5.00 }],
    };
  } else {
    try {
      audit = await runVisionAudit(imageBase64, selected);
    } catch (e) {
      console.error('Final Verification Error:', e);
      return ctx.replyWithHTML(`❌ <b>Verification Error:</b> The AI check could not complete. Please try again.`);
    }
  }

  if (!audit?.verified) {
    if (audit?.fraudSuspected) {
      const rep = await penalize({
        kind: 'fake', telegramId: ctx.from.id, wallet: user.keypair.publicKey, category: selected,
        imagePath, imageHash, reason: `fake image: ${String(audit.reason || '').slice(0, 120)}`,
      });
      return ctx.replyWithHTML(`✂️ <b>Slashed: suspected fake.</b>\n${escapeHtml(audit.reason)}\n⭐ Reputation: ${rep}/100`);
    }
    return ctx.replyWithHTML(`❌ <b>Verification Rejection:</b> ${escapeHtml(audit?.reason || 'Invalid data format')}\nPlease submit a real physical data point.`);
  }

  // Convert every priced item to USD at the live FX rate.
  const category = CATEGORIES.includes(audit.category) ? audit.category : selected;
  const currency = String(audit.currency || 'USD').toUpperCase();
  const region = regionFor(audit.store, user.region);
  const observations = [];
  let totalUsd;
  try {
    for (const item of (audit.items || []).slice(0, MAX_ITEMS_PER_REPORT)) {
      const unit = Number(item.unitPrice);
      if (!Number.isFinite(unit) || unit <= 0) continue;
      const key = feedKey(category, region, item.canonicalItem || item.name);
      if (observations.some(o => o.feedKey === key)) continue; // one price per item per photo
      observations.push({
        feedKey: key,
        itemName: String(item.name || item.canonicalItem).slice(0, 80),
        priceUsd: Number((await toUsd(unit, currency)).toFixed(4)),
      });
    }
    const total = Number(audit.total);
    totalUsd = Number.isFinite(total) && total > 0
      ? await toUsd(total, currency)
      : observations.reduce((s, o) => s + o.priceUsd, 0);
  } catch (e) {
    console.error('[FX] conversion failed:', e.message);
    return ctx.replyWithHTML(`❌ <b>Verification Error:</b> Could not convert ${escapeHtml(currency)} prices right now. Please try again shortly.`);
  }

  if (!observations.length) {
    return ctx.replyWithHTML(`❌ <b>Verification Rejection:</b> No readable item prices were found.\nPlease submit a clearer photo.`);
  }

  // File each item with the Solana program: it locks the reward and runs the bounds check.
  let reward = Math.min(rewardFor(user.reputation), AGENT_POLICIES.SPEND_LIMIT_USDC);
  let onchainNote = '';
  if (oracle.isEnabled()) {
    const filed = [];
    let failure = null;
    for (const o of observations.slice(0, MAX_ONCHAIN_ITEMS)) {
      try {
        const res = await oracle.submitReport({
          reporterKeypair: user.keypair, feedKey: o.feedKey, imageHashHex: imageHash, priceUsd: o.priceUsd,
        });
        o.onchainReport = res.report;
        o.rewardUsd = res.rewardUsd;
        filed.push(o);
      } catch (e) {
        failure = e?.error?.errorCode?.code || e.message;
        console.error(`[Oracle] submit_report ${o.feedKey} failed:`, failure);
        if (/PoolExhausted|ReporterBanned/.test(failure)) break;
      }
    }
    if (!filed.length) {
      const why = /PoolExhausted/.test(failure || '') ? 'The reward pool is fully committed right now. Please try again later.'
        : /ReporterBanned/.test(failure || '') ? 'Your on-chain reputation is below the network minimum.'
        : 'The Solana program rejected the submission. Please try again.';
      return ctx.replyWithHTML(`❌ <b>Not filed:</b> ${why}`);
    }
    observations.splice(0, observations.length, ...filed);
    reward = filed.reduce((sum, o) => sum + o.rewardUsd, 0);
    onchainNote = `⛓️ Filed on Solana: ${filed.length} item${filed.length === 1 ? '' : 's'}, each checked by the program.\n`;
  }

  const reportId = savePendingReport({
    telegramId: ctx.from.id, category, totalUsd, reward, imagePath, imageHash, region,
    storeName: audit.store?.name || null, receiptTs: audit.receiptTimestamp || null,
    originalAmount: Number(audit.total) || null, originalCurrency: currency, observations,
  });

  const itemLines = observations.slice(0, 5)
    .map(o => `• ${escapeHtml(o.itemName)} — $${o.priceUsd.toFixed(2)}`)
    .join('\n');
  await ctx.replyWithHTML(
    `🧾 <b>Receipt parsed — report #${reportId}</b>\n` +
    (audit.store?.name ? `🏪 ${escapeHtml(audit.store.name)}${audit.store.city ? `, ${escapeHtml(audit.store.city)}` : ''}\n` : '') +
    (audit.receiptTimestamp ? `🕒 ${escapeHtml(audit.receiptTimestamp)}\n` : '') +
    `🌍 Region: <code>${escapeHtml(region)}</code>\n` +
    `💲 Total: ${escapeHtml(currency)} ${escapeHtml(audit.total)} ≈ $${totalUsd.toFixed(2)}\n\n` +
    `${itemLines}${observations.length > 5 ? `\n…and ${observations.length - 5} more` : ''}\n\n` +
    onchainNote +
    `⏳ <b>Pending consensus.</b> Checking against local price bounds and peer reports.\n` +
    `🔒 Reward locked: <b>$${reward.toFixed(2)} USDC</b> — released when accepted, forfeited if slashed.`,
    MAIN_MENU
  );

  // Settle right away when there is already enough data; peers settle on the timer.
  runSettlement();

});
}


// My Rewards
if (bot) {
  bot.hears('💰 My Rewards', async (ctx) => {
  const user    = getOrCreateUser(ctx.from.id);
  const sol     = await connection.getBalance(user.keypair.publicKey);
  const usdc    = await getUSDC(user.keypair.publicKey);
  const jupusd  = await getJupUSD(user.keypair.publicKey);
  const earned  = getUserTotalEarned(ctx.from.id);
  const pending = getUserPendingLocked(ctx.from.id);
  const onchain = oracle.isEnabled() ? await oracle.getReporter(user.keypair.publicKey) : null;
  if (onchain) {
    user.reputation = onchain.reputation;
    pending.locked = onchain.lockedUsd;
  }

  await ctx.replyWithHTML(
    `<b>💼 Your Signal Portfolio</b>\n\n` +
    `🔑 <code>${user.publicKey}</code>\n\n` +
    `<b>Balances</b>\n` +
    `├ SOL:    ${(sol / LAMPORTS_PER_SOL).toFixed(4)} SOL\n` +
    `├ USDC:   $${usdc.toFixed(2)}\n` +
    `├ jupUSD: $${jupusd.toFixed(2)}\n` +
    `└ Locked: $${pending.locked.toFixed(2)} (${pending.count} report${pending.count === 1 ? '' : 's'} pending consensus)\n\n` +
    `<b>Stats</b>\n` +
    `├ Reputation:    ${user.reputation}/100${onchain ? ' (on-chain)' : ''}\n` +
    `├ Signal Points: ${user.points} PTS\n` +
    `├ Reports:       ${user.reportCount}\n` +
    `├ Region:        ${escapeHtml(user.region || 'not set')}\n` +
    `└ Total Earned:  $${earned.toFixed(2)}\n`,
    Markup.inlineKeyboard([
      [Markup.button.callback('🪐 Auto-stake USDC → jupUSD', 'stake_jupusd')],
      [Markup.button.callback('💸 Withdraw (USDC)', 'withdraw_init'), Markup.button.callback('🏧 Withdraw (jupUSD)', 'withdraw_jup_init')],
      [Markup.button.callback('🏦 Cash Out to Bank', 'cashout_bank')],
      [Markup.button.callback('🚀 Link BOTChain Wallet', 'yellow_link'), Markup.button.callback('🟡 Yellow Wallet', 'yellow_link')],
      [Markup.button.callback('🔑 Export Private Key', 'export_key')]
    ])
  );
});
}

// Jupiter auto-stake: real USDC → jupUSD swap from the user's custodial wallet
if (bot) {
  bot.action('stake_jupusd', async (ctx) => {
  await ctx.answerCbQuery();
  if (IS_SAFE_MODE) {
    return ctx.reply('🛡️ Swaps are disabled until the protocol identity is configured.');
  }
  if (!isMainnet()) {
    return ctx.replyWithHTML(`🪐 <b>jupUSD auto-stake is mainnet-only.</b>\nThis bot is running on Solana devnet, where jupUSD has no liquidity.`);
  }
  const user = getOrCreateUser(ctx.from.id);
  const usdc = await getUSDC(user.keypair.publicKey);
  if (usdc < 0.1) {
    return ctx.reply('⚠️ Minimum $0.10 USDC required to auto-stake.');
  }
  await ctx.replyWithHTML(`⏳ Swapping <b>$${usdc.toFixed(2)} USDC</b> into <b>jupUSD</b> via Jupiter...`);
  try {
    const { signature, outAmount } = await swapUsdcToJupUsd(user.keypair, usdc);
    await ctx.replyWithHTML(
      `✅ <b>Auto-stake complete</b>\n\n` +
      `🪐 Received: <b>${outAmount.toFixed(4)} jupUSD</b>\n` +
      `📝 <a href="https://solscan.io/tx/${signature}">${signature.slice(0, 16)}...</a>`
    );
  } catch (e) {
    console.error('[Jupiter] swap failed:', e.message);
    await ctx.replyWithHTML(`❌ <b>Swap failed:</b> ${escapeHtml(e.message)}\nNo funds were moved.`);
  }
});
}

// Withdrawal Prompt Actions
if (bot) {
  bot.action('withdraw_init', async (ctx) => {
  pendingReport.set(ctx.from.id, 'AWAITING_ADDRESS');
  await ctx.answerCbQuery();
  await ctx.replyWithHTML(
    `💸 <b>Withdraw USDC</b>\n\n` +
    `Reply to this message by pasting your Solana wallet address (e.g., Phantom or Solflare) to receive your USDC.`
  );
});

  bot.action('withdraw_jup_init', async (ctx) => {
  pendingReport.set(ctx.from.id, 'AWAITING_ADDRESS_JUP');
  await ctx.answerCbQuery();
  await ctx.replyWithHTML(
    `🏧 <b>Withdraw jupUSD</b>\n\n` +
    `Paste your Solana wallet address to receive your jupUSD.`
  );
});
}

// Region: lets reports without a printed store city still join a local feed
if (bot) {
  bot.hears('📍 Set My City', async (ctx) => {
  pendingReport.set(ctx.from.id, 'AWAITING_CITY');
  await ctx.replyWithHTML(
    `📍 <b>Set your city</b>\n\n` +
    `Send your country code and city, e.g. <code>NG Lagos</code> or <code>KE Nairobi</code>.\n` +
    `<i>Used for price feeds when a receipt doesn't print the store's city.</i>`
  );
});
}

// Cash Out to Bank Action
if (bot) {
  bot.action('cashout_bank', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.replyWithHTML(
    `🏦 <b>Cash Out to Bank Account</b>\n\n` +
    `To convert your earned USDC directly into cash in your local bank account:\n\n` +
    `<b>1. Create an Exchange Account</b>\n` +
    `Sign up for a platform like <b>Coinbase</b> or <b>Binance</b> and link your bank account.\n\n` +
    `<b>2. Get Your Solana Deposit Address</b>\n` +
    `In the exchange app, tap "Receive" or "Deposit", select <b>USDC</b>, and make SURE to select the <b>Solana Network</b>.\n\n` +
    `<b>3. Withdraw from Signal Bot</b>\n` +
    `Copy that address, click <i>"💸 Withdraw to Wallet"</i> in this bot, and paste the address.\n\n` +
    `<i>Once the USDC hits your exchange, you can instantly sell it for USD/fiat and withdraw to your bank!</i>`
  );
});
}

// Export Private Key Action
if (bot) {
  bot.action('export_key', async (ctx) => {
  const user = getOrCreateUser(ctx.from.id);
  const privateKeyBase58 = bs58.encode(user.keypair.secretKey);

  await ctx.answerCbQuery();
  await ctx.replyWithHTML(
    `⚠️ <b>SECURITY WARNING</b>\n` +
    `Never share this key with anyone. Anyone with this key controls your funds.\n\n` +
    `<b>Your Private Key:</b>\n<code>${privateKeyBase58}</code>\n\n` +
    `<i>New to crypto?</i> To use your USDC in the real world:\n` +
    `1. Download the Jupiter Mobile App or Phantom.\n` +
    `2. Select "Import Private Key" and paste the code above.\n` +
    `3. Use Solana Pay at checkout or swap your USDC for fiat!`
  );
});
}

// Leaderboard
if (bot) {
  bot.hears('🏆 Leaderboard', async (ctx) => {
  const sorted = getLeaderboard(5);
  const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];

  const rows = sorted.length
    ? sorted.map((u, i) =>
        `${medals[i]} ${u.telegramId === ctx.from.id ? '<b>You</b>' : 'Signaler'} — ${u.points} PTS  (${u.reports} reports)`
      ).join('\n')
    : 'No reports yet — be the first! 📸';

  await ctx.replyWithHTML(
    `<b>🏆 Signal Leaderboard</b>\n\n${rows}`,
    MAIN_MENU
  );
});
}

// ── Yellow Channel Handler ───────────────────────────────────────────────────
if (bot) {
  bot.hears('🟡 Yellow Channel', async (ctx) => {
    const userId = ctx.from.id;
    const evmAddress = getYellowLink(userId);
    const status = getYellowStatus();

    if (!status.online) {
      return ctx.replyWithHTML(
        `🟡 <b>Yellow Network</b>\n\n` +
        `⚠️ Yellow settlement rail is <b>offline</b>.\n` +
        `The protocol owner needs to configure Yellow private keys.\n\n` +
        `<i>Network: ${status.network} · Node: ${status.nitronodeURL}</i>`
      );
    }

    const pending = evmAddress ? getPendingYellowBalance(evmAddress) : 0;

    await ctx.replyWithHTML(
      `🟡 <b>Yellow Network Channel</b>\n\n` +
      `Status: <b>🟢 Online</b>\n` +
      `Network: <b>${status.network}</b>\n` +
      `Asset: <b>${status.asset.toUpperCase()}</b>\n\n` +
      (evmAddress
        ? `🔗 <b>Linked EVM Wallet:</b>\n<code>${evmAddress}</code>\n\n` +
          `💰 <b>Pending Credits:</b> $${pending.toFixed(4)} USDC\n` +
          `<i>(settled off-chain via state channels)</i>`
        : `🔗 <b>No EVM wallet linked yet.</b>\n` +
          `Link your EVM address to receive rewards via Yellow state channels!`
      ),
      Markup.inlineKeyboard([
        evmAddress
          ? [Markup.button.callback('🔄 Change EVM Wallet', 'yellow_link')]
          : [Markup.button.callback('🔗 Link EVM Wallet', 'yellow_link')],
      ])
    );
  });
}

if (bot) {
  bot.hears('🚀 BOTChain Hub', async (ctx) => {
    const evmAddress = getYellowLink(ctx.from.id);
    await ctx.replyWithHTML(
      `🚀 <b>BOTChain Network Hub</b>\n\n` +
      `Oracle writes: <b>${isOracleConfigured() ? '🟢 enabled' : '🔴 not configured'}</b>\n` +
      `Chain ID: <b>677 (BOTChain)</b>\n` +
      `RPC URL: <code>https://rpc.botchain.ai</code>\n\n` +
      `📜 <b>SignalOracle Contract:</b>\n` +
      `<code>${ORACLE_ADDRESS}</code>\n\n` +
      (evmAddress
        ? `🔗 <b>Linked Wallet:</b>\n<code>${evmAddress}</code>`
        : `💡 <i>Link your EVM wallet address to receive multi-rail BOTChain micro-settlements!</i>`
      ),
      Markup.inlineKeyboard([
        [Markup.button.url('🔍 View Explorer Contract', `https://scan.botchain.ai/address/${ORACLE_ADDRESS}`)],
        [Markup.button.callback(evmAddress ? '🔄 Change EVM Wallet' : '🔗 Link BOTChain / EVM Wallet', 'yellow_link')]
      ])
    );
  });
}

if (bot) {
  bot.hears('🌐 Network Status', async (ctx) => {
    const stats = getNetworkStats();
    const [onChainReports, onChainFeeds, solReports, pool] = await Promise.all([
      getReportCount(), getFeedCount(),
      oracle.isEnabled() ? oracle.reportCount() : null,
      oracle.isEnabled() ? oracle.poolBalance() : null,
    ]);
    const pid = oracle.programId()?.toBase58();
    await ctx.replyWithHTML(
      `🌐 <b>Signal Network Status</b>\n\n` +
      (pid
        ? `<b>◎ Solana program (consensus)</b>\n` +
          `├ Reports filed: ${solReports ?? 'n/a'}\n` +
          `├ Reward pool: ${pool === null ? 'n/a' : `$${pool.toFixed(2)} USDC`}\n` +
          `└ Program: <a href="https://explorer.solana.com/address/${pid}?cluster=devnet">${pid.slice(0, 6)}...${pid.slice(-4)}</a>\n\n`
        : '') +
      `<b>Consensus</b>\n` +
      `├ Signalers: ${stats.signalers}\n` +
      `├ Accepted: ${stats.acceptedReports}\n` +
      `├ Pending: ${stats.pendingReports}\n` +
      `├ Slashed: ${stats.slashedReports}\n` +
      `└ Rewards paid: $${stats.totalVolume.toFixed(2)} USDC\n\n` +
      `<b>🚀 BOTChain mirror (Chain ID 677)</b>\n` +
      `├ Status: ${onChainReports === null ? '🔴 Unreachable' : '🟢 Online'}\n` +
      `├ On-chain reports: ${onChainReports ?? 'n/a'}\n` +
      `├ Price feeds: ${onChainFeeds ?? 'n/a'}\n` +
      `└ Oracle Contract: <code>${ORACLE_ADDRESS.slice(0, 6)}...${ORACLE_ADDRESS.slice(-4)}</code>`,
      MAIN_MENU
    );
  });
}

// Yellow: Link EVM wallet action
if (bot) {
  bot.action('yellow_link', async (ctx) => {
    await ctx.answerCbQuery();
    pendingReport.set(ctx.from.id, 'AWAITING_EVM_ADDRESS');
    await ctx.replyWithHTML(
      `🟡 <b>Link Your EVM Wallet</b>\n\n` +
      `Paste your EVM wallet address (e.g. from MetaMask, Rainbow, or any Ethereum wallet).\n\n` +
      `<i>Your Signal oracle rewards will be credited to this address via Yellow state channels — instantly and gaslessly.</i>`
    );
  });
}

// Fallback
if (bot) {
  bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();

  // Yellow EVM address linking flow
  if (pendingReport.get(ctx.from.id) === 'AWAITING_EVM_ADDRESS') {
    pendingReport.delete(ctx.from.id);
    // Basic EVM address validation (0x + 40 hex chars)
    if (/^0x[0-9a-fA-F]{40}$/.test(text)) {
      saveYellowLink(ctx.from.id, text);
      await ctx.replyWithHTML(
        `✅ <b>EVM Wallet Linked!</b>\n\n` +
        `🟡 Address: <code>${text}</code>\n\n` +
        `Your next verified report will be credited via <b>Yellow state channels</b> as a bonus settlement option.\n\n` +
        `<i>Powered by Nitrolite · Yellow Network</i>`,
        MAIN_MENU
      );
    } else {
      await ctx.replyWithHTML(
        `❌ <b>Invalid EVM address.</b>\n\nMake sure it starts with <code>0x</code> and is 42 characters long.`,
        MAIN_MENU
      );
    }
    return;
  }

  // Region setting flow
  if (pendingReport.get(ctx.from.id) === 'AWAITING_CITY') {
    pendingReport.delete(ctx.from.id);
    const m = text.match(/^([A-Za-z]{2})[\s,]+(.+)$/);
    if (!m || !slug(m[2])) {
      await ctx.replyWithHTML(`❌ Use a 2-letter country code then the city, e.g. <code>NG Lagos</code>.`, MAIN_MENU);
      return;
    }
    const region = `${m[1].toLowerCase()}-${slug(m[2])}`;
    getOrCreateUser(ctx.from.id);
    setUserRegion(ctx.from.id, region);
    await ctx.replyWithHTML(`✅ Region set to <code>${region}</code>.`, MAIN_MENU);
    return;
  }

  // Withdraw flow: user pastes a Solana address (USDC or jupUSD)
  const awaiting = pendingReport.get(ctx.from.id);
  if (text.startsWith('/withdraw') || awaiting === 'AWAITING_ADDRESS' || awaiting === 'AWAITING_ADDRESS_JUP') {
    const user    = getOrCreateUser(ctx.from.id);
    const address = text.replace('/withdraw', '').trim();
    const isJup   = awaiting === 'AWAITING_ADDRESS_JUP';
    const mint    = isJup ? new PublicKey(JUP_USD_MINT) : mintPubkey;
    const symbol  = isJup ? 'jupUSD' : 'USDC';

    // No address yet — ask for it
    if (!address || address.length < 32) {
      pendingReport.set(ctx.from.id, isJup ? 'AWAITING_ADDRESS_JUP' : 'AWAITING_ADDRESS');
      await ctx.replyWithHTML(
        `💸 <b>Withdraw ${symbol}</b>\n\n` +
        `Send your Solana wallet address to receive your ${symbol}.\n` +
        `<i>Make sure it's a valid Solana public key.</i>`
      );
      return;
    }

    pendingReport.delete(ctx.from.id);

    try {
      const destPubkey = new PublicKey(address);
      const balance = await getTokenBalance(user.keypair.publicKey, mint);

      if (balance < 0.01) {
        await ctx.reply(`⚠️ You need at least 0.01 ${symbol} to withdraw. Keep reporting!`);
        return;
      }

      await ctx.reply(`⏳ Sending ${balance.toFixed(2)} ${symbol} to ${address.slice(0,8)}...`);
      const sig = await sendToken(user.keypair, destPubkey, balance, mint);

      await ctx.replyWithHTML(
        `✅ <b>Withdrawal Complete!</b>\n\n` +
        `💸 Sent: <b>${balance.toFixed(2)} ${symbol}</b>\n` +
        `📍 To: <code>${address}</code>\n` +
        `📝 <a href="https://solscan.io/tx/${sig}${isMainnet() ? '' : '?cluster=devnet'}">View transaction</a>`,
        MAIN_MENU
      );
    } catch (e) {
      await ctx.reply(`❌ Invalid address or transfer failed: ${e.message}`);
    }
    return;
  }

  await ctx.reply('Use the menu below 👇', MAIN_MENU);
});
}

// ─── Express API (consumed by the dashboard) ─────────────────────────────────
const api = express();
api.use(cors());
api.use(express.json());

api.get('/api/stats', async (req, res) => {
  const stats = getNetworkStats();
  const [onChainReports, onChainFeeds, solReports, pool] = await Promise.all([
    getReportCount(), getFeedCount(),
    oracle.isEnabled() ? oracle.reportCount() : null,
    oracle.isEnabled() ? oracle.poolBalance() : null,
  ]);
  res.json({
    activeNodes:     stats.signalers,
    totalReports:    stats.totalReports,
    acceptedReports: stats.acceptedReports,
    pendingReports:  stats.pendingReports,
    slashedReports:  stats.slashedReports,
    totalVolume:     stats.totalVolume.toFixed(2),
    signalers:       stats.signalers,
    solanaProgram:   oracle.programId()?.toBase58() ?? null,
    solanaReports:   solReports,
    rewardPoolUsdc:  pool,
    onChainReports,
    onChainFeeds,
    oracleContract:  ORACLE_ADDRESS,
    rpcUrl:          RPC_URL,
    usdcMint:        USDC_MINT,
  });
});

// Price feeds. With the Solana program enabled these are read from chain (Feed accounts);
// feed ids are hashes, so names come from the keys this bot has filed.
api.get('/api/feeds', async (req, res) => {
  if (oracle.isEnabled()) {
    try {
      const names = new Map(getAllFeedKeys().map(k => [oracle.feedIdHex(k), k]));
      const feeds = await oracle.listFeeds();
      return res.json(feeds.map(f => ({
        feed: names.get(f.feedIdHex) || f.feedIdHex,
        medianUsd: f.medianUsd,
        samples: f.samples,
        updatedAt: f.updatedAt ? new Date(f.updatedAt * 1000).toISOString() : null,
        account: f.address,
        source: 'solana',
      })));
    } catch (e) {
      console.error('[Oracle] listFeeds failed:', e.message);
    }
  }
  res.json(getFeedsSummary(RULES.BOUNDS_WINDOW_DAYS).map(f => ({
    feed: f.feed_key,
    medianUsd: Number((median(getAcceptedFeedPrices(f.feed_key, RULES.BOUNDS_WINDOW_DAYS)) ?? 0).toFixed(4)),
    samples: f.samples,
    updatedAt: f.updated_at,
  })));
});

api.get('/api/leaderboard', (req, res) => {
  res.json(getLeaderboard(10));
});

api.get('/api/reports', (req, res) => {
  res.json(getRecentReports(20));
});

const PORT = process.env.PORT || 3001;
api.listen(PORT, '0.0.0.0', () => {
  console.log(`📡 Signal API is ONLINE and listening on port ${PORT}`);
});

// ── Yellow Network stats API endpoint ─────────────────────────────────────────
api.get('/api/yellow-status', (req, res) => {
  res.json(getYellowStatus());
});

// ─── Launch ───────────────────────────────────────────────────────────────────
async function main() {
  // Boot Yellow Network in parallel — non-blocking, graceful degradation
  initYellow().then(online => {
    if (online) {
      console.log('🟡 [Yellow] State channel settlement rail ACTIVE');
    } else {
      console.log('🟡 [Yellow] Rail offline — set YELLOW_USER_PRIVATE_KEY to enable');
    }
  });

  // Consensus: settle pending reports as peer data arrives and timeouts pass
  setInterval(runSettlement, SETTLE_INTERVAL_MS);

  if (!bot) {
    console.warn('📡 [API] Starting Express API ONLY (Bot Token Missing)...');
    return;
  }
  try {
    await bot.telegram.deleteWebhook({ drop_pending_updates: true });
    console.log('✅ Webhook cleared');
    await bot.telegram.getMe().then(me => {
      console.log(`🚀 Signal Bot LIVE as @${me.username}`);
      console.log('📱 Go send /start on Telegram!');
    });
    bot.launch();
  } catch (e) {
    console.error('❌ Bot Launch failed:', e.message);
    console.warn('📡 [API] Falling back to Express API stability mode...');
  }
}

main();

process.once('SIGINT',  () => bot?.stop('SIGINT'));
process.once('SIGTERM', () => bot?.stop('SIGTERM'));
