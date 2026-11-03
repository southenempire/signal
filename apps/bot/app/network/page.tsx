'use client';

import { useEffect, useState } from 'react';
import DataNetworkBackground from '@/components/DataNetworkBackground';
import Link from 'next/link';
import { Receipt, Layers, Users, Coins, Landmark, ExternalLink, ShieldCheck, ArrowRight, MapPin } from 'lucide-react';

// Live Network: real numbers from the Signal contract on NEAR, the Signal program on Solana and
// the bot. Nothing on this page is simulated; if a source is unreachable it says so.

type Stats = { totalVolume: string; reporters?: number; rewardPoolUsdc?: number | null; live: boolean };
type Feed = { feed: string; currency: string; median: number | null; samples: number; accepted_total: number; updated_at_secs: number };
type Feeds = { live: boolean; contract: string; feeds: Feed[] };
type Filing = { url: string; status: 'pending' | 'accepted' | 'slashed' | 'expired'; rewardUsdc: number } | null;
type Item = { feed: string; price: number; outcome: unknown; solana?: Filing };
type Report = { id: number; status: string; category: string; region: string; currency: string | null; items: Item[]; submitted_at_secs: number };
type Reports = {
  live: boolean;
  contract: string;
  contractUrl?: string;
  reportsCount?: number;
  feedsCount?: number;
  solana?: { program: string; programUrl: string; nearIsAttester: boolean };
  reports: Report[];
};
type Data = { stats: Stats; feeds: Feeds; reports: Reports };

const BOT_URL = 'https://t.me/OfficialSignalOracleBot';

const humanize = (s: string) => s.replace(/[_-]/g, ' ');
/** "ng-port_harcourt" → "Port Harcourt, NG"; "global" stays "Global". */
const place = (region: string) => {
  const [cc, ...city] = region.split('-');
  if (!city.length) return humanize(region).replace(/^\w/, (c) => c.toUpperCase());
  return `${city.join(' ').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}, ${cc.toUpperCase()}`;
};
/** "ng-port_harcourt" → 🇳🇬 (nothing for regions without a country code). */
const flag = (region: string) => {
  const cc = region.split('-')[0];
  if (!region.includes('-') || !/^[a-z]{2}$/.test(cc)) return '';
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
};
const money = (minor: number | null, currency: string) =>
  minor === null ? '—' : `${(minor / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
const usdc = (n: number) => `${n.toLocaleString('en-US', { maximumFractionDigits: 3 })} USDC`;
const ago = (secs: number) => {
  const s = Math.max(0, Date.now() / 1000 - secs);
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};
const accepted = (o: unknown) => typeof o === 'object' && o !== null && 'Accepted' in o;

/** Feeds grouped by city, most recently active city first. */
function byCity(feeds: Feed[]) {
  const groups = new Map<string, Feed[]>();
  for (const f of feeds) {
    const region = f.feed.split(':')[1] || '';
    groups.set(region, [...(groups.get(region) ?? []), f]);
  }
  return [...groups.entries()].sort(
    ([, a], [, b]) => Math.max(...b.map((f) => f.updated_at_secs)) - Math.max(...a.map((f) => f.updated_at_secs)),
  );
}

/** What Solana did with a receipt's accepted prices. */
function payout(items: Item[]) {
  const filed = items.map((i) => i.solana).filter((s): s is NonNullable<Filing> => !!s);
  const paid = filed.filter((s) => s.status === 'accepted');
  if (paid.length) return { label: `paid ${usdc(paid.reduce((n, s) => n + s.rewardUsdc, 0))} on Solana`, url: paid[0].url, tone: 'paid' as const };
  if (filed.some((s) => s.status === 'pending')) return { label: 'filed on Solana, settling', url: filed[0].url, tone: 'pending' as const };
  return null;
}

const Skel = ({ className }: { className: string }) => <span aria-hidden className={`net-skel block ${className}`} />;

/** Counts up to `to` once it arrives; shows the final value at once if motion is reduced. */
function CountUp({ to, format }: { to: number; format: (n: number) => string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setN(to);
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min((t - start) / 1200, 1);
      setN(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{format(n)}</>;
}

function Stat({ icon: Icon, label, value, format, note, wide }: {
  icon: typeof Receipt; label: string; value: number | null | undefined; format: (n: number) => string; note: string; wide?: boolean;
}) {
  return (
    <div className={`group relative p-5 sm:p-6 rounded-3xl border border-line bg-card backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-[#10B981]/40 hover:shadow-[0_0_40px_-12px_rgba(16,185,129,0.45)] ${wide ? 'col-span-2 lg:col-span-1' : ''}`}>
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-mute">
        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#10B981]/10 border border-[#10B981]/15">
          <Icon size={14} aria-hidden className="text-accent" />
        </span>
        {label}
      </div>
      <div className="mt-4 h-10 flex items-center text-3xl sm:text-4xl font-display font-black text-fg tabular-nums tracking-tight">
        {value === null ? <Skel className="h-8 w-20" /> : value === undefined ? '—' : <CountUp to={value} format={format} />}
      </div>
      <div className="mt-1 text-xs text-faint">{note}</div>
    </div>
  );
}

/** A docs-style section heading: small green label above a display title. */
function SectionHead({ eyebrow, title, aside }: { eyebrow: string; title: string; aside?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-accent mb-2">{eyebrow}</div>
        <h2 className="text-2xl sm:text-3xl font-display font-black text-fg tracking-tight">{title}</h2>
      </div>
      {aside}
    </div>
  );
}

export default function NetworkPage() {
  const [data, setData] = useState<Data | null>(null);

  // Everything arrives together, so the page fills in once instead of piece by piece.
  useEffect(() => {
    const get = <T,>(url: string, fallback: T) => fetch(url).then((r) => r.json() as Promise<T>).catch(() => fallback);
    Promise.all([
      get<Stats>('/api/network-stats', { totalVolume: '0.00', live: false }),
      get<Feeds>('/api/near/feeds', { live: false, contract: '', feeds: [] }),
      get<Reports>('/api/near/reports', { live: false, contract: '', reports: [] }),
    ]).then(([stats, feeds, reports]) => setData({ stats, feeds, reports }));
  }, []);

  const stats = data?.stats;
  const feeds = data?.feeds;
  const reports = data?.reports;
  const rows = (n: number) =>
    Array.from({ length: n }, (_, i) => (
      <li key={i} className="px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        <span className="space-y-2 flex-1"><Skel className="h-4 w-2/5" /><Skel className="h-3 w-1/4" /></span>
        <Skel className="h-4 w-20" />
      </li>
    ));

  const int = (n: number) => Math.round(n).toLocaleString('en-US');
  const dollars = (d: number) => (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`;

  return (
    <div className="relative min-h-[calc(100dvh-5rem)] w-full bg-page text-fg overflow-x-clip">
      <DataNetworkBackground count={70} strength={1.6} />
      <div aria-hidden className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-[700px] h-[700px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 65%)', filter: 'blur(60px)' }} />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(124,92,252,0.08) 0%, transparent 65%)', filter: 'blur(80px)' }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-16 space-y-14 sm:space-y-20">
        <header className="max-w-3xl">
          <h1 className="text-4xl sm:text-6xl font-display font-black text-fg tracking-tight mb-6">
            The network, <span className="text-accent">live.</span>
          </h1>
          <p className="text-lg leading-relaxed text-mute">
            Every number here is read straight from the Signal contract on NEAR, the Signal program on Solana and the
            Telegram bot. Nothing is simulated. Want the proof behind a price? See{' '}
            <Link href="/verify" className="text-accent underline underline-offset-4 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]">Verify</Link>.
          </p>
        </header>

        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <Stat icon={Receipt} label="Receipts verified" value={reports ? reports.reportsCount : null} format={int} note="checked on NEAR" />
          <Stat icon={Layers} label="Price feeds" value={reports ? reports.feedsCount : null} format={int} note="item × city × currency" />
          <Stat icon={Users} label="Reporters" value={stats ? stats.reporters : null} format={int} note="Telegram users" />
          <Stat icon={Coins} label="USDC paid" value={stats ? Number(stats.totalVolume) : null} format={dollars(2)} note="to reporters, devnet" />
          <Stat icon={Landmark} label="Reward pool" value={stats ? (stats.rewardPoolUsdc ?? undefined) : null} format={dollars(0)} note="Solana vault, devnet" wide />
        </section>

        {/* Feeds, grouped by city */}
        <section>
          <SectionHead
            eyebrow="Feeds"
            title="Prices, city by city"
            aside={<span className="text-xs text-mute">Median of the last accepted prices, in the receipt&apos;s own currency</span>}
          />
          <div className="rounded-3xl border border-line bg-card backdrop-blur-md overflow-hidden">
          {!feeds && <ul className="divide-y divide-line">{rows(4)}</ul>}
          {feeds && !feeds.live && <p className="px-4 sm:px-6 py-6 text-sm text-red-500">NEAR is unreachable right now. Refresh in a minute.</p>}
          {feeds?.live && feeds.feeds.length === 0 && (
            <p className="px-4 sm:px-6 py-6 text-sm text-mute">
              No feeds yet. <a href={BOT_URL} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">Send the first receipt</a>.
            </p>
          )}
          {feeds?.live && byCity(feeds.feeds).map(([region, list], gi) => (
            <div key={region} className="net-in" style={{ animationDelay: `${gi * 80}ms` }}>
              <h3 className="flex items-center gap-2 px-4 sm:px-6 py-2.5 bg-card-hover border-b border-line text-xs font-bold text-soft">
                {flag(region) ? <span aria-hidden className="text-base leading-none">{flag(region)}</span> : <MapPin size={13} aria-hidden className="text-accent" />}
                {place(region)}
                <span className="text-faint font-medium">· {list.length} feed{list.length === 1 ? '' : 's'}</span>
              </h3>
              <ul className="divide-y divide-line border-b border-line last:border-b-0">
                {list.map((f) => {
                  const [category, , item] = f.feed.split(':');
                  return (
                    <li key={f.feed} className="px-4 sm:px-6 py-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 items-baseline transition-colors hover:bg-card-hover">
                      <span className="font-semibold text-fg capitalize truncate">{humanize(item || f.feed)}</span>
                      <span className="font-mono text-sm text-fg tabular-nums text-right">{money(f.median, f.currency)}</span>
                      <span className="text-xs text-mute truncate">{category?.toLowerCase()}</span>
                      <span className="text-[11px] text-faint text-right whitespace-nowrap">
                        {f.accepted_total} report{f.accepted_total === 1 ? '' : 's'} · {ago(f.updated_at_secs)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          </div>
        </section>

        {/* Recent receipts + chains */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-14 lg:gap-6">
          <section className="lg:col-span-2">
            <SectionHead
              eyebrow="Receipts"
              title="Latest receipts"
              aside={
                <Link href="/verify" className="text-xs font-semibold text-accent inline-flex items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]">
                  See the proof <ArrowRight size={12} aria-hidden />
                </Link>
              }
            />
            <div className="rounded-3xl border border-line bg-card backdrop-blur-md overflow-hidden">
            {!reports && <ul className="divide-y divide-line">{rows(3)}</ul>}
            {reports && !reports.live && <p className="px-4 sm:px-6 py-6 text-sm text-red-500">NEAR is unreachable right now. Refresh in a minute.</p>}
            {reports?.live && reports.reports.length === 0 && <p className="px-4 sm:px-6 py-6 text-sm text-mute">No receipts yet.</p>}
            <ul className="divide-y divide-line">
              {reports?.live && reports.reports.slice(0, 6).map((r, i) => {
                const prices = r.items.filter((it) => accepted(it.outcome)).length;
                const paid = payout(r.items);
                const verified = r.status === 'Verified';
                return (
                  <li key={r.id} className="net-in px-4 sm:px-6 py-3 space-y-1.5 transition-colors hover:bg-card-hover" style={{ animationDelay: `${i * 60}ms` }}>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <span className="font-black text-fg">#{r.id}</span>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        verified ? 'bg-[#10B981]/15 text-accent' : r.status === 'Fraud' ? 'bg-red-500/15 text-red-500' : 'bg-zinc-500/15 text-mute'
                      }`}>{verified ? 'Photo verified' : r.status}</span>
                      <span className="text-dim">
                        {flag(r.region) && <span aria-hidden className="mr-1">{flag(r.region)}</span>}
                        {place(r.region)}{r.currency ? ` · ${r.currency}` : ''}
                      </span>
                      <span className="text-faint text-xs ml-auto">{ago(r.submitted_at_secs)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <span className="text-mute">
                        {prices ? `${prices} price${prices === 1 ? '' : 's'} accepted` : verified ? 'no prices accepted' : 'nothing published'}
                      </span>
                      {paid && (
                        <a
                          href={paid.url}
                          target="_blank"
                          rel="noreferrer"
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] ${
                            paid.tone === 'paid' ? 'bg-[#10B981]/10 text-accent hover:bg-[#10B981]/20' : 'bg-zinc-500/10 text-dim hover:bg-zinc-500/20'
                          }`}
                        >
                          <Coins size={11} aria-hidden /> {paid.label} <ExternalLink size={10} aria-hidden />
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            </div>
          </section>

          <section>
            <SectionHead eyebrow="On-chain" title="Where it lives" />
            <div className="rounded-3xl border border-line bg-card backdrop-blur-md p-5 sm:p-6 space-y-4">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-mute">Verifies · NEAR testnet</p>
              {reports?.contractUrl ? (
                <a href={reports.contractUrl} target="_blank" rel="noreferrer" className="font-mono text-xs text-fg break-all hover:text-accent inline-flex items-center gap-1">
                  {reports.contract} <ExternalLink size={11} aria-hidden />
                </a>
              ) : <Skel className="h-4 w-48" />}
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-mute">Pays · Solana devnet</p>
              {reports?.solana ? (
                <a href={reports.solana.programUrl} target="_blank" rel="noreferrer" className="font-mono text-xs text-fg break-all hover:text-accent inline-flex items-center gap-1">
                  {reports.solana.program} <ExternalLink size={11} aria-hidden />
                </a>
              ) : <Skel className="h-4 w-56" />}
            </div>
            {reports?.solana && (
              <p className="flex gap-2 text-xs text-dim">
                <ShieldCheck size={14} aria-hidden className={`shrink-0 ${reports.solana.nearIsAttester ? 'text-accent' : 'text-red-500'}`} />
                {reports.solana.nearIsAttester
                  ? 'The Solana program only accepts filings signed by the NEAR contract’s key.'
                  : 'The Solana program’s attester does not match the NEAR contract right now.'}
              </p>
            )}
            <a
              href={BOT_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#10B981] hover:bg-[#0ea371] text-[#06150f] font-bold text-sm shadow-[0_0_24px_rgba(16,185,129,0.25)] transition-shadow hover:shadow-[0_0_36px_rgba(16,185,129,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--page)]"
            >
              Send a receipt <ExternalLink size={14} aria-hidden />
            </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
