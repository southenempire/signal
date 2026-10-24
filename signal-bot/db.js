import Database from 'better-sqlite3';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { Keypair } from '@solana/web3.js';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

// ─── Config ───────────────────────────────────────────────────────────────────
const DB_PATH    = process.env.DB_PATH || './data/signal.db';
const SECRET_KEY = process.env.SECRET_KEY;

if (!SECRET_KEY) {
  console.error('❌ Set SECRET_KEY in .env (32+ char string for wallet encryption)');
  process.exit(1);
}

// Derive a 32-byte AES key from the secret
const AES_KEY = scryptSync(SECRET_KEY, 'signal-bot-salt', 32);

// ─── Init DB ──────────────────────────────────────────────────────────────────
mkdirSync(dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');   // better concurrent read perf
db.pragma('busy_timeout = 5000');

// ─── Schema Migration ────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    telegram_id   INTEGER PRIMARY KEY,
    public_key    TEXT NOT NULL,
    encrypted_sk  TEXT NOT NULL,
    iv            TEXT NOT NULL,
    points        INTEGER DEFAULT 0,
    report_count  INTEGER DEFAULT 0,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS reports (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id   INTEGER NOT NULL,
    category      TEXT NOT NULL,
    price         REAL NOT NULL,
    reward        REAL NOT NULL,
    image_path    TEXT,
    latitude      REAL,
    longitude     REAL,
    verified      BOOLEAN DEFAULT 1,
    image_hash    TEXT,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
  );

  CREATE TABLE IF NOT EXISTS payouts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id   INTEGER NOT NULL,
    amount        REAL NOT NULL,
    tx_signature  TEXT,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
  );

  CREATE TABLE IF NOT EXISTS yellow_links (
    telegram_id   INTEGER PRIMARY KEY,
    evm_address   TEXT NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS yellow_credits (
    evm_address   TEXT PRIMARY KEY,
    amount        REAL DEFAULT 0,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- One row per priced line item on a report; these feed consensus and the price feeds.
  CREATE TABLE IF NOT EXISTS observations (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id     INTEGER NOT NULL,
    telegram_id   INTEGER NOT NULL,
    feed_key      TEXT NOT NULL,
    item_name     TEXT,
    price_usd     REAL NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id)
  );

  CREATE INDEX IF NOT EXISTS idx_reports_telegram ON reports(telegram_id);
  CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);
  CREATE INDEX IF NOT EXISTS idx_payouts_telegram ON payouts(telegram_id);
  CREATE INDEX IF NOT EXISTS idx_obs_feed ON observations(feed_key, status, created_at);
  CREATE INDEX IF NOT EXISTS idx_obs_report ON observations(report_id);
`);

// Additive column migrations for databases created before consensus existed.
// Existing reports were paid immediately, so they default to 'accepted'.
function addColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  if (!cols.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
addColumn('users', 'reputation', 'INTEGER DEFAULT 50');
addColumn('users', 'region', 'TEXT');
addColumn('reports', 'status', "TEXT DEFAULT 'accepted'");
addColumn('reports', 'region', 'TEXT');
addColumn('reports', 'store_name', 'TEXT');
addColumn('reports', 'receipt_ts', 'TEXT');
addColumn('reports', 'original_amount', 'REAL');
addColumn('reports', 'original_currency', 'TEXT');
addColumn('reports', 'decision_note', 'TEXT');
addColumn('reports', 'payout_tx', 'TEXT');
addColumn('reports', 'chain_tx', 'TEXT');
addColumn('reports', 'settled_at', 'DATETIME');
addColumn('observations', 'onchain_report', 'TEXT');
db.exec('CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status)');
db.exec('CREATE INDEX IF NOT EXISTS idx_obs_onchain ON observations(onchain_report)');

console.log('✅ Database initialised at', DB_PATH);

// ─── Encryption helpers ──────────────────────────────────────────────────────
function encryptSecretKey(secretKeyBytes) {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', AES_KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(secretKeyBytes)),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return {
    encrypted: Buffer.concat([encrypted, authTag]).toString('base64'),
    iv: iv.toString('base64'),
  };
}

function decryptSecretKey(encryptedB64, ivB64) {
  const iv = Buffer.from(ivB64, 'base64');
  const data = Buffer.from(encryptedB64, 'base64');
  // Last 16 bytes = auth tag
  const authTag = data.subarray(data.length - 16);
  const encrypted = data.subarray(0, data.length - 16);
  const decipher = createDecipheriv('aes-256-gcm', AES_KEY, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return new Uint8Array(decrypted);
}

// ─── Prepared statements ─────────────────────────────────────────────────────
const stmts = {
  getUser:        db.prepare('SELECT * FROM users WHERE telegram_id = ?'),
  insertUser:     db.prepare('INSERT INTO users (telegram_id, public_key, encrypted_sk, iv) VALUES (?, ?, ?, ?)'),
  updatePoints:   db.prepare('UPDATE users SET points = points + ?, report_count = report_count + 1 WHERE telegram_id = ?'),
  insertReport:   db.prepare('INSERT INTO reports (telegram_id, category, price, reward, image_path, image_hash) VALUES (?, ?, ?, ?, ?, ?)'),
  checkHash:      db.prepare('SELECT 1 FROM reports WHERE image_hash = ? LIMIT 1'),
  insertPayout:   db.prepare('INSERT INTO payouts (telegram_id, amount, tx_signature) VALUES (?, ?, ?)'),
  getLeaderboard: db.prepare('SELECT telegram_id, public_key, points, report_count FROM users ORDER BY points DESC LIMIT ?'),
  getReports:     db.prepare('SELECT r.*, u.public_key FROM reports r JOIN users u ON r.telegram_id = u.telegram_id ORDER BY r.created_at DESC LIMIT ?'),
  getStats:       db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM users) as signalers,
      (SELECT COUNT(*) FROM reports) as totalReports,
      (SELECT COUNT(*) FROM reports WHERE status = 'accepted') as acceptedReports,
      (SELECT COUNT(*) FROM reports WHERE status = 'pending') as pendingReports,
      (SELECT COUNT(*) FROM reports WHERE status = 'slashed') as slashedReports,
      (SELECT COALESCE(SUM(amount), 0) FROM payouts) as totalVolume
  `),
  getDailyReportCount: db.prepare("SELECT COUNT(*) as count FROM reports WHERE telegram_id = ? AND date(created_at) = date('now')"),
  getYellowLink:      db.prepare('SELECT evm_address FROM yellow_links WHERE telegram_id = ?'),
  insertYellowLink:   db.prepare('INSERT OR REPLACE INTO yellow_links (telegram_id, evm_address) VALUES (?, ?)'),
  getYellowCredit:    db.prepare('SELECT amount FROM yellow_credits WHERE evm_address = ?'),
  insertYellowCredit:  db.prepare('INSERT OR REPLACE INTO yellow_credits (evm_address, amount) VALUES (?, ?)'),
  getYellowStats:     db.prepare(`
    SELECT 
      COUNT(evm_address) as pendingAddresses,
      COALESCE(SUM(amount), 0) as totalPendingUSDC
    FROM yellow_credits
  `),
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get or create a user. Returns { keypair, publicKey, points, reportCount }
 * Keypair is reconstructed from encrypted storage each time.
 */
export function getOrCreateUser(telegramId) {
  let row = stmts.getUser.get(telegramId);

  if (!row) {
    // Generate new Solana keypair
    const kp = Keypair.generate();
    const { encrypted, iv } = encryptSecretKey(kp.secretKey);
    stmts.insertUser.run(telegramId, kp.publicKey.toBase58(), encrypted, iv);
    console.log(`🆕 New signaler: ${kp.publicKey.toBase58().slice(0, 8)}...`);
    return {
      keypair: kp,
      publicKey: kp.publicKey.toBase58(),
      points: 0,
      reportCount: 0,
      isNew: true,
    };
  }

  // Decrypt stored secret key
  const secretKey = decryptSecretKey(row.encrypted_sk, row.iv);
  const kp = Keypair.fromSecretKey(secretKey);
  return {
    keypair: kp,
    publicKey: row.public_key,
    points: row.points,
    reportCount: row.report_count,
    reputation: row.reputation ?? 50,
    region: row.region,
    isNew: false,
  };
}

/**
 * Save a verified report and update user stats (legacy path: accepted immediately)
 */
export function saveReport(telegramId, category, price, reward, imagePath = null, imageHash = null) {
  const save = db.transaction(() => {
    stmts.insertReport.run(telegramId, category, price, reward, imagePath, imageHash);
    stmts.updatePoints.run(150, telegramId);  // +150 PTS per report
  });
  save();
}

// ─── Consensus ───────────────────────────────────────────────────────────────

/**
 * Save an AI-verified report as pending consensus, with one observation per priced item.
 * The reward is locked (stored on the report) and only paid if consensus accepts it.
 */
export function savePendingReport(r) {
  const save = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO reports (telegram_id, category, price, reward, image_path, image_hash, status,
                           region, store_name, receipt_ts, original_amount, original_currency)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)
    `).run(r.telegramId, r.category, r.totalUsd, r.reward, r.imagePath, r.imageHash,
           r.region, r.storeName, r.receiptTs, r.originalAmount, r.originalCurrency);
    const reportId = info.lastInsertRowid;
    const insertObs = db.prepare(`
      INSERT INTO observations (report_id, telegram_id, feed_key, item_name, price_usd, onchain_report) VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const o of r.observations) {
      insertObs.run(reportId, r.telegramId, o.feedKey, o.itemName, o.priceUsd, o.onchainReport || null);
    }
    db.prepare('UPDATE users SET report_count = report_count + 1 WHERE telegram_id = ?').run(r.telegramId);
    return Number(reportId);
  });
  return save();
}

/** Record a slashed submission that never became a full report (duplicate or fake photo). */
export function saveSlashedSubmission(telegramId, category, imagePath, imageHash, note) {
  db.prepare(`
    INSERT INTO reports (telegram_id, category, price, reward, image_path, image_hash, status, decision_note, settled_at)
    VALUES (?, ?, 0, 0, ?, ?, 'slashed', ?, CURRENT_TIMESTAMP)
  `).run(telegramId, category, imagePath, imageHash, note);
}

/** The local observation (and its report) behind an on-chain Report account. */
export function getObservationByOnchainReport(onchainReport) {
  return db.prepare(`
    SELECT o.*, r.image_hash, r.reward AS report_reward
    FROM observations o JOIN reports r ON r.id = o.report_id
    WHERE o.onchain_report = ?
  `).get(onchainReport);
}

export function setObservationStatus(observationId, status) {
  db.prepare('UPDATE observations SET status = ? WHERE id = ?').run(status, observationId);
}

/**
 * Once every item on a receipt has settled on-chain, roll the receipt up:
 * accepted if any item was accepted, slashed if any was slashed (and none accepted), else expired.
 * Returns the final status, or null while items are still pending.
 */
export function finalizeReportIfDone(reportId) {
  const rows = db.prepare('SELECT status FROM observations WHERE report_id = ?').all(reportId).map(r => r.status);
  if (!rows.length || rows.includes('pending')) return null;
  const status = rows.includes('accepted') ? 'accepted' : rows.includes('slashed') ? 'slashed' : 'expired';
  db.prepare(`UPDATE reports SET status = ?, settled_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'`).run(status, reportId);
  return status;
}

/** Feed key of the first item filed from a given photo (to prove a duplicate on-chain). */
export function getFeedKeyForImageHash(imageHash) {
  const row = db.prepare(`
    SELECT o.feed_key FROM observations o JOIN reports r ON r.id = o.report_id
    WHERE r.image_hash = ? AND o.onchain_report IS NOT NULL ORDER BY o.id LIMIT 1
  `).get(imageHash);
  return row?.feed_key || null;
}

export function getAllFeedKeys() {
  return db.prepare('SELECT DISTINCT feed_key FROM observations').all().map(r => r.feed_key);
}

export function getPendingReports() {
  return db.prepare(`SELECT * FROM reports WHERE status = 'pending' ORDER BY created_at ASC`).all();
}

export function getReportObservations(reportId) {
  return db.prepare('SELECT * FROM observations WHERE report_id = ?').all(reportId);
}

/** Accepted observations for a feed in the last `days`, excluding one reporter. */
export function getFeedHistory(feedKey, excludeTelegramId, days) {
  return db.prepare(`
    SELECT price_usd, telegram_id FROM observations
    WHERE feed_key = ? AND status = 'accepted' AND telegram_id != ?
      AND created_at >= datetime('now', ?)
  `).all(feedKey, excludeTelegramId, `-${days} days`);
}

/** Recent non-slashed observations for a feed from other reporters (peer reports). */
export function getPeerObservations(feedKey, excludeTelegramId, hours) {
  return db.prepare(`
    SELECT price_usd, telegram_id FROM observations
    WHERE feed_key = ? AND status != 'slashed' AND telegram_id != ?
      AND created_at >= datetime('now', ?)
  `).all(feedKey, excludeTelegramId, `-${hours} hours`);
}

/** All accepted prices for a feed in the last `days` (for the published median). */
export function getAcceptedFeedPrices(feedKey, days) {
  return db.prepare(`
    SELECT price_usd FROM observations
    WHERE feed_key = ? AND status = 'accepted' AND created_at >= datetime('now', ?)
  `).all(feedKey, `-${days} days`).map(r => r.price_usd);
}

export function settleReport(reportId, status, note) {
  const settle = db.transaction(() => {
    db.prepare(`UPDATE reports SET status = ?, decision_note = ?, settled_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(status, note, reportId);
    db.prepare('UPDATE observations SET status = ? WHERE report_id = ?').run(status, reportId);
  });
  settle();
}

export function setReportTx(reportId, field, tx) {
  if (!['payout_tx', 'chain_tx'].includes(field)) throw new Error(`bad field ${field}`);
  db.prepare(`UPDATE reports SET ${field} = ? WHERE id = ?`).run(tx, reportId);
}

export function addPoints(telegramId, points) {
  db.prepare('UPDATE users SET points = points + ? WHERE telegram_id = ?').run(points, telegramId);
}

export function getReputation(telegramId) {
  const row = db.prepare('SELECT reputation FROM users WHERE telegram_id = ?').get(telegramId);
  return row?.reputation ?? 50;
}

export function setReputation(telegramId, reputation) {
  db.prepare('UPDATE users SET reputation = ? WHERE telegram_id = ?').run(reputation, telegramId);
}

export function setUserRegion(telegramId, region) {
  db.prepare('UPDATE users SET region = ? WHERE telegram_id = ?').run(region, telegramId);
}

export function getUserPendingLocked(telegramId) {
  const row = db.prepare(`SELECT COUNT(*) as n, COALESCE(SUM(reward), 0) as locked FROM reports WHERE telegram_id = ? AND status = 'pending'`).get(telegramId);
  return { count: row.n, locked: row.locked };
}

/** Current off-chain view of every feed (median over the last 30 days). */
export function getFeedsSummary(days = 30) {
  return db.prepare(`
    SELECT feed_key, COUNT(*) as samples, MAX(created_at) as updated_at
    FROM observations WHERE status = 'accepted' AND created_at >= datetime('now', ?)
    GROUP BY feed_key ORDER BY samples DESC
  `).all(`-${days} days`);
}

/**
 * Check if an image hash has already been submitted globally
 */
export function isImageDuplicate(imageHash) {
  if (!imageHash) return false;
  const row = stmts.checkHash.get(imageHash);
  return !!row;
}

/**
 * Record a USDC payout
 */
export function savePayout(telegramId, amount, txSignature = null) {
  stmts.insertPayout.run(telegramId, amount, txSignature);
}

/**
 * Top N signalers for the leaderboard
 */
export function getLeaderboard(limit = 10) {
  return stmts.getLeaderboard.all(limit).map((row, i) => ({
    rank: i + 1,
    wallet: row.public_key.slice(0, 8) + '...',
    points: row.points,
    reports: row.report_count,
    telegramId: row.telegram_id,
  }));
}

/**
 * Recent reports for dashboard live feed
 */
export function getRecentReports(limit = 20) {
  return stmts.getReports.all(limit).map(row => ({
    category: row.category,
    price: row.price.toFixed(2),
    reward: row.reward,
    wallet: row.public_key.slice(0, 8) + '...',
    ts: new Date(row.created_at).getTime(),
    imagePath: row.image_path,
    status: row.status,
    region: row.region,
  }));
}

/**
 * Aggregate stats for the dashboard
 */
export function getNetworkStats() {
  return stmts.getStats.get();
}

/**
 * Get a user's total USDC earned
 */
export function getUserTotalEarned(telegramId) {
  const row = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payouts WHERE telegram_id = ?').get(telegramId);
  return row.total;
}

/**
 * Check how many reports a user submitted today
 */
export function getDailyReportCount(telegramId) {
  const row = stmts.getDailyReportCount.get(telegramId);
  return row ? row.count : 0;
}

export function saveYellowLink(telegramId, evmAddress) {
  stmts.insertYellowLink.run(telegramId, evmAddress);
}

export function getYellowLink(telegramId) {
  const row = stmts.getYellowLink.get(telegramId);
  return row ? row.evm_address : null;
}

export function getYellowCredit(evmAddress) {
  const row = stmts.getYellowCredit.get(evmAddress);
  return row ? row.amount : 0;
}

export function addYellowCredit(evmAddress, amount) {
  const current = getYellowCredit(evmAddress);
  stmts.insertYellowCredit.run(evmAddress, current + amount);
}

export function getYellowDBStats() {
  const row = stmts.getYellowStats.get();
  return {
    pendingAddresses: row ? row.pendingAddresses : 0,
    totalPendingUSDC: row ? row.totalPendingUSDC : 0,
  };
}

export default db;
