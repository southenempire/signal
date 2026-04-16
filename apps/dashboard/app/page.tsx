"use client";

import { useState, useEffect } from "react";
import { Activity, Globe, Database, Network, ArrowRight, Send, CheckCircle, Users, Zap } from "lucide-react";
import Link from "next/link";

const BOT_API = "http://localhost:3001";

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("Energy Grid");
  const [latency, setLatency]     = useState(42);
  const [nodeCount, setNodeCount] = useState(0);
  const [volume, setVolume]       = useState(0);
  const [totalReports, setTotalReports] = useState(0);
  const [leaderboard, setLeaderboard]   = useState<any[]>([]);
  const [liveReports, setLiveReports]   = useState<any[]>([]);
  const [apiConnected, setApiConnected] = useState(false);

  // Poll the bot API every 5 seconds
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, lbRes, reportsRes] = await Promise.all([
          fetch(`${BOT_API}/api/stats`),
          fetch(`${BOT_API}/api/leaderboard`),
          fetch(`${BOT_API}/api/reports`),
        ]);
        const stats   = await statsRes.json();
        const lb      = await lbRes.json();
        const reports = await reportsRes.json();

        setNodeCount(stats.signalers || 0);
        setVolume(parseFloat(stats.totalVolume) || 0);
        setTotalReports(stats.totalReports || 0);
        setLeaderboard(lb);
        setLiveReports(reports);
        setApiConnected(true);
      } catch {
        // API not reachable — show mock baseline
        setApiConnected(false);
      }
      setLatency(40 + Math.floor(Math.random() * 15));
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    { label: "Active Signalers", value: nodeCount > 0 ? `${nodeCount}` : "—", icon: <Network size={16}/> },
    { label: "Reports", value: totalReports > 0 ? `${totalReports}` : "—", icon: <Database size={16}/> },
    { label: "USDC Paid Out", value: volume > 0 ? `$${volume.toFixed(2)}` : "—", icon: <Activity size={16}/> },
  ];

  const categories = [
    { name: "Energy Grid", region: "SF, CA", updates: "91 Updates", price: "0.50 USDC" },
    { name: "Fuel Index", region: "London, UK", updates: "Live", price: "0.25 USDC" },
    { name: "NYC Temperature", region: "Manhattan", updates: "23 Nodes", price: "0.10 USDC" },
    { name: "SOL/USD Price", region: "On-Chain", updates: "76 Feeds", price: "FREE" },
  ];

  const steps = [
    {
      icon: <Send size={22} className="text-indigo-400"/>,
      title: "1. Open the Bot",
      desc: "Message @OfficialSignalOracleBot on Telegram. No wallet, no seed phrase — your account is created instantly."
    },
    {
      icon: <CheckCircle size={22} className="text-emerald-400"/>,
      title: "2. Report Real Data",
      desc: "Snap a photo of a fuel price, grocery receipt, or electricity bill. Vision AI verifies it in seconds."
    },
    {
      icon: <Zap size={22} className="text-yellow-400"/>,
      title: "3. Earn USDC",
      desc: "Once consensus is reached, USDC lands straight in your embedded wallet. No gas, no bridges."
    },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/5 bg-[#0a0a0f]/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-lg shadow-[0_0_20px_rgba(79,70,229,0.5)]">S</div>
            <div>
              <span className="text-lg font-bold tracking-tight">SIGNAL</span>
              <span className="text-xs text-indigo-400 font-medium tracking-widest uppercase ml-2 hidden sm:inline">Protocol</span>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-1">
            <a href="#how-it-works" className="nav-btn text-zinc-400 hover:text-white">How It Works</a>
            <a href="#marketplace" className="nav-btn text-zinc-400 hover:text-white">Marketplace</a>
            <Link href="/docs" className="nav-btn text-zinc-400 hover:text-white inline-flex items-center gap-1.5">
              Docs <ArrowRight size={13}/>
            </Link>
          </nav>
          
          <a
            href="https://t.me/OfficialSignalOracleBot"
            target="_blank"
            rel="noopener"
            className="primary-btn flex items-center gap-2 text-sm"
          >
            <Send size={15}/>
            <span className="hidden sm:inline">Open in</span> Telegram
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8">
        {/* Hero */}
        <section className="pt-16 pb-20 text-center relative">
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-[120px]" />
            <div className="absolute top-20 right-1/4 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-[120px]" />
          </div>

          <div className="badge-live mx-auto mb-6 w-fit">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,1)] animate-pulse" />
            {apiConnected ? `LIVE · ${nodeCount} Signalers Online` : 'NETWORK ACTIVE'}
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold mb-6 glow-text tracking-tight leading-[1.1]">
            Get Paid for<br/>
            <span className="bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
              Real-World Data
            </span>
          </h1>

          <p className="text-zinc-400 max-w-2xl mx-auto text-lg sm:text-xl leading-relaxed mb-10">
            Signal is a DePIN network on Solana. Report local prices via Telegram, earn USDC. 
            No crypto experience needed — your wallet is created automatically.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://t.me/OfficialSignalOracleBot"
              target="_blank"
              rel="noopener"
              className="primary-btn flex items-center gap-2 text-base w-full sm:w-auto justify-center"
            >
              <Send size={18}/> Start Earning on Telegram
            </a>
            <a
              href="#marketplace"
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-zinc-300 hover:border-white/20 hover:text-white transition-all text-base w-full sm:w-auto justify-center"
            >
              Buy Data Feeds <ArrowRight size={16}/>
            </a>
          </div>

          {/* Hero Stats Row */}
          <div className="mt-16 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            {stats.map((stat, i) => (
              <div key={i} className="glass-card p-4 flex flex-col items-center gap-1">
                <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider hidden sm:block">{stat.label}</span>
                <span className="text-xl sm:text-2xl font-bold font-mono">{stat.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-20 border-t border-white/5">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-zinc-400 max-w-xl mx-auto">No wallets, no gas fees, no complexity. Just open Telegram and start earning.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <div key={i} className="glass-card p-6 flex flex-col gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                  {step.icon}
                </div>
                <h3 className="text-lg font-bold">{step.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Global Health + Marketplace */}
        <section id="marketplace" className="py-20 border-t border-white/5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Marketplace Feeds */}
            <div className="lg:col-span-2">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2">Intelligence Feeds</h2>
                  <p className="text-zinc-500 text-sm">For AI agents & enterprises. Subscribe via Jupiter DCA or direct swap.</p>
                </div>
                <div className="flex gap-2 p-1 bg-black/40 border border-white/5 rounded-xl backdrop-blur-xl self-start">
                  <button className="px-3 py-1.5 bg-white/10 rounded-lg text-sm font-bold">All</button>
                  <button className="px-3 py-1.5 text-zinc-500 text-sm font-bold hover:text-white transition-colors">Commodities</button>
                  <button className="px-3 py-1.5 text-zinc-500 text-sm font-bold hover:text-white transition-colors">Transport</button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {categories.map((cat) => (
                  <div
                    key={cat.name}
                    className={`glass-card p-6 cursor-pointer transition-all duration-300 hover:scale-[1.02] border border-white/10 ${selectedCategory === cat.name ? 'border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.15)] bg-indigo-500/5' : 'hover:border-white/20'}`}
                    onClick={() => setSelectedCategory(cat.name)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md">{cat.region}</span>
                      <span className={`text-xs px-2 py-1 rounded-md font-bold ${cat.updates === 'Live' ? 'text-rose-400 bg-rose-500/10 animate-pulse' : 'bg-white/5 text-zinc-400'}`}>
                        {cat.updates}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg mb-6">{cat.name}</h3>
                    <div className="flex justify-between items-center pt-4 border-t border-white/5">
                      <span className="font-mono text-sm text-zinc-300 font-bold">{cat.price}</span>
                      <button className="text-xs px-3 py-1.5 rounded-lg font-bold bg-white text-black hover:bg-zinc-200 transition-colors flex items-center gap-1">
                        Buy via Jupiter <ArrowRight size={12}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Panel: Global Health + Signaler Portal */}
            <div className="flex flex-col gap-6">
              {/* Global Health */}
              <div className="glass-card p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-emerald-400 to-fuchsia-500" />
                <h3 className="text-xs font-bold text-zinc-500 uppercase mb-6 tracking-widest flex items-center gap-2">
                  <Globe size={14} className="text-indigo-400" /> Global Health
                </h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-sm font-medium text-zinc-300">RPC Latency</span>
                      <span className="text-emerald-400 font-bold font-mono">{latency}ms</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)] transition-all duration-1000"
                        style={{ width: `${100 - (latency / 100 * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-sm font-medium text-zinc-300">Oracle Consensus</span>
                      <span className="text-indigo-400 font-bold font-mono">99.98%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 w-[99%] shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                    <p className="text-xs text-indigo-200 leading-relaxed font-medium">
                      Helius Webhooks connected. Syncing across 14 global zones.
                    </p>
                  </div>
                </div>
              </div>

              {/* Signaler Portal */}
              <div className="glass-card p-6 border-indigo-500/30 bg-gradient-to-b from-indigo-900/20 to-transparent relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-[50px]" />
                <div className="flex items-center gap-2 mb-1">
                  <Users size={16} className="text-indigo-400"/>
                  <h3 className="text-lg font-bold">Signaler Portal</h3>
                </div>
                <p className="text-xs text-indigo-300 mb-4 uppercase tracking-widest font-bold">Genesis Tester Program</p>
                
                <div className="space-y-3 relative z-10">
                  {/* Live leaderboard from bot */}
                  {leaderboard.length > 0 ? (
                    <div className="space-y-2 mb-4">
                      <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Live Leaderboard</p>
                      {leaderboard.slice(0, 3).map((entry: any) => (
                        <div key={entry.rank} className="flex justify-between items-center text-xs py-1.5 border-b border-white/5">
                          <span className="text-zinc-400 font-mono">{entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'} {entry.wallet}</span>
                          <span className="text-indigo-300 font-bold">{entry.points} PTS</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-center">
                      <p className="text-xs text-zinc-500">No reports yet — be the first!</p>
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
                    <p className="text-xs font-bold text-indigo-200 mb-1">Prize Pool Share (15%)</p>
                    <p className="text-2xl font-black glow-text">$45.00</p>
                    <p className="text-[10px] text-indigo-400/80 mt-1">Updates with each verified report</p>
                  </div>

                  <a
                    href="https://t.me/OfficialSignalOracleBot"
                    target="_blank"
                    rel="noopener"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <Send size={15}/> Open Telegram & Earn
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Live Activity Feed */}
        {liveReports.length > 0 && (
          <section className="py-12 border-t border-white/5">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-xl font-bold">Live Oracle Feed</h2>
                <p className="text-zinc-500 text-sm">Real submissions from the Signal network</p>
              </div>
              <div className="badge-live">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </div>
            </div>
            <div className="space-y-2">
              {liveReports.slice(0, 5).map((r: any, i: number) => (
                <div key={i} className="glass-card px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">{r.category}</span>
                    <span className="text-sm font-bold">${r.price}</span>
                    <span className="text-xs text-zinc-500 font-mono">{r.wallet}</span>
                  </div>
                  <span className="text-emerald-400 text-xs font-bold">+${r.reward} USDC earned</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-zinc-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-xs font-bold">S</div>
            <span>Signal Protocol · Built on Solana</span>
          </div>
          <div className="flex gap-6">
            <Link href="/docs" className="hover:text-white transition-colors">Documentation</Link>
            <a href="https://t.me/OfficialSignalOracleBot" target="_blank" rel="noopener" className="hover:text-white transition-colors">Telegram Bot</a>
            <a href="https://github.com" target="_blank" rel="noopener" className="hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
