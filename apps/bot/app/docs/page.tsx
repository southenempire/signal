'use client';

import { useState, useRef, useEffect } from 'react';
import { Book, Terminal, Eye, ShieldCheck, Coins, Layers, Smartphone, CheckCircle2, ExternalLink, Database, Map, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const BOT_API = 'https://signal-production-d83e.up.railway.app';
const PROGRAM_ID = 'HmCLsXYjktA3EaSmipee7qzDNTefJASUWaXeiafwmquS';
const BOTCHAIN_ORACLE = '0x9119b3D7e7DcC540F08D62CeBC5bC2f83e8793f2';
const REPO = 'https://github.com/southenempire/signal';

/* ═══════════════════════════════════════════════════════
   CINEMATIC DATA NETWORK BACKGROUND
   ═══════════════════════════════════════════════════════ */
function DataNetworkBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let raf: number;
    let W = 0, H = 0;

    const particles: any[] = [];
    const COUNT = 60;

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        r: Math.random() * 1.5 + 0.5,
      });
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Draw Connections
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 200) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw Nodes
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={ref} className="fixed inset-0 pointer-events-none z-0" />;
}

/* ═══════════════════════════════════════════════════════
   SMALL BUILDING BLOCKS
   ═══════════════════════════════════════════════════════ */
function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="bg-code rounded-3xl overflow-hidden border border-line shadow-2xl">
      <div className="px-5 sm:px-6 py-4 border-b border-line flex justify-between items-center bg-card">
        <span className="text-[10px] font-black uppercase tracking-widest text-mute">{title}</span>
        <Terminal size={14} className="text-mute" />
      </div>
      <pre className="p-5 sm:p-8 font-mono text-xs leading-relaxed text-soft overflow-x-auto">{code}</pre>
    </div>
  );
}

function SectionLabel({ children, color = '#10B981' }: { children: React.ReactNode; color?: string }) {
  return <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-4" style={{ color }}>{children}</div>;
}

function Rule({ title, desc }: { title: string; desc: React.ReactNode }) {
  return (
    <div className="flex gap-4 p-5 rounded-2xl bg-card border border-line">
      <div className="w-6 h-6 rounded-lg bg-[#10B981]/20 flex items-center justify-center shrink-0">
        <CheckCircle2 size={14} className="text-accent" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-bold text-fg mb-1">{title}</div>
        <div className="text-xs text-mute leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   LIVE FEED VIEWER — real data from the Solana program
   ═══════════════════════════════════════════════════════ */
type FeedRow = { feed: string; medianUsd: number | null; samples: number; updatedAt: string | null; account?: string };

function LiveFeeds() {
  const [feeds, setFeeds] = useState<FeedRow[] | null>(null);
  const [live, setLive] = useState(true);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/feeds');
      const data = await res.json();
      // Only named feeds with at least one accepted price. Feeds with 0 samples are still
      // pending; unnamed ones (a bare hash) weren't filed by this deployment's bot.
      setFeeds((data.feeds || []).filter((f: FeedRow) => f.samples > 0 && f.medianUsd !== null && f.feed.includes(':')));
      setLive(!!data.live);
    } catch {
      setFeeds([]);
      setLive(false);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <button
        onClick={load}
        disabled={loading}
        className="w-full h-12 rounded-2xl bg-[#10B981] text-[#0a0a0c] font-black uppercase tracking-widest text-[10px] hover:bg-[#00e5a0] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        {loading ? 'Reading feeds…' : 'Refresh live feeds'}
      </button>

      {feeds && feeds.length === 0 && (
        <div className="p-5 rounded-2xl bg-card border border-line text-xs text-mute">
          {live ? 'No accepted prices yet. Feeds appear once consensus accepts a report.' : 'The Signal API is unreachable right now.'}
        </div>
      )}

      {feeds && feeds.length > 0 && (
        <div className="rounded-2xl border border-line overflow-hidden">
          {feeds.map((f) => (
            <div key={f.feed} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-line last:border-b-0 bg-card">
              <div className="min-w-0">
                <div className="font-mono text-[11px] text-soft truncate">{f.feed}</div>
                <div className="text-[10px] text-faint">
                  {f.samples} sample{f.samples === 1 ? '' : 's'}
                  {f.updatedAt ? ` · updated ${new Date(f.updatedAt).toLocaleDateString()}` : ''}
                </div>
              </div>
              <div className="font-mono text-sm font-bold text-accent shrink-0">
                {f.medianUsd === null ? '—' : `$${f.medianUsd.toFixed(2)}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   CODE SAMPLES (all work against the live devnet deployment)
   ═══════════════════════════════════════════════════════ */
const NEAR_SAMPLE = `# Every feed: item, city, currency, median and recent prices (view calls are free)
near view oracle.signal-southen.testnet list_feeds '{}'

# One feed
near view oracle.signal-southen.testnet get_feed '{"feed": "FUEL:ng-port_harcourt:petrol_litre:NGN"}'

# A receipt's full record: AI signer, request/response hashes, photo hash, outcome per price
near view oracle.signal-southen.testnet get_report '{"id": 0}'`;

const REST_SAMPLE = `# NEAR feeds and counts, via the bot
curl ${BOT_API}/api/near

# Network stats (reports, rewards paid, reward pool)
curl ${BOT_API}/api/stats`;

const SOLANA_SAMPLE = `import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { createHash } from "crypto";
import idl from "./signal_oracle.json"; // from signal-bot/idl in the repo

const connection = new Connection("https://api.devnet.solana.com");
const program = new anchor.Program(idl as anchor.Idl, { connection });

// Feed accounts are PDAs: ["feed", sha256(feed key)]. Prices filed through NEAR use the NEAR key and
// are in minor units of that currency; feeds from before the NEAR integration are USD with 6 decimals.
const key = "GROCERY:ng-port_harcourt:rice_kg:NGN";
const [feedPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("feed"), createHash("sha256").update(key).digest()],
  program.programId,
);

const feed = await program.account.feed.fetch(feedPda);
const prices = feed.prices.slice(0, feed.len).map((p) => p.toNumber()).sort((a, b) => a - b);
const median = prices[Math.floor((prices.length - 1) / 2)] / 100; // NGN (kobo → naira)
console.log(key, "median", median, "NGN from", feed.len, "recent prices");`;

const BOTCHAIN_SAMPLE = `import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://rpc.botchain.ai", 677);
const oracle = new ethers.Contract("${BOTCHAIN_ORACLE}", [
  "function getFeed(string feedKey) view returns (uint256 medianPrice, uint256 samples, uint256 updatedAt)",
], provider);

const [cents, samples] = await oracle.getFeed("GROCERY:ng-port_harcourt:rice_kg");
console.log("median $" + Number(cents) / 100, "from", samples.toString(), "samples");`;

export default function DocsPage() {
  const sections = [
    { id: 'introduction', label: 'Introduction', icon: Book },
    { id: 'how-it-works', label: 'How it works', icon: Layers },
    { id: 'consensus', label: 'Consensus', icon: Eye },
    { id: 'rewards', label: 'Rewards & reputation', icon: Coins },
    { id: 'reading-data', label: 'Reading the data', icon: Database },
    { id: 'deployments', label: 'Deployments', icon: Map },
    { id: 'security', label: 'Security model', icon: ShieldCheck },
    { id: 'roadmap', label: 'Roadmap', icon: Terminal },
  ];

  return (
    <div className="min-h-screen bg-page text-dim relative overflow-hidden">
      <DataNetworkBackground />

      {/* Cinematic Overlays (clipped, or the 600px glow widens the page on phones) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[10%] left-[20%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.03) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.02) 0%, transparent 70%)', filter: 'blur(100px)' }} />
      </div>

      <div className="max-w-8xl mx-auto flex relative z-10">

        {/* ── SIDEBAR NAVIGATION (desktop) ────────────────────────── */}
        <aside className="hidden lg:block w-80 h-screen sticky top-0 border-r border-line bg-page p-10 overflow-y-auto z-50">
          <Link href="/" className="mb-12 flex items-center gap-3 group">
             <div className="relative w-8 h-8 rounded-xl overflow-hidden border border-line group-hover:border-[#10B981]/50 transition-all shadow-2xl">
                <Image src="/logo.png" alt="Signal" fill className="object-cover transition-transform group-hover:scale-110" />
             </div>
             <span className="text-fg font-display font-bold tracking-tight text-lg">Signal Docs</span>
          </Link>

          <div className="space-y-10">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-faint mb-6">Contents</div>
              <nav className="space-y-2">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="group flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-card-hover transition-all text-sm font-medium text-mute hover:text-fg border border-transparent hover:border-line"
                  >
                    <s.icon size={16} className="group-hover:text-accent transition-colors" />
                    {s.label}
                  </a>
                ))}
              </nav>
            </div>

            <div className="p-6 rounded-3xl bg-[#10B981]/5 border border-[#10B981]/10">
               <div className="text-[9px] font-black uppercase tracking-widest text-accent mb-2">Status</div>
               <div className="text-[11px] text-dim leading-relaxed">
                  Devnet pilot. Rewards are paid in test USDC while the network is being proven.
               </div>
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ──────────────────────────────── */}
        {/* min-w-0 lets this flex column shrink below its longest unbreakable line (code) on phones */}
        <main className="flex-1 min-w-0 px-5 sm:px-12 lg:px-24 py-10 sm:py-16 lg:py-24 max-w-5xl">

          <div className="max-w-3xl">
            {/* Header */}
            <header id="introduction" className="mb-20">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#10B981]/5 border border-[#10B981]/10 rounded-full text-[10px] font-black uppercase tracking-widest text-accent mb-8">
                 Devnet · Pilot
              </div>
              <h1 className="text-4xl sm:text-5xl font-display font-black text-fg tracking-tight mb-6">
                Build with <span className="text-accent">Ground Truth.</span>
              </h1>
              <p className="text-lg leading-relaxed text-mute">
                Signal is a price oracle for the physical economy. People photograph receipts, price tags and fuel pumps
                in Telegram; NEAR AI&apos;s vision model reads them inside a secure enclave; a NEAR contract checks its signature
                and decides which prices to trust; a Solana program pays for them. The result is a set of per-item, per-city
                price feeds that any app or program can read.
              </p>
            </header>

            <div className="space-y-24 sm:space-y-32">

              {/* How it works */}
              <section id="how-it-works">
                <SectionLabel>Overview</SectionLabel>
                <h2 className="text-3xl font-display font-black text-fg mb-8">How it works</h2>
                <div className="space-y-4">
                  <Rule title="1. Capture" desc="A reporter sends a photo to @OfficialSignalOracleBot. The bot creates a Solana wallet for them on first use, so no crypto setup is needed." />
                  <Rule title="2. Read, privately" desc="NEAR AI's vision model (Qwen3.8) reads the receipt inside a TEE (Intel TDX + NVIDIA GPU) and signs what it saw. It rejects screenshots and flags edited images or text that tries to instruct it, and returns only the city, date, items and prices. Signal never stores the photo." />
                  <Rule title="3. Verify on NEAR" desc="The Signal contract on NEAR checks the AI's signature on-chain, that the official prompt was used, and that the photo is new, then applies the price rules (local median, peer quorum) to accept or hold each price." />
                  <Rule title="4. File on Solana" desc="For each accepted price, the NEAR contract builds the Solana filing itself and NEAR's MPC network signs it (Chain Signatures). The Signal program on Solana only accepts filings from that key." />
                  <Rule title="5. Pay" desc="The Solana program pays the reward from its vault and updates the reporter's reputation; fakes are penalised. Every step is visible on the Verify page." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">
                  <div className="p-6 sm:p-8 rounded-[32px] bg-card border border-line">
                    <div className="w-10 h-10 rounded-2xl bg-[#3B82F6]/10 flex items-center justify-center border border-[#3B82F6]/20 mb-6">
                      <Smartphone size={20} className="text-[#3B82F6]" />
                    </div>
                    <h4 className="text-fg font-bold mb-3">Off-chain</h4>
                    <p className="text-xs text-mute leading-relaxed">
                      The bot relays photos and transactions, but can't decide anything: the AI's verdict is signed in a TEE, NEAR checks it, and only NEAR's key can file on Solana.
                    </p>
                  </div>
                  <div className="p-6 sm:p-8 rounded-[32px] bg-card border border-line">
                    <div className="w-10 h-10 rounded-2xl bg-[#10B981]/10 flex items-center justify-center border border-[#10B981]/20 mb-6">
                      <ShieldCheck size={20} className="text-accent" />
                    </div>
                    <h4 className="text-fg font-bold mb-3">On-chain</h4>
                    <p className="text-xs text-mute leading-relaxed">
                      Which prices count (the AI signature, the prompt, price bounds and peer quorum) is enforced by the NEAR contract. Rewards, reputation and slashing are enforced by the Solana program, which only accepts filings signed by the NEAR contract&apos;s key.
                    </p>
                  </div>
                </div>
              </section>

              {/* Consensus */}
              <section id="consensus">
                <SectionLabel>Verification</SectionLabel>
                <h2 className="text-3xl font-display font-black text-fg mb-8">Consensus rules</h2>
                <p className="text-mute leading-relaxed mb-8">
                  These rules run in the Signal contract on NEAR, for every price NEAR AI read from a verified photo. The Solana
                  program then pays what NEAR accepted, without judging it again, so the two chains can&apos;t disagree.
                </p>
                <div className="space-y-4">
                  <Rule title="Local price bounds" desc="Once a feed has 3 or more accepted prices, a new price within ±40% of the feed's median is accepted immediately and paid on Solana." />
                  <Rule title="Peer quorum" desc="A price outside that range is held, not rejected. It joins the feed when 2 other reporters independently report a price within ±25% of it, and of each other, within 72 hours. Held prices nobody confirms drop out without a reward." />
                  <Rule title="One price per photo" desc="Each photo prices an item once, and the same photo can't be filed twice. Photos from hosts other than the bot can only add prices inside an established feed's bounds." />
                  <Rule title="Fakes" desc="If NEAR AI judges a photo edited, generated, or carrying instructions aimed at the AI, the report is recorded as fraud on NEAR and the reporter is penalised on Solana." />
                </div>
                <p className="text-xs text-faint leading-relaxed mt-6">
                  In practice: a verified receipt is checked and paid in about 30 to 40 seconds. A price far from the local median waits until other reporters see the same price.
                </p>
              </section>

              {/* Rewards */}
              <section id="rewards">
                <SectionLabel>Incentives</SectionLabel>
                <h2 className="text-3xl font-display font-black text-fg mb-8">Rewards &amp; reputation</h2>
                <div className="glass p-6 sm:p-10 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-8 opacity-10">
                      <Coins size={120} className="text-mute" />
                   </div>
                   <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div>
                        <h4 className="text-fg font-bold text-sm mb-4">Rewards</h4>
                        <p className="text-xs leading-relaxed text-mute">
                          Each accepted item pays <span className="text-fg">$0.10 – $0.30</span>, scaling with reputation ($0.20 at the starting reputation of 50).
                          Rewards come from a USDC vault owned by the program, funded by the treasury and, later, by data buyers. Nothing is paid until consensus accepts the report.
                        </p>
                      </div>
                      <div>
                        <h4 className="text-fg font-bold text-sm mb-4">Reputation (0–100)</h4>
                        <p className="text-xs leading-relaxed text-mute">
                          Starts at 50. <span className="text-fg">+3</span> per accepted report, <span className="text-fg">−20</span> per slashed report,
                          <span className="text-fg"> −10</span> for reusing someone else&apos;s photo, <span className="text-fg">−15</span> for a faked image. Below 15, reporting is blocked.
                        </p>
                      </div>
                   </div>
                </div>
              </section>

              {/* Reading the data */}
              <section id="reading-data">
                <SectionLabel>Developer</SectionLabel>
                <h2 className="text-3xl font-display font-black text-fg mb-8">Reading the data</h2>
                <p className="text-mute leading-relaxed mb-8">
                  Feeds are keyed <span className="font-mono text-soft">CATEGORY:region:item:CURRENCY</span>, for example{' '}
                  <span className="font-mono text-soft break-all">FUEL:ng-port_harcourt:petrol_litre:NGN</span>, and priced in the
                  receipt&apos;s own currency, in minor units (kobo, cents). The NEAR contract is the source of truth; there are four ways to read them, and all work today.
                </p>

                <div className="space-y-8">
                  <div>
                    <h4 className="text-fg font-bold mb-3">1. NEAR contract (source of truth, free to read)</h4>
                    <CodeBlock title="Terminal" code={NEAR_SAMPLE} />
                  </div>
                  <div>
                    <h4 className="text-fg font-bold mb-3">2. REST API (simplest)</h4>
                    <CodeBlock title="Terminal" code={REST_SAMPLE} />
                  </div>
                  <div>
                    <h4 className="text-fg font-bold mb-3">3. Solana program (where rewards are paid)</h4>
                    <CodeBlock title="read-feed.ts" code={SOLANA_SAMPLE} />
                  </div>
                  <div>
                    <h4 className="text-fg font-bold mb-3">4. BOTChain mirror (any EVM app)</h4>
                    <CodeBlock title="read-botchain.ts" code={BOTCHAIN_SAMPLE} />
                  </div>
                </div>

                <div className="glass p-1 rounded-3xl overflow-hidden border border-line mt-12">
                  <div className="bg-code p-5 sm:p-8 md:p-10 space-y-6">
                    <div>
                      <h4 className="text-fg font-bold text-lg mb-2">Live feeds</h4>
                      <p className="text-xs text-mute leading-relaxed">
                        Read straight from the Signal API right now. Each row is a feed with at least one accepted price, and its current median.
                      </p>
                    </div>
                    <LiveFeeds />
                  </div>
                </div>
              </section>

              {/* Deployments */}
              <section id="deployments">
                <SectionLabel>Reference</SectionLabel>
                <h2 className="text-3xl font-display font-black text-fg mb-8">Deployments</h2>
                <div className="rounded-2xl border border-line overflow-hidden text-xs">
                  {[
                    ['Solana program (devnet)', PROGRAM_ID, `https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`],
                    ['BOTChain mirror (chain 677)', BOTCHAIN_ORACLE, `https://scan.botchain.ai/address/${BOTCHAIN_ORACLE}`],
                    ['Signal API', BOT_API, `${BOT_API}/api/stats`],
                    ['Telegram bot', '@OfficialSignalOracleBot', 'https://t.me/OfficialSignalOracleBot'],
                    ['Source code', 'github.com/southenempire/signal', REPO],
                  ].map(([label, value, href]) => (
                    <a key={label} href={href} target="_blank" rel="noreferrer"
                       className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 px-4 py-3 border-b border-line last:border-b-0 bg-card hover:bg-card-hover transition-colors">
                      <span className="text-mute shrink-0">{label}</span>
                      <span className="font-mono text-soft break-all sm:text-right flex items-center gap-1.5">
                        {value} <ExternalLink size={10} className="shrink-0 text-faint" />
                      </span>
                    </a>
                  ))}
                </div>
              </section>

              {/* Security */}
              <section id="security" className="pb-16">
                <SectionLabel color="#ef4444">Security</SectionLabel>
                <h2 className="text-3xl font-display font-black text-fg mb-8">Security model</h2>
                <div className="space-y-4">
                  <Rule title="Duplicate photos" desc="Every photo is fingerprinted with SHA-256, and the fingerprint is part of the report's on-chain address, so the same photo can't be filed twice for the same item. Reusing someone else's photo costs 10 reputation; resending your own is simply ignored." />
                  <Rule title="Faked images" desc="The vision check rejects screenshots and flags edited or generated images, which costs 15 reputation." />
                  <Rule title="The reward pool" desc="Only the program can move funds out of the vault, and only for accepted reports, up to each report's locked reward. New reports are refused once the pool is fully committed." />
                </div>

                <div className="mt-8 p-6 sm:p-8 rounded-3xl bg-red-500/5 border border-red-500/10">
                  <div className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-3">Known limits</div>
                  <ul className="space-y-2 text-xs text-mute leading-relaxed list-disc pl-4">
                    <li>No chain can see a photo: they trust NEAR AI&apos;s attested model to read it. A convincingly generated receipt can still pass; the peer quorum limits what it can do to a feed.</li>
                    <li>One person with several Telegram accounts could confirm their own prices. Reputation is the only cost today.</li>
                    <li>A brand-new feed has no price bounds until 3 prices are accepted, so its first reports rely on peers.</li>
                  </ul>
                </div>
              </section>

              {/* Roadmap */}
              <section id="roadmap" className="pb-32">
                <SectionLabel color="#7C5CFC">Roadmap</SectionLabel>
                <h2 className="text-3xl font-display font-black text-fg mb-8">Not built yet</h2>
                <div className="space-y-4">
                  <Rule title="TypeScript SDK" desc="A published client with a one-line getFeed(key), built on the program's generated client." />
                  <Rule title="Reporter staking" desc="Reporters lock a small USDC stake that is slashed for fraud, in addition to reputation." />
                  <Rule title="Paid data access" desc="Per-query fees from data buyers flowing into the reward pool, so rewards are funded by usage." />
                  <Rule title="Mainnet" desc="Real USDC rewards after the devnet pilot." />
                </div>
              </section>

            </div>
          </div>
        </main>

      </div>
    </div>
  );
}
