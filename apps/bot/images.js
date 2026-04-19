import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const IMAGE_DIR = process.env.IMAGE_DIR || './data/images';

/**
 * Download the highest-resolution photo from Telegram and save to disk.
 * Returns the relative file path for database storage.
 *
 * @param {import('telegraf').Context} ctx — Telegraf context with photo
 * @param {string} category — FUEL, GROCERY, ELECTRICITY, RENT
 * @param {number} telegramId — user's Telegram ID
 * @returns {Promise<string>} — relative path to saved image
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
    console.log(`📷 Saved image: ${filepath} (${(buffer.length / 1024).toFixed(1)} KB)`);

    return filepath;
  } catch (err) {
    console.error('⚠️ Image save failed:', err.message);
    return null; // Non-fatal — report still gets saved without image
  }
}
