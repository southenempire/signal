'use client';

import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, RefreshCw, ExternalLink, Lock, FileCheck2, Cpu } from 'lucide-react';

type Check = { label: string; ok: boolean; detail: string };
type Attestation = {
  ok: boolean;
  model?: string;
  contract?: string;
  checkedAt?: string;
  error?: string;
  attestations?: { address: string | null; evidenceSha256: string; checks: Check[] }[];
};
type Outcome = { Accepted: { promoted: number[] } } | 'Held' | { Rejected: { reason: string } };
type Report = {
  id: number;
  reporter: string;
  status: 'Verified' | 'Unverified' | 'Fraud';
  reason: string;
  category: string;
  currency: string | null;
  region: string;
  items: { feed: string; price: number; outcome: Outcome }[];
  model: string;
  signer: string;
  completion_id: string;
  request_sha256: string;
  response_sha256: string;
  image_sha256: string;
  submitted_at_secs: number;
};
type Reports = {
  live: boolean;
  contract: string;
  contractUrl?: string;
  reportsCount?: number;
  feedsCount?: number;
  prompts?: string[];
  reports: Report[];
  error?: string;
};

const short = (h: string, n = 10) => (h.length > 2 * n ? `${h.slice(0, n)}…${h.slice(-6)}` : h);

function outcomeLabel(o: Outcome) {
  if (o === 'Held') return { text: 'held for peers', tone: 'text-amber-400' };
  if ('Accepted' in o) return { text: o.Accepted.promoted.length ? `accepted (+${o.Accepted.promoted.length} held)` : 'accepted', tone: 'text-[#10B981]' };
  return { text: `rejected: ${o.Rejected.reason}`, tone: 'text-red-400' };
}

function CheckRow({ c }: { c: Check }) {
  return (
    <li className="flex gap-3 py-2.5 border-b border-white/5 last:border-0">
      {c.ok ? <CheckCircle2 size={18} className="text-[#10B981] shrink-0 mt-0.5" /> : <XCircle size={18} className="text-red-400 shrink-0 mt-0.5" />}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">{c.label}</p>
        <p className="text-xs font-mono text-zinc-400 break-all">{c.detail}</p>
      </div>
    </li>
  );
}

const RULES = [
  'Signature recovers (ecrecover, EIP-191) to a NEAR AI model key registered from a verified attestation',
  'The contract hashes the exact request and response bytes itself — change one byte and the signature fails',
  "Request = Signal's registered prompt + one image URL carrying the photo's sha256; no system prompt, tools, logit bias or high temperature",
  'Response finished normally, is under an hour old, and was never filed before',
  'Photo hash never filed before; the photo itself never goes on-chain',
  'Prices outside ±40% of a feed’s median wait for 2 independent reporters before joining',
];

export default function VerifyPage() {
  const [att, setAtt] = useState<Attestation | null>(null);
  const [checking, setChecking] = useState(false);
  const [data, setData] = useState<Reports | null>(null);

  const runCheck = useCallback(() => {
    setChecking(true);
    fetch('/api/near/attestation', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setAtt)
      .catch(() => setAtt({ ok: false, error: 'Could not reach the attestation check' }))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    runCheck();
    fetch('/api/near/reports', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ live: false, contract: '', reports: [], error: 'NEAR RPC unreachable' }));
  }, [runCheck]);

  return (
    <div className="min-h-[calc(100dvh-5rem)] w-full bg-[#0a0a0c] text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8">
        <header className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center">
              <ShieldCheck size={20} className="text-[#10B981]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Verify</h1>
          </div>
          <p className="text-zinc-400 max-w-3xl">
            Every price Signal files on NEAR was read by NEAR AI&apos;s vision model inside a TEE (Intel TDX + NVIDIA GPU).
            The model signs what it saw, and the NEAR contract checks that signature before accepting a single price.
            Receipt photos are never stored by Signal or put on-chain — only their hashes.
          </p>
        </header>

        {/* Live attestation */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Cpu size={18} className="text-[#10B981]" />
              <h2 className="font-bold">Live attestation check</h2>
              {att && !checking && (
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${att.ok ? 'bg-[#10B981]/15 text-[#10B981]' : 'bg-red-500/15 text-red-400'}`}>
                  {att.ok ? 'Verified' : 'Not verified'}
                </span>
              )}
            </div>
            <button
              onClick={runCheck}
              disabled={checking}
              className="flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-50"
            >
              <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
              {checking ? 'Checking…' : 'Check again'}
            </button>
          </div>
          {checking && !att && <p className="text-sm text-zinc-500">Fetching NEAR AI&apos;s attestation with a fresh nonce and verifying it…</p>}
          {att?.error && <p className="text-sm text-red-400 font-mono break-all">{att.error}</p>}
          {att?.attestations?.map((a, i) => (
            <div key={i}>
              <p className="text-xs text-zinc-500 mb-1">
                {att.model} · checked {att.checkedAt ? new Date(att.checkedAt).toLocaleString() : ''} · evidence sha256 {short(a.evidenceSha256)}
              </p>
              <ul>{a.checks.map((c) => <CheckRow key={c.label} c={c} />)}</ul>
            </div>
          ))}
        </section>

        {/* Contract rules */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileCheck2 size={18} className="text-[#10B981]" />
            <h2 className="font-bold">What the contract checks on every filing</h2>
          </div>
          <ul className="space-y-2">
            {RULES.map((r) => (
              <li key={r} className="flex gap-2 text-sm text-zinc-300">
                <CheckCircle2 size={16} className="text-[#10B981] shrink-0 mt-0.5" />
                {r}
              </li>
            ))}
          </ul>
          {data?.prompts && (
            <p className="mt-4 text-xs text-zinc-500 font-mono break-all">
              Registered prompt sha256: {data.prompts.join(', ')}
            </p>
          )}
        </section>

        {/* Reports */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-bold flex items-center gap-2"><Lock size={18} className="text-[#10B981]" /> Recent reports on NEAR</h2>
            {data?.live && (
              <a href={data.contractUrl} target="_blank" rel="noreferrer" className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-mono">
                {data.contract} · {data.reportsCount} reports · {data.feedsCount} feeds <ExternalLink size={12} />
              </a>
            )}
          </div>
          {!data && <p className="text-sm text-zinc-500">Reading the contract…</p>}
          {data && !data.live && <p className="text-sm text-red-400">{data.error || 'NEAR is unreachable right now.'}</p>}
          {data?.live && data.reports.length === 0 && <p className="text-sm text-zinc-500">No reports filed yet.</p>}
          {data?.reports.map((r) => (
            <article key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-black">#{r.id}</span>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                  r.status === 'Verified' ? 'bg-[#10B981]/15 text-[#10B981]' : r.status === 'Fraud' ? 'bg-red-500/15 text-red-400' : 'bg-zinc-500/15 text-zinc-400'
                }`}>{r.status}</span>
                <span className="text-xs text-zinc-400">{r.category} · {r.region}{r.currency ? ` · ${r.currency}` : ''}</span>
                <span className="text-xs text-zinc-500 ml-auto">{new Date(r.submitted_at_secs * 1000).toLocaleString()}</span>
              </div>
              {r.reason && <p className="text-sm text-zinc-400">“{r.reason}”</p>}
              {r.items.length > 0 && (
                <ul className="text-sm space-y-1">
                  {r.items.map((it) => {
                    const o = outcomeLabel(it.outcome);
                    return (
                      <li key={it.feed} className="flex flex-wrap gap-x-3 font-mono text-xs">
                        <span className="text-zinc-300 break-all">{it.feed}</span>
                        <span className="text-white">{(it.price / 100).toFixed(2)} {r.currency}</span>
                        <span className={o.tone}>{o.text}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-[11px] font-mono text-zinc-500 pt-2 border-t border-white/5">
                <div className="break-all"><dt className="inline text-zinc-600">TEE signer </dt><dd className="inline text-[#10B981]">0x{short(r.signer, 8)}</dd></div>
                <div className="break-all"><dt className="inline text-zinc-600">model </dt><dd className="inline">{r.model}</dd></div>
                <div className="break-all"><dt className="inline text-zinc-600">request sha256 </dt><dd className="inline">{short(r.request_sha256)}</dd></div>
                <div className="break-all"><dt className="inline text-zinc-600">response sha256 </dt><dd className="inline">{short(r.response_sha256)}</dd></div>
                <div className="break-all"><dt className="inline text-zinc-600">photo sha256 </dt><dd className="inline">{short(r.image_sha256)} (photo not stored)</dd></div>
                <div className="break-all"><dt className="inline text-zinc-600">completion </dt><dd className="inline">{r.completion_id}</dd></div>
              </dl>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 space-y-2 text-sm text-zinc-400">
          <h2 className="font-bold text-white">Check it yourself</h2>
          <p>Read any report or feed straight from NEAR:</p>
          <pre className="text-xs font-mono bg-black/40 rounded-lg p-3 overflow-x-auto">{`near view ${data?.contract || 'oracle.signal-southen.testnet'} get_report '{"id": 0}'
near view ${data?.contract || 'oracle.signal-southen.testnet'} list_feeds '{}'`}</pre>
          <p>
            Re-verify the model key from NEAR AI&apos;s attestation with{' '}
            <code className="font-mono text-zinc-300">signal-near/scripts/register-signer.mjs</code> in the{' '}
            <a className="underline hover:text-white" href="https://github.com/southenempire/signal" target="_blank" rel="noreferrer">repository</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
