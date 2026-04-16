"use client";

import { useState } from "react";
import { BookOpen, Zap, Shield, Database, Code, ArrowRight, Send, Copy } from "lucide-react";
import Link from "next/link";

const sections = [
  {
    group: "Introduction",
    items: [
      { id: "what-is-signal", label: "What is Signal?" },
      { id: "core-concepts", label: "Core Concepts" },
      { id: "vision-ai", label: "Vision AI Verification" },
    ],
  },
  {
    group: "Developers",
    items: [
      { id: "quickstart", label: "Quickstart SDK" },
      { id: "jupiter", label: "Jupiter Integration" },
      { id: "anchor", label: "Anchor Contracts" },
    ],
  },
];

const content: Record<string, React.ReactNode> = {
  "what-is-signal": (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-indigo-400 font-medium">
        <BookOpen size={18} />
        <span className="text-sm">Introduction / What is Signal?</span>
      </div>
      <h2 className="text-3xl font-bold glow-text">What is Signal?</h2>
      <p className="text-zinc-400 leading-relaxed text-lg">
        Signal is a <strong className="text-white">Decentralized Physical Infrastructure Network (DePIN)</strong> built on Solana. It creates a human-powered oracle that collects and verifies real-world data — like fuel prices, grocery costs, and local electricity rates — by paying everyday people to report it via Telegram.
      </p>
      <p className="text-zinc-400 leading-relaxed">
        The data becomes a verified, on-chain intelligence feed that AI agents, hedge funds, and enterprise systems can subscribe to and pay for using USDC via Jupiter.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
        {[
          { icon: <Send size={20} className="text-indigo-400"/>, title: "Earn via Telegram", desc: "Report prices with a photo. No wallet setup. Your account is created in seconds." },
          { icon: <Zap size={20} className="text-yellow-400"/>, title: "Instant USDC Payouts", desc: "Consensus rewards distributed automatically to verified reporters on Solana." },
          { icon: <Shield size={20} className="text-emerald-400"/>, title: "Vision AI Verified", desc: "GPT-4o Vision extracts and cross-references data from your submitted photos." },
          { icon: <Database size={20} className="text-fuchsia-400"/>, title: "Live Intel Feeds", desc: "Marketplace for AI agents and businesses to buy real-time physical world data." },
        ].map((item, i) => (
          <div key={i} className="glass-card p-5 flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">{item.icon}</div>
            <div>
              <h3 className="font-bold mb-1">{item.title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  ),

  "core-concepts": (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-indigo-400 font-medium">
        <BookOpen size={18} />
        <span className="text-sm">Introduction / Core Concepts</span>
      </div>
      <h2 className="text-3xl font-bold">Core Concepts</h2>
      
      {[
        {
          term: "Signalers",
          def: "Human reporters who submit real-world data via the Telegram bot. Each submission is staked with 0.01 SOL to prevent spam. Upon consensus, they receive 90% of the data sale price in USDC."
        },
        {
          term: "Categories",
          def: "Named data feeds, e.g. FUEL_NYC_REGULAR or WHEAT_US_MIDWEST. Each category has a minimum reporter threshold and a query price. Categories are created on-chain by the Signal admin."
        },
        {
          term: "Consensus Engine",
          def: "When enough Signalers report data for the same category and location window, the Anchor program calculates the median oracle price and marks the feed as verified. Outliers beyond 2 standard deviations are flagged and slashed."
        },
        {
          term: "Protocol Fee",
          def: "Signal retains 10% of every data purchase as a protocol fee. The remaining 90% is distributed among the reporters who contributed to that verified data set."
        },
        {
          term: "Staking & Slashing",
          def: "Every report requires a 0.01 SOL stake held in escrow. If a reporter's value is flagged as fraudulent by the Vision AI or consensus mechanism, 100% of the stake is redistributed to the honest reporters in that batch."
        },
      ].map((item, i) => (
        <div key={i} className="border-l-2 border-indigo-500/40 pl-5 py-1">
          <h3 className="font-bold text-white mb-2">{item.term}</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">{item.def}</p>
        </div>
      ))}
    </div>
  ),

  "vision-ai": (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-indigo-400 font-medium">
        <Shield size={18} />
        <span className="text-sm">Introduction / Vision AI Verification</span>
      </div>
      <h2 className="text-3xl font-bold">Vision AI Verification</h2>
      <p className="text-zinc-400 leading-relaxed">
        Signal uses GPT-4o Vision to automatically extract structured pricing data from user-submitted photos. This creates a hard barrier against fake data without requiring users to manually type numbers.
      </p>
      <div className="space-y-4">
        <h3 className="text-lg font-bold">The Verification Flow</h3>
        {["User submits photo + stated price via Telegram bot", "Photo is sent to OpenAI Vision API", "API extracts price, product, and location metadata", "Extracted price is compared against the user's stated value (±5% tolerance)", "If matched, submission is marked valid and staked on-chain", "If mismatched, submission is rejected and stake returned"].map((step, i) => (
          <div key={i} className="flex gap-3 items-start">
            <span className="w-6 h-6 bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-full flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
            <p className="text-zinc-400 text-sm leading-relaxed">{step}</p>
          </div>
        ))}
      </div>
      <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 text-sm">
        <strong>Privacy Note:</strong> Images are processed ephemerally and never stored. Only the extracted price metadata is retained on our servers to generate the data feed.
      </div>
    </div>
  ),

  "quickstart": (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-indigo-400 font-medium">
        <Code size={18} />
        <span className="text-sm">Developers / Quickstart SDK</span>
      </div>
      <h2 className="text-3xl font-bold">Quickstart: Signal SDK</h2>
      <p className="text-zinc-400 leading-relaxed">
        The <code className="text-indigo-300 bg-white/5 px-1.5 py-0.5 rounded">@signal-network/sdk</code> provides a clean interface to interact with the Signal program on Solana. Available for Node.js and browser environments.
      </p>
      
      <div>
        <h3 className="font-bold mb-3">Install</h3>
        <pre className="bg-[#0f111a] border border-white/10 rounded-xl p-4 text-sm font-mono text-indigo-300">
{`npm install @signal-network/sdk @solana/web3.js`}
        </pre>
      </div>

      <div>
        <h3 className="font-bold mb-3">Fetch a Live Data Feed</h3>
        <pre className="bg-[#0f111a] border border-white/10 rounded-xl p-4 text-sm font-mono text-indigo-300 overflow-x-auto leading-relaxed">
{`import { SignalClient } from '@signal-network/sdk';

const client = new SignalClient(
  process.env.RPC_ENDPOINT,
  wallet
);

// Purchase and stream NYC fuel prices
const result = await client.purchaseData(
  'FUEL_NYC_REGULAR',
  verifierPublicKey
);

console.log('Oracle price:', result.oraclePrice);`}
        </pre>
      </div>

      <div>
        <h3 className="font-bold mb-3">Submit a Report (Signaler)</h3>
        <pre className="bg-[#0f111a] border border-white/10 rounded-xl p-4 text-sm font-mono text-indigo-300 overflow-x-auto leading-relaxed">
{`// Requires 0.01 SOL stake — returned on consensus
const txSig = await client.submitReport(
  'FUEL_NYC_REGULAR',  // category name
  329,                  // value in cents ($3.29)
  locationHash,         // keccak256(lat + lng)
  imageHash             // keccak256(photo bytes)
);`}
        </pre>
      </div>
    </div>
  ),

  "jupiter": (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-indigo-400 font-medium">
        <Zap size={18} />
        <span className="text-sm">Developers / Jupiter Integration</span>
      </div>
      <h2 className="text-3xl font-bold">Jupiter Integration</h2>
      <p className="text-zinc-400 leading-relaxed">
        Signal uses Jupiter as its payment rail. When an AI agent or enterprise buyer pays for a data feed, Jupiter Swap automatically converts any SPL token into USDC before the protocol distributes rewards to reporters.
      </p>

      <div className="space-y-4">
        {[
          { title: "Any Token → USDC", desc: "Buyers can pay with SOL, JUP, BONK, or any SPL token. Jupiter routes the swap at the best rate automatically." },
          { title: "Jupiter DCA for Subscriptions", desc: "Enterprise subscribers can use Jupiter DCA to make recurring payments for continuous data stream access." },
          { title: "Best Price Execution", desc: "Jupiter's aggregator ensures reporters always receive the maximum USDC value regardless of the buyer's native token." },
        ].map((item, i) => (
          <div key={i} className="glass-card p-5">
            <h3 className="font-bold mb-2">{item.title}</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-sm">
        <strong>Jupiter Track Bounty:</strong> Signal is targeting the $3,000 Jupiter side-track at the Colosseum Frontier Hackathon for its deep integration of Jupiter Swap and DCA as the core payment infrastructure.
      </div>
    </div>
  ),

  "anchor": (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-indigo-400 font-medium">
        <Code size={18} />
        <span className="text-sm">Developers / Anchor Contracts</span>
      </div>
      <h2 className="text-3xl font-bold">Anchor Contracts</h2>
      <p className="text-zinc-400 leading-relaxed">
        The Signal program is a hardened Anchor (Rust) smart contract deployed on Solana. It manages data registration, verified submissions, protocol fee distribution, and anti-fraud slashing.
      </p>

      <div className="space-y-3">
        <h3 className="font-bold">Program Instructions</h3>
        {[
          { name: "initialize", desc: "Initializes the global state PDA with admin and fee recipient config." },
          { name: "create_category", desc: "Creates a named data feed category with min_reporters and query_price." },
          { name: "submit_report", desc: "Submits a staked data report with location + image hash proofs." },
          { name: "purchase_data", desc: "Handles payments — 10% to protocol, 90% to verified reporters." },
        ].map((item, i) => (
          <div key={i} className="flex gap-3 items-start p-3 bg-white/3 rounded-lg border border-white/5">
            <code className="text-indigo-300 text-sm font-mono shrink-0">{item.name}</code>
            <p className="text-zinc-400 text-sm">{item.desc}</p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="font-bold mb-3">Account PDAs</h3>
        <pre className="bg-[#0f111a] border border-white/10 rounded-xl p-4 text-sm font-mono text-zinc-300 overflow-x-auto leading-relaxed">
{`// Global State: [b"global-state"]
// Category:     [b"category", name.as_bytes()]
// Submission:   [b"submission", category.key, reporter.key]`}
        </pre>
      </div>

      <a
        href="https://github.com"
        target="_blank"
        rel="noopener"
        className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
      >
        View Source on GitHub <ArrowRight size={14}/>
      </a>
    </div>
  ),
};

export default function Docs() {
  const [active, setActive] = useState("what-is-signal");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/5 bg-[#0a0a0f]/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold">S</div>
            <span className="font-bold">SIGNAL</span>
            <span className="text-zinc-500 text-sm hidden sm:inline">/ Docs</span>
          </Link>
          <a
            href="https://t.me/OfficialSignalOracleBot"
            target="_blank"
            rel="noopener"
            className="primary-btn flex items-center gap-2 text-sm"
          >
            <Send size={14}/> Open Bot
          </a>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 flex gap-8 flex-1 w-full">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 hidden lg:block">
          <nav className="sticky top-24 flex flex-col gap-6">
            {sections.map(section => (
              <div key={section.group}>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">{section.group}</p>
                <div className="flex flex-col gap-1">
                  {section.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setActive(item.id)}
                      className={`text-left py-2 px-3 rounded-lg text-sm transition-all ${active === item.id ? 'bg-indigo-500/10 text-indigo-300 font-medium' : 'text-zinc-400 hover:text-white'}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Mobile nav */}
        <div className="lg:hidden mb-6 w-full">
          <select
            value={active}
            onChange={e => setActive(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white"
          >
            {sections.map(section =>
              section.items.map(item => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))
            )}
          </select>
        </div>

        {/* Content */}
        <main className="flex-1 min-w-0 max-w-3xl">
          {content[active]}
        </main>
      </div>
    </div>
  );
}
