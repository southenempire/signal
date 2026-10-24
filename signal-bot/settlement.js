/**
 * Settlement for Signal reports.
 *
 * With the Solana program enabled (the default once SIGNAL_PROGRAM_ID's program is deployed),
 * consensus, payouts, slashing and reputation all happen on-chain: `crankChain` drives the
 * program and mirrors the results to the local DB, Telegram and BOTChain.
 *
 * `settlePending` is the original off-chain engine, kept as a fallback when the program is
 * not configured.
 */
import {
  RULES, evaluateObservation, decideReport, clampReputation, median,
} from './consensus.js';
import {
  getPendingReports, getReportObservations, getFeedHistory, getPeerObservations,
  getAcceptedFeedPrices, settleReport, setReportTx, getReputation, setReputation,
  addPoints, savePayout, saveSlashedSubmission, getYellowLink,
  getObservationByOnchainReport, setObservationStatus, finalizeReportIfDone,
} from './db.js';
import { recordObservation, recordSlash } from './botchain.js';
import * as oracle from './solana_oracle.js';

const ageHours = (sqliteUtc) => (Date.now() - Date.parse(`${sqliteUtc.replace(' ', 'T')}Z`)) / 3_600_000;

let running = false;

/**
 * @param {{
 *   payReward: (telegramId: number, amount: number) => Promise<{signature: string, rail: string} | null>,
 *   notify: (telegramId: number, html: string) => Promise<void>,
 * }} deps
 */
export async function settlePending(deps) {
  if (running) return;
  running = true;
  try {
    for (const report of getPendingReports()) {
      await settleOne(report, deps).catch(e => console.error(`[Consensus] report #${report.id} failed:`, e.message));
    }
  } finally {
    running = false;
  }
}

async function settleOne(report, deps) {
  const observations = getReportObservations(report.id);
  const results = observations.map(o => evaluateObservation(
    o.price_usd,
    getFeedHistory(o.feed_key, report.telegram_id, RULES.BOUNDS_WINDOW_DAYS),
    getPeerObservations(o.feed_key, report.telegram_id, RULES.PEER_WINDOW_HOURS),
  ));
  const reputation = getReputation(report.telegram_id);
  const { decision, reason } = decideReport(results.map(r => r.verdict), ageHours(report.created_at), reputation);
  if (decision === 'pending') return;

  const note = `${reason} | ${results.map(r => r.detail).join('; ')}`;
  console.log(`[Consensus] report #${report.id} → ${decision}: ${note}`);

  if (decision === 'accept') {
    const newRep = clampReputation(reputation + RULES.REPUTATION_ACCEPT);
    settleReport(report.id, 'accepted', note);
    setReputation(report.telegram_id, newRep);
    addPoints(report.telegram_id, RULES.POINTS_PER_ACCEPTED);

    const payout = await deps.payReward(report.telegram_id, report.reward);
    if (payout) {
      savePayout(report.telegram_id, report.reward, payout.signature);
      setReportTx(report.id, 'payout_tx', payout.signature);
    }

    const wallet = getYellowLink(report.telegram_id);
    let chainTx = null;
    for (const o of observations) {
      const prices = getAcceptedFeedPrices(o.feed_key, RULES.BOUNDS_WINDOW_DAYS);
      const res = await recordObservation({
        feedKey: o.feed_key,
        priceUsd: o.price_usd,
        imageHash: report.image_hash,
        telegramId: report.telegram_id,
        wallet,
        feedMedianUsd: median(prices) ?? o.price_usd,
        feedSamples: prices.length,
        reputation: newRep,
      });
      if (res.success && !chainTx) chainTx = res.hash;
    }
    if (chainTx) setReportTx(report.id, 'chain_tx', chainTx);

    await deps.notify(report.telegram_id,
      `✅ <b>Report #${report.id} accepted by consensus</b>\n\n` +
      (payout
        ? `💰 +$${report.reward.toFixed(2)} USDC released (${payout.rail})\n`
        : `⚠️ Reward of $${report.reward.toFixed(2)} approved but payout failed — it will be retried by support.\n`) +
      (chainTx ? `🚀 <a href="https://scan.botchain.ai/tx/${chainTx}">Recorded on BOTChain</a>\n` : `🚀 BOTChain: not recorded\n`) +
      `⭐ Reputation: ${newRep}/100`);
    return;
  }

  if (decision === 'slash') {
    const newRep = clampReputation(reputation + RULES.REPUTATION_SLASH);
    settleReport(report.id, 'slashed', note);
    setReputation(report.telegram_id, newRep);
    const res = await recordSlash({ telegramId: report.telegram_id, imageHash: report.image_hash, reason, reputation: newRep });
    if (res.success) setReportTx(report.id, 'chain_tx', res.hash);

    await deps.notify(report.telegram_id,
      `✂️ <b>Report #${report.id} slashed</b>\n\n` +
      `Reason: ${reason}.\n` +
      `🔒 Locked reward of $${report.reward.toFixed(2)} forfeited.\n` +
      `⭐ Reputation: ${newRep}/100`);
    return;
  }

  // expire
  settleReport(report.id, 'expired', note);
  await deps.notify(report.telegram_id,
    `⌛ <b>Report #${report.id} expired</b>\n\n${reason}. No reward was paid and your reputation is unchanged.`);
}

/** Slash a submission caught before consensus (duplicate photo or AI-flagged fake). */
export async function slashSubmission({ telegramId, category, imagePath, imageHash, reason, penalty }) {
  const newRep = clampReputation(getReputation(telegramId) + penalty);
  setReputation(telegramId, newRep);
  saveSlashedSubmission(telegramId, category, imagePath, imageHash, reason);
  await recordSlash({ telegramId, imageHash, reason, reputation: newRep });
  return newRep;
}

// ─── On-chain consensus (Solana program) ─────────────────────────────────────

const solscan = (sig) => `https://solscan.io/tx/${sig}?cluster=devnet`;

/**
 * One crank pass against the Solana program, then mirror what settled.
 * @param {{ notify: (telegramId: number, html: string) => Promise<void>,
 *           onAccepted?: (telegramId: number, rewardUsd: number) => void }} deps
 */
export async function crankChain(deps) {
  const settled = await oracle.crank();
  const touchedReports = new Map(); // local report id → { telegramId, lines: [] }

  for (const s of settled) {
    const obs = getObservationByOnchainReport(s.report);
    if (!obs) continue; // filed by another attester; nothing local to update

    setObservationStatus(obs.id, s.status);
    if (s.reputation !== null) setReputation(obs.telegram_id, s.reputation);

    const entry = touchedReports.get(obs.report_id) || { telegramId: obs.telegram_id, lines: [], reputation: s.reputation };
    entry.reputation = s.reputation ?? entry.reputation;

    if (s.status === 'accepted') {
      savePayout(obs.telegram_id, s.rewardUsd, s.signature);
      addPoints(obs.telegram_id, RULES.POINTS_PER_ACCEPTED);
      deps.onAccepted?.(obs.telegram_id, s.rewardUsd);

      // Mirror to BOTChain for the incubator's public log.
      const mirror = await recordObservation({
        feedKey: obs.feed_key,
        priceUsd: s.priceUsd,
        imageHash: obs.image_hash,
        telegramId: obs.telegram_id,
        wallet: getYellowLink(obs.telegram_id),
        feedMedianUsd: s.feedMedianUsd ?? s.priceUsd,
        feedSamples: s.feedSamples,
        reputation: s.reputation ?? 50,
      });
      if (mirror.success) setReportTx(obs.report_id, 'chain_tx', mirror.hash);

      entry.lines.push(`✅ ${obs.item_name} — accepted, <a href="${solscan(s.signature)}">+$${s.rewardUsd.toFixed(2)} USDC paid by the program</a>`);
    } else if (s.status === 'slashed') {
      await recordSlash({
        telegramId: obs.telegram_id, imageHash: obs.image_hash,
        reason: `${obs.feed_key} contradicted by bounds/peers`, reputation: s.reputation ?? 0,
      });
      entry.lines.push(`✂️ ${obs.item_name} — slashed, $${s.rewardUsd.toFixed(2)} reward forfeited`);
    } else {
      entry.lines.push(`⌛ ${obs.item_name} — expired, no reward`);
    }
    touchedReports.set(obs.report_id, entry);
  }

  for (const [reportId, entry] of touchedReports) {
    const final = finalizeReportIfDone(reportId);
    await deps.notify(entry.telegramId,
      `<b>Report #${reportId} — consensus update</b>\n\n${entry.lines.join('\n')}` +
      (final ? `\n\nAll items settled: <b>${final}</b>.` : `\n\nOther items are still pending.`) +
      (entry.reputation !== null ? `\n⭐ Reputation: ${entry.reputation}/100` : ''));
  }
  return settled.length;
}

/**
 * Penalise a duplicate or AI-flagged fake. On-chain when the program is enabled (the
 * program enforces the reputation cut), always recorded locally and mirrored to BOTChain.
 * @returns {Promise<number>} the reporter's new reputation
 */
export async function penalize({ kind, telegramId, wallet, category, imagePath, imageHash, feedKey, reason }) {
  let newRep = null;
  if (oracle.isEnabled()) {
    try {
      if (kind === 'duplicate' && feedKey) {
        await oracle.flagDuplicate({ offenderWallet: wallet, feedKey, imageHashHex: imageHash });
      } else {
        await oracle.flagFake({ offenderWallet: wallet, imageHashHex: imageHash });
      }
      newRep = (await oracle.getReporter(wallet))?.reputation ?? null;
    } catch (e) {
      console.error(`[Oracle] flag_${kind} failed:`, e.message);
    }
  }
  if (newRep === null) {
    const penalty = kind === 'duplicate' ? RULES.REPUTATION_DUPLICATE : RULES.REPUTATION_FAKE;
    newRep = clampReputation(getReputation(telegramId) + penalty);
  }
  setReputation(telegramId, newRep);
  saveSlashedSubmission(telegramId, category, imagePath, imageHash, reason);
  await recordSlash({ telegramId, imageHash, reason, reputation: newRep });
  return newRep;
}
