import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createHash, randomBytes } from 'crypto';

const IMAGE_DIR = process.env.IMAGE_DIR || './data/images';

/**
 * Download the highest-resolution photo from Telegram and save to disk.
 * Returns the relative file path for database storage.
 *
 * @param {import('telegraf').Context} ctx — Telegraf context with photo
 * @param {string} category — FUEL, GROCERY, ELECTRICITY, RENT
 * @param {number} telegramId — user's Telegram ID
 * @param {{keep?: boolean}} [options] — keep: false holds the photo in memory only (filepath is null)
 * @returns {Promise<{filepath: string|null, hash: string|null}>} — relative path to saved image and its sha256 hash
 */
export async function saveReportImage(ctx, category, telegramId, { keep = true } = {}) {
  try {
    // Telegram sends photos as an array sorted by size — last = highest res
    const photos = ctx.message.photo;
    const best   = photos[photos.length - 1];

    // Get the download URL from Telegram
    const fileLink = await ctx.telegram.getFileLink(best.file_id);

    // Fetch the image bytes
    const response = await fetch(fileLink.href);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());

    // Calculate SHA-256 hash for duplicate detection
    const hash = createHash('sha256').update(buffer).digest('hex');
    const base64 = buffer.toString('base64');
    if (!keep) return { filepath: null, hash, base64, buffer };

    // Organize by date
    const now  = new Date();
    const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const ts   = now.getTime();
    const dir  = join(IMAGE_DIR, date);
    mkdirSync(dir, { recursive: true });

    // Filename: category_telegramId_timestamp.jpg
    const filename = `${category.toLowerCase()}_${telegramId}_${ts}.jpg`;
    const filepath = join(dir, filename);

    writeFileSync(filepath, buffer);
    return { filepath, hash, base64, buffer };
  } catch (err) {
    console.error('⚠️ Image save failed:', err.message);
    return { filepath: null, hash: null }; // Non-fatal — report still gets saved without image
  }
}

// ─── Short-lived links for the vision model ──────────────────────────────────
// NEAR AI fetches the photo by URL so the photo itself never goes on-chain (only its sha256 does).
// Each link is a random token that works for a few minutes and is dropped once the audit is done.
const SHARE_TTL_MS = 10 * 60_000;
const shared = new Map(); // token → { buffer, expires }

export function shareImage(buffer) {
  const now = Date.now();
  for (const [t, s] of shared) if (s.expires < now) shared.delete(t);
  const token = randomBytes(24).toString('hex');
  shared.set(token, { buffer, expires: now + SHARE_TTL_MS });
  return token;
}

export function sharedImage(token) {
  const s = shared.get(token);
  return s && s.expires >= Date.now() ? s.buffer : null;
}

export function unshareImage(token) {
  shared.delete(token);
}
