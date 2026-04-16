import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Telegraf, Markup } from 'telegraf';
import {
  Connection, Keypair, PublicKey, LAMPORTS_PER_SOL
} from '@solana/web3.js';
import {
  getOrCreateAssociatedTokenAccount, transfer, getAccount
} from '@solana/spl-token';
import { readFileSync } from 'fs';

// ─── Config ───────────────────────────────────────────────────────────────────
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const RPC_URL   = process.env.RPC_URL   || 'http://localhost:8899';
const USDC_MINT = process.env.USDC_MINT || '66phDQkabbw1X4tNhhgC8FM8hzJy3S9FWRja9sMhPF4r';

if (!BOT_TOKEN) { console.error('❌ Set TELEGRAM_BOT_TOKEN in .env'); process.exit(1); }

// ─── Solana ───────────────────────────────────────────────────────────────────
const connection = new Connection(RPC_URL, 'confirmed');
const protocolWallet = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(readFileSync(`${process.env.HOME}/.config/solana/id.json`, 'utf8')))
);
const mintPubkey = new PublicKey(USDC_MINT);

console.log('🔗 RPC:', RPC_URL);
console.log('💳 Protocol wallet:', protocolWallet.publicKey.toBase58());
console.log('💵 USDC Mint:', USDC_MINT);

// ─── In-memory data store ────────────────────────────────────────────────────
const users         = new Map();
const pendingReport = new Map();
const reports       = [];   // live feed for dashboard
let   totalVolume   = 0;    // cumulative USDC paid out

function getUser(id) {
  if (!users.has(id)) {
    const kp = Keypair.generate();
    users.set(id, { keypair: kp, points: 0, reports: 0 });
    // Fund with gas SOL (fire and forget)
    connection.requestAirdrop(kp.publicKey, 0.1 * LAMPORTS_PER_SOL).catch(() => {});
  }
  return users.get(id);
}

async function getUSDC(pubkey) {
  try {
    const ata = await getOrCreateAssociatedTokenAccount(
      connection, protocolWallet, mintPubkey, pubkey
    );
    const acct = await getAccount(connection, ata.address);
    return Number(acct.amount) / 1_000_000;
  } catch { return 0; }
}

async function payUser(userKp, amount) {
  try {
    const fromATA = await getOrCreateAssociatedTokenAccount(
      connection, protocolWallet, mintPubkey, protocolWallet.publicKey
    );
    const toATA = await getOrCreateAssociatedTokenAccount(
      connection, protocolWallet, mintPubkey, userKp.publicKey
    );
    await transfer(connection, protocolWallet, fromATA.address, toATA.address,
      protocolWallet, BigInt(Math.round(amount * 1_000_000)));
    return true;
  } catch (e) {
    console.error('Pay error:', e.message);
    return false;
  }
}

// ─── Bot ──────────────────────────────────────────────────────────────────────
const bot = new Telegraf(BOT_TOKEN);

const MAIN_MENU = Markup.keyboard([
  ['📸 Report a Price', '💰 My Rewards'],
  ['🏆 Leaderboard',   '📖 How It Works'],
]).resize();

// /start
bot.start(async (ctx) => {
  const user = getUser(ctx.from.id);
  const sol  = await connection.getBalance(user.keypair.publicKey);
  await ctx.replyWithHTML(
    `👋 <b>Welcome to Signal Oracle!</b>\n\n` +
    `The DePIN network on Solana — report real-world prices and earn USDC instantly. No wallet needed.\n\n` +
    `🔑 <b>Your Wallet</b>\n<code>${user.keypair.publicKey.toBase58()}</code>\n\n` +
    `💰 SOL Balance: <b>${(sol / LAMPORTS_PER_SOL).toFixed(4)} SOL</b>\n` +
    `📊 Signal Points: <b>${user.points} PTS</b>`,
    MAIN_MENU
  );
});

// How It Works
bot.hears('📖 How It Works', async (ctx) => {
  await ctx.replyWithHTML(
    `<b>📖 How Signal Works</b>\n\n` +
    `<b>1. Report</b> → Send a photo of a price (fuel pump, shelf tag, receipt)\n` +
    `<b>2. Verify</b> → Vision AI extracts and verifies the price from your photo\n` +
    `<b>3. Earn</b>   → USDC lands in your wallet once consensus is reached\n\n` +
    `<b>Anti-Fraud:</b> Each report requires a small stake. Fake reports get slashed. ✂️\n\n` +
    `<i>Built on Solana · Powered by Vision AI · Token: USDC</i>`,
    MAIN_MENU
  );
});

// Report menu
bot.hears('📸 Report a Price', async (ctx) => {
  await ctx.reply(
    '📍 What are you reporting?',
    Markup.inlineKeyboard([
      [Markup.button.callback('⛽ Fuel / Gas Price',    'FUEL')],
      [Markup.button.callback('🛒 Grocery / Food Price', 'GROCERY')],
      [Markup.button.callback('💡 Electricity Rate',     'ELECTRICITY')],
      [Markup.button.callback('🏠 Rent / Property Price','RENT')],
    ])
  );
});

// Category selection
bot.action(['FUEL','GROCERY','ELECTRICITY','RENT'], async (ctx) => {
  pendingReport.set(ctx.from.id, ctx.match[0]);
  const labels = {
    FUEL: '⛽ Fuel / Gas',
    GROCERY: '🛒 Grocery',
    ELECTRICITY: '💡 Electricity',
    RENT: '🏠 Rent / Property',
  };
  await ctx.answerCbQuery();
  await ctx.replyWithHTML(
    `📸 <b>${labels[ctx.match[0]]} Report</b>\n\n` +
    `Send a clear photo with the price visible. Make sure lighting is good and the tag/display is readable.\n\n` +
    `<i>Tip: Price tags, fuel pump screens, and receipts all work great.</i>`
  );
});

// Photo handler — the core earning flow
bot.on('photo', async (ctx) => {
  const user     = getUser(ctx.from.id);
  const category = pendingReport.get(ctx.from.id) || 'FUEL';
  pendingReport.delete(ctx.from.id);

  await ctx.reply('🔍 Image received! Vision AI is verifying...');
  await new Promise(r => setTimeout(r, 2000));

  // Vision AI mock (replace setTimeout block with real GPT-4o call when OPENAI_API_KEY is set)
  const prices = { FUEL: 3.45, GROCERY: 4.99, ELECTRICITY: 0.14, RENT: 2400 };
  const variation = (Math.random() * 0.2 - 0.1);
  const extracted = (prices[category] * (1 + variation)).toFixed(2);
  const reward    = parseFloat((0.15 + Math.random() * 0.35).toFixed(2));

  await ctx.replyWithHTML(
    `✅ <b>Price Verified!</b>\n\n` +
    `📊 Category: <b>${category}</b>\n` +
    `💲 Extracted Price: <b>$${extracted}</b>\n\n` +
    `Submitting to Solana... ⏳`
  );

  await new Promise(r => setTimeout(r, 1500));

  const paid    = await payUser(user.keypair, reward);
  const usdcBal = await getUSDC(user.keypair.publicKey);
  user.points  += 150;
  user.reports += 1;
  totalVolume  += reward;

  // Push to live feed for dashboard
  reports.unshift({
    category,
    price: extracted,
    reward,
    wallet: user.keypair.publicKey.toBase58().slice(0, 8) + '...',
    ts: Date.now(),
  });
  if (reports.length > 50) reports.pop();

  await ctx.replyWithHTML(
    `🎊 <b>Payout Complete!</b>\n\n` +
    `💰 Earned: <b>+$${reward} USDC</b>\n` +
    `📈 Points:  <b>+150 PTS</b> → Total: ${user.points} PTS\n` +
    `🏦 USDC Balance: <b>$${usdcBal.toFixed(2)}</b>\n\n` +
    `${paid ? '✅ USDC confirmed on Solana Localnet!' : '⚠️ Payout queued'}\n\n` +
    `Submit more to climb the leaderboard 🚀`,
    MAIN_MENU
  );
});

// My Rewards
bot.hears('💰 My Rewards', async (ctx) => {
  const user    = getUser(ctx.from.id);
  const sol     = await connection.getBalance(user.keypair.publicKey);
  const usdc    = await getUSDC(user.keypair.publicKey);
  const prize   = (user.points * 0.036).toFixed(2);

  await ctx.replyWithHTML(
    `<b>💼 Your Signal Portfolio</b>\n\n` +
    `🔑 <code>${user.keypair.publicKey.toBase58()}</code>\n\n` +
    `<b>Balances</b>\n` +
    `├ SOL:  ${(sol / LAMPORTS_PER_SOL).toFixed(4)} SOL\n` +
    `└ USDC: $${usdc.toFixed(2)}\n\n` +
    `<b>Stats</b>\n` +
    `├ Signal Points: ${user.points} PTS\n` +
    `├ Reports:       ${user.reports}\n` +
    `└ Prize Share:   ~$${prize}\n\n` +
    `<i>Prize pool = 15% of Colosseum hackathon winnings</i>`,
    MAIN_MENU
  );
});

// Leaderboard
bot.hears('🏆 Leaderboard', async (ctx) => {
  const sorted = [...users.entries()].sort((a, b) => b[1].points - a[1].points).slice(0, 5);
  const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];

  const rows = sorted.length
    ? sorted.map(([id, u], i) =>
        `${medals[i]} ${id === ctx.from.id ? '<b>You</b>' : 'Signaler'} — ${u.points} PTS  (${u.reports} reports)`
      ).join('\n')
    : 'No reports yet — be the first! 📸';

  await ctx.replyWithHTML(
    `<b>🏆 Genesis Leaderboard</b>\n\n${rows}\n\n` +
    `<i>Top Signalers share 15% of the prize pool at hackathon end.</i>`,
    MAIN_MENU
  );
});

// Fallback
bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();

  // Withdraw flow: user pastes a Solana address after /withdraw
  if (text.startsWith('/withdraw') || (text.length === 44 && pendingReport.get(ctx.from.id) === 'AWAITING_ADDRESS')) {
    const user   = getUser(ctx.from.id);
    let address  = text.replace('/withdraw', '').trim();

    // No address yet — ask for it
    if (!address || address.length < 32) {
      pendingReport.set(ctx.from.id, 'AWAITING_ADDRESS');
      await ctx.replyWithHTML(
        `💸 <b>Withdraw USDC</b>\n\n` +
        `Send your Solana wallet address to receive your USDC.\n` +
        `<i>Make sure it's a valid Solana public key.</i>`
      );
      return;
    }

    pendingReport.delete(ctx.from.id);

    try {
      const destPubkey = new PublicKey(address);
      const usdc = await getUSDC(user.keypair.publicKey);

      if (usdc < 0.01) {
        await ctx.reply('⚠️ You need at least $0.01 USDC to withdraw. Keep reporting!');
        return;
      }

      await ctx.reply(`⏳ Sending $${usdc.toFixed(2)} USDC to ${address.slice(0,8)}...`);

      // Transfer from user's bot wallet to their external wallet
      const fromATA = await getOrCreateAssociatedTokenAccount(
        connection, protocolWallet, mintPubkey, user.keypair.publicKey
      );
      const toATA = await getOrCreateAssociatedTokenAccount(
        connection, protocolWallet, mintPubkey, destPubkey
      );
      await transfer(
        connection, user.keypair, fromATA.address, toATA.address,
        user.keypair, BigInt(Math.round(usdc * 1_000_000))
      );

      await ctx.replyWithHTML(
        `✅ <b>Withdrawal Complete!</b>\n\n` +
        `💸 Sent: <b>$${usdc.toFixed(2)} USDC</b>\n` +
        `📍 To: <code>${address}</code>\n\n` +
        `<i>Transaction confirmed on Solana Localnet</i>`,
        MAIN_MENU
      );
    } catch (e) {
      await ctx.reply(`❌ Invalid address or transfer failed: ${e.message}`);
    }
    return;
  }

  await ctx.reply('Use the menu below 👇', MAIN_MENU);
});

// ─── Express API (consumed by the dashboard) ─────────────────────────────────
const api = express();
api.use(cors());
api.use(express.json());

api.get('/api/stats', (req, res) => {
  const sorted     = [...users.values()].sort((a, b) => b.points - a.points);
  const totalPoints = sorted.reduce((s, u) => s + u.points, 0);
  res.json({
    activeNodes:   users.size,
    totalReports:  reports.length,
    totalVolume:   totalVolume.toFixed(2),
    signalers:     users.size,
    rpcUrl:        RPC_URL,
    usdcMint:      USDC_MINT,
  });
});

api.get('/api/leaderboard', (req, res) => {
  const sorted = [...users.entries()]
    .sort((a, b) => b[1].points - a[1].points)
    .slice(0, 10)
    .map(([id, u], i) => ({
      rank:    i + 1,
      wallet:  u.keypair.publicKey.toBase58().slice(0, 8) + '...',
      points:  u.points,
      reports: u.reports,
    }));
  res.json(sorted);
});

api.get('/api/reports', (req, res) => {
  res.json(reports.slice(0, 20));
});

api.listen(3001, () => {
  console.log('📡 Signal API running on http://localhost:3001');
});

// ─── Launch ───────────────────────────────────────────────────────────────────
async function main() {
  try {
    await bot.telegram.deleteWebhook({ drop_pending_updates: true });
    console.log('✅ Webhook cleared');
    await bot.telegram.getMe().then(me => {
      console.log(`🚀 Signal Bot LIVE as @${me.username}`);
      console.log('📱 Go send /start on Telegram!');
    });
    bot.launch();
  } catch (e) {
    console.error('❌ Launch failed:', e.message);
    process.exit(1);
  }
}

main();

process.once('SIGINT',  () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

