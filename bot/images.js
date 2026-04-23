import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

const IMAGE_DIR = process.env.IMAGE_DIR || './data/images';

/**
 * Download the highest-resolution photo from Telegram and save to disk.
 * Returns the relative file path for database storage.
 *
 * @param {import('telegraf').Context} ctx — Telegraf context with photo
 * @param {string} category — FUEL, GROCERY, ELECTRICITY, RENT
 * @param {number} telegramId — user's Telegram ID
 * @returns {Promise<{filepath: string|null, hash: string|null}>} — relative path to saved image and its sha256 hash
 */
export async function saveReportImage(ctx, category, telegramId) {
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

    // Organize by date
    const now  = new Date();
    const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const ts   = now.getTime();
    const dir  = join(IMAGE_DIR, date);
    mkdirSync(dir, { recursive: true });

    // Filename: category_telegramId_timestamp.jpg
    const filename = `${category.toLowerCase()}_${telegramId}_${ts}.jpg`;
    const filepath = join(dir, filename);

    const base64 = buffer.toString('base64');
    return { filepath, hash, base64 };
  } catch (err) {
    console.error('⚠️ Image save failed:', err.message);
    return { filepath: null, hash: null }; // Non-fatal — report still gets saved without image
  }
}
