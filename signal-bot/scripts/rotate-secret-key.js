/**
 * Re-encrypt every custodial wallet in the bot database under a new SECRET_KEY.
 *
 *   OLD_SECRET_KEY=... NEW_SECRET_KEY=... DB_PATH=./data/signal.db node scripts/rotate-secret-key.js
 *
 * Backs up the database to <DB_PATH>.pre-rotation-<timestamp> first (SQLite's online backup, so
 * rows still in the WAL journal are included), then rewrites all rows in one
 * transaction: if any wallet fails to decrypt, nothing is changed. Matches db.js: AES-256-GCM,
 * key = scrypt(secret, 'signal-bot-salt', 32), auth tag appended to the ciphertext.
 *
 * Note: rotating the key protects the wallets from now on. If the old key AND a copy of the old
 * database leaked together, those wallets' private keys are already known; on mainnet, move users
 * to fresh wallets instead of re-encrypting the old ones.
 */
import Database from 'better-sqlite3';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const { OLD_SECRET_KEY, NEW_SECRET_KEY } = process.env;
const DB_PATH = process.env.DB_PATH || './data/signal.db';
if (!OLD_SECRET_KEY || !NEW_SECRET_KEY) {
  console.error('Set OLD_SECRET_KEY and NEW_SECRET_KEY');
  process.exit(1);
}
if (OLD_SECRET_KEY === NEW_SECRET_KEY) {
  console.error('NEW_SECRET_KEY must differ from OLD_SECRET_KEY');
  process.exit(1);
}

const keyFor = (secret) => scryptSync(secret, 'signal-bot-salt', 32);
const oldKey = keyFor(OLD_SECRET_KEY);
const newKey = keyFor(NEW_SECRET_KEY);

function decrypt(encryptedB64, ivB64) {
  const data = Buffer.from(encryptedB64, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', oldKey, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(data.subarray(data.length - 16));
  return Buffer.concat([decipher.update(data.subarray(0, data.length - 16)), decipher.final()]);
}

function encrypt(plain) {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', newKey, iv);
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  return { encrypted: Buffer.concat([enc, cipher.getAuthTag()]).toString('base64'), iv: iv.toString('base64') };
}

const db = new Database(DB_PATH);

// A plain file copy would miss rows that live only in signal.db-wal; db.backup() captures them.
const backup = `${DB_PATH}.pre-rotation-${Date.now()}`;
await db.backup(backup);
console.log(`Backup: ${backup}`);
const users = db.prepare('SELECT telegram_id, encrypted_sk, iv FROM users').all();
const update = db.prepare('UPDATE users SET encrypted_sk = ?, iv = ? WHERE telegram_id = ?');

const rotate = db.transaction(() => {
  for (const u of users) {
    const secret = decrypt(u.encrypted_sk, u.iv); // throws on a wrong OLD_SECRET_KEY → whole transaction rolls back
    const { encrypted, iv } = encrypt(secret);
    secret.fill(0);
    update.run(encrypted, iv, u.telegram_id);
  }
});
rotate();

// Verify every row decrypts under the new key before declaring success.
for (const u of db.prepare('SELECT encrypted_sk, iv FROM users').all()) {
  const data = Buffer.from(u.encrypted_sk, 'base64');
  const d = createDecipheriv('aes-256-gcm', newKey, Buffer.from(u.iv, 'base64'));
  d.setAuthTag(data.subarray(data.length - 16));
  Buffer.concat([d.update(data.subarray(0, data.length - 16)), d.final()]).fill(0);
}
console.log(`Re-encrypted and verified ${users.length} wallet(s) under the new SECRET_KEY.`);
