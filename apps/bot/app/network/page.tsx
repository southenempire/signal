'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Network, Receipt, Layers, Users, Coins, Landmark, ExternalLink, ShieldCheck, ArrowRight } from 'lucide-react';

// Live Network: real numbers from the Signal contract on NEAR, the Signal program on Solana and
// the bot. Nothing on this page is simulated; if a source is unreachable it says so.

type Stats = { totalVolume: string; reporters?: number; rewardPoolUsdc?: number | null; live: boolean };
type Feed = { feed: string; currency: string; median: number | null; samples: number; accepted_total: number; updated_at_secs: number };
type Feeds = { live: boolean; contract: string; feeds: Feed[] };
type Report = { id: number; status: string; category: string; region: string; currency: string | null; items: unknown[]; submitted_at_secs: number };
type Reports = {
  live: boolean;
  contract: string;
  contractUrl?: string;
  reportsCount?: number;
  feedsCount?: number;
  solana?: { program: string; programUrl: string; nearIsAttester: boolean };
  reports: Report[];
};

const BOT_URL = 'https://t.me/OfficialSignalOracleBot';

const humanize = (s: string) => s.replace(/[_-]/g, ' ');
/** "ng-port_harcourt" → "Port Harcourt, NG"; "global" stays "Global". */
const place = (region: string) => {
  const [cc, ...city] = region.split('-');
  if (!city.length) return humanize(region).replace(/^\w/, (c) => c.toUpperCase());
  return `${city.join(' ').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}, ${cc.toUpperCase()}`;
};
const money = (minor: number | null, currency: string) =>
  minor === null ? '—' : `${(minor / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
const ago = (secs: number) => {
  const s = Math.max(0, Date.now() / 1000 - secs);
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

function Stat({ icon: Icon, label, value, note, wide }: { icon: typeof Receipt; label: string; value: string; note: string; wide?: boolean }) {
  return (
    <div className={`p-4 sm:p-5 rounded-2xl border border-line bg-card ${wide ? 'col-span-2 lg:col-span-1' : ''}`}>
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-mute">
        <Icon size={14} className="text-accent shrink-0" /> {label}
      </div>
      <div className="mt-2 text-2xl sm:text-3xl font-black text-fg tabular-nums">{value}</div>
      <div className="mt-1 text-[11px] text-faint">{note}</div>
    </div>
  );
}

export default function NetworkPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [feeds, setFeeds] = useState<Feeds | null>(null);
  const [reports, setReports] = useState<Reports | null>(null);

  useEffect(() => {
    fetch('/api/network-stats').then((r) => r.json()).then(setStats).catch(() => setStats({ totalVolume: '0.00', live: false }));
    fetch('/api/near/feeds').then((r) => r.json()).then(setFeeds).catch(() => setFeeds({ live: false, contract: '', feeds: [] }));
    fetch('/api/near/reports').then((r) => r.json()).then(setReports).catch(() => setReports({ live: false, contract: '', reports: [] }));
  }, []);

  const loading = '…';
  return (
    <div className="min-h-[calc(100dvh-5rem)] w-full bg-page text-fg">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8">
        <header className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center">
              <Network size={20} className="text-accent" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Live Network</h1>
          </div>
          <p className="text-dim max-w-3xl">
            Real numbers from the Signal contract on NEAR testnet, the Signal program on Solana devnet and the Telegram bot.
            Nothing here is simulated. Want the proof behind each price? See{' '}
            <Link href="/verify" className="text-accent underline underline-offset-2">Verify</Link>.
          </p>
        </header>

        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <Stat icon={Receipt} label="Receipts verified" value={reports ? String(reports.reportsCount ?? 0) : loading} note="checked on NEAR" />
          <Stat icon={Layers} label="Price feeds" value={reports ? String(reports.feedsCount ?? 0) : loading} note="item × city × currency" />
          <Stat icon={Users} label="Reporters" value={stats ? String(stats.reporters ?? 0) : loading} note="Telegram users" />
          <Stat icon={Coins} label="USDC paid" value={stats ? `$${stats.totalVolume}` : loading} note="to reporters, devnet" />
          <Stat
            icon={Landmark}
            label="Reward pool"
            value={stats ? (stats.rewardPoolUsdc == null ? '—' : `$${Math.round(stats.rewardPoolUsdc).toLocaleString('en-US')}`) : loading}
            note="Solana vault, devnet"
            wide
          />
        </section>

        {/* Feeds */}
        <section className="rounded-2xl border border-line bg-card overflow-hidden">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 sm:px-6 py-4 border-b border-line">
            <h2 className="font-bold">Live price feeds</h2>
            <span className="text-xs text-mute">Median of the last accepted prices, in the receipt&apos;s own currency</span>
          </div>
          {!feeds && <p className="px-4 sm:px-6 py-6 text-sm text-mute">Reading the feeds from NEAR…</p>}
          {feeds && !feeds.live && <p className="px-4 sm:px-6 py-6 text-sm text-red-500">NEAR is unreachable right now.</p>}
          {feeds?.live && feeds.feeds.length === 0 && <p className="px-4 sm:px-6 py-6 text-sm text-mute">No feeds yet.</p>}
          {feeds?.live && feeds.feeds.length > 0 && (
            <ul className="divide-y divide-line">
              {feeds.feeds.map((f) => {
                const [category, region, item] = f.feed.split(':');
                return (
                  <li key={f.feed} className="px-4 sm:px-6 py-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 items-baseline">
                    <span className="font-semibold text-fg capitalize truncate">{humanize(item || f.feed)}</span>
                    <span className="font-mono text-sm text-fg tabular-nums text-right">{money(f.median, f.currency)}</span>
                    <span className="text-xs text-mute truncate">
                      {place(region || '')} · {category?.toLowerCase()}
                    </span>
                    <span className="text-[11px] text-faint text-right whitespace-nowrap">
                      {f.accepted_total} report{f.accepted_total === 1 ? '' : 's'} · {ago(f.updated_at_secs)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Recent receipts + chains */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <section className="lg:col-span-2 rounded-2xl border border-line bg-card overflow-hidden">
            <div className="flex items-baseline justify-between gap-2 px-4 sm:px-6 py-4 border-b border-line">
              <h2 className="font-bold">Recent receipts</h2>
              <Link href="/verify" className="text-xs text-accent inline-flex items-center gap-1">
                See the proof <ArrowRight size={12} />
              </Link>
            </div>
            {!reports && <p className="px-4 sm:px-6 py-6 text-sm text-mute">Reading NEAR…</p>}
            {reports?.live && reports.reports.length === 0 && <p className="px-4 sm:px-6 py-6 text-sm text-mute">No receipts yet.</p>}
            <ul className="divide-y divide-line">
              {reports?.reports.slice(0, 6).map((r) => (
                <li key={r.id} className="px-4 sm:px-6 py-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="font-black text-fg">#{r.id}</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    r.status === 'Verified' ? 'bg-[#10B981]/15 text-accent' : r.status === 'Fraud' ? 'bg-red-500/15 text-red-500' : 'bg-zinc-500/15 text-mute'
                  }`}>{r.status}</span>
                  <span className="text-dim">{place(r.region)}{r.currency ? ` · ${r.currency}` : ''}</span>
                  <span className="text-mute">{r.items.length} price{r.items.length === 1 ? '' : 's'}</span>
                  <span className="text-faint text-xs ml-auto">{ago(r.submitted_at_secs)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-line bg-card p-4 sm:p-6 space-y-4">
            <h2 className="font-bold">On-chain</h2>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-mute">Verifies · NEAR testnet</p>
              {reports?.contractUrl ? (
                <a href={reports.contractUrl} target="_blank" rel="noreferrer" className="font-mono text-xs text-fg break-all hover:text-accent inline-flex items-center gap-1">
                  {reports.contract} <ExternalLink size={11} />
                </a>
              ) : <span className="text-xs text-mute">…</span>}
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-mute">Pays · Solana devnet</p>
              {reports?.solana ? (
                <a href={reports.solana.programUrl} target="_blank" rel="noreferrer" className="font-mono text-xs text-fg break-all hover:text-accent inline-flex items-center gap-1">
                  {reports.solana.program} <ExternalLink size={11} />
                </a>
              ) : <span className="text-xs text-mute">…</span>}
            </div>
            {reports?.solana && (
              <p className="flex gap-2 text-xs text-dim">
                <ShieldCheck size={14} className={`shrink-0 ${reports.solana.nearIsAttester ? 'text-accent' : 'text-red-500'}`} />
                {reports.solana.nearIsAttester
                  ? 'The Solana program only accepts filings signed by the NEAR contract’s key.'
                  : 'The Solana program’s attester does not match the NEAR contract right now.'}
              </p>
            )}
            <a
              href={BOT_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#10B981] hover:bg-[#0ea371] text-[#06150f] font-bold text-sm"
            >
              Send a receipt <ExternalLink size={14} />
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}
