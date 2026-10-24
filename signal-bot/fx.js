/**
 * Live FX rates for converting receipt prices to USD.
 * Source: open.er-api.com (free, no key, updated daily). Cached for 6 hours.
 */
import fetch from 'node-fetch';

const FX_URL = process.env.FX_API_URL || 'https://open.er-api.com/v6/latest/USD';
const CACHE_MS = 6 * 60 * 60 * 1000;

let cache = { rates: null, fetchedAt: 0 };

async function loadRates() {
  if (cache.rates && Date.now() - cache.fetchedAt < CACHE_MS) return cache.rates;
  const res = await fetch(FX_URL);
  const data = await res.json();
  if (data.result !== 'success' || !data.rates) throw new Error('FX API returned no rates');
  cache = { rates: data.rates, fetchedAt: Date.now() };
  return cache.rates;
}

/** Convert an amount in `currency` to USD. Throws if the currency is unknown. */
export async function toUsd(amount, currency) {
  const code = String(currency || 'USD').toUpperCase();
  if (code === 'USD') return amount;
  const rates = await loadRates();
  const perUsd = rates[code];
  if (!perUsd) throw new Error(`No FX rate for ${code}`);
  return amount / perUsd;
}
