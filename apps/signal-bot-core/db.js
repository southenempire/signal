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

  CREATE INDEX IF NOT EXISTS idx_reports_telegram ON reports(telegram_id);
  CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);
  CREATE INDEX IF NOT EXISTS idx_payouts_telegram ON payouts(telegram_id);
`);

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
      (SELECT COALESCE(SUM(amount), 0) FROM payouts) as totalVolume
  `),
  getDailyReportCount: db.prepare("SELECT COUNT(*) as count FROM reports WHERE telegram_id = ? AND date(created_at) = date('now')"),
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
    isNew: false,
  };
}

/**
 * Save a verified report and update user stats
 */
export function saveReport(telegramId, category, price, reward, imagePath = null, imageHash = null) {
  const save = db.transaction(() => {
    stmts.insertReport.run(telegramId, category, price, reward, imagePath, imageHash);
    stmts.updatePoints.run(150, telegramId);  // +150 PTS per report
  });
  save();
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

export default db;
