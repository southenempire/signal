'use client';

import { useState } from 'react';

import { Book, Code, Terminal, Cpu, Eye, ShieldCheck, Coins, Layers, ArrowRight, Smartphone, Zap, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

function AgentSandbox() {
  const [requesting, setRequesting] = useState(false);
  const [sensorData, setSensorData] = useState<any>(null);

  const triggerSensor = () => {
    setRequesting(true);
    setSensorData(null);
    setTimeout(() => {
      setSensorData({
        status: "VERIFIED_ON_CHAIN",
        payload: {
          category: "RETAIL_PRICE_FUEL",
          value: (3.12 + Math.random() * 0.4).toFixed(2),
          currency: "USD",
          geo_id: "LON-1",
          confidence: 0.984
        },
        integrity: {
          hash: "0x" + Math.random().toString(16).substr(2, 12),
          method: "MagicBlock_AES_GCM",
          signature: "SIG_" + Math.random().toString(36).substr(2, 8).toUpperCase()
        }
      });
      setRequesting(false);
    }, 1500);
  };

  return (
    <div className="space-y-4">
      <button 
        onClick={triggerSensor}
        disabled={requesting}
        className="w-full h-12 rounded-2xl bg-[#10B981] text-[#0a0a0c] font-black uppercase tracking-widest text-[10px] hover:bg-[#00e5a0] transition-all disabled:opacity-50 disabled:cursor-not-allowed group flex items-center justify-center gap-2"
      >
        {requesting ? (
          <div className="w-4 h-4 border-2 border-[#0a0a0c]/30 border-t-[#0a0a0c] rounded-full animate-spin" />
        ) : (
          <>
            <Zap size={14} className="group-hover:scale-125 transition-transform" />
            Request Physical Sensor
          </>
        )}
      </button>

      {sensorData && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 rounded-2xl bg-[#10B981]/5 border border-[#10B981]/20 font-mono text-[10px]"
        >
          <div className="text-[#10B981] mb-2 font-black uppercase tracking-widest flex items-center gap-2">
             <CheckCircle2 size={12} /> Verification Success
          </div>
          <pre className="text-zinc-400 overflow-x-auto">
            {JSON.stringify(sensorData, null, 2)}
          </pre>
        </motion.div>
      )}
    </div>
  );
}

export default function DocsPage() {
  const sections = [
    { id: 'introduction', label: 'Introduction', icon: Book },
    { id: 'architecture', label: 'Architecture', icon: Layers },
    { id: 'verification', label: 'Verification (PoPW)', icon: Eye },
    { id: 'economics', label: 'Economics', icon: Coins },
    { id: 'quick-start', label: 'Quick Start', icon: Terminal },
    { id: 'sdk', label: 'AI Agent SDK', icon: Cpu },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-400">
      <div className="max-w-8xl mx-auto flex">
        
        {/* ── UNIFIED SIDEBAR NAVIGATION ────────────────────────── */}
        <aside className="hidden lg:block w-80 h-screen sticky top-0 border-r border-white/5 bg-[#0a0a0c] p-10 overflow-y-auto z-50">
          <Link href="/" className="mb-12 flex items-center gap-3 group">
             <div className="relative w-8 h-8 rounded-xl overflow-hidden border border-white/10 group-hover:border-[#10B981]/50 transition-all shadow-2xl">
                <Image src="/logo.png" alt="Signal" fill className="object-cover transition-transform group-hover:scale-110" />
             </div>
             <span className="text-white font-display font-bold tracking-tight text-lg">Signal Docs</span>
          </Link>
          
          <div className="space-y-10">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-600 mb-6">Protocol Index</div>
              <nav className="space-y-2">
                {sections.map((s) => (
                  <a 
                    key={s.id} 
                    href={`#${s.id}`} 
                    className="group flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/5 transition-all text-sm font-medium text-zinc-500 hover:text-white border border-transparent hover:border-white/5"
                  >
                    <s.icon size={16} className="group-hover:text-[#10B981] transition-colors" />
                    {s.label}
                  </a>
                ))}
              </nav>
            </div>

            <div className="p-6 rounded-3xl bg-[#10B981]/5 border border-[#10B981]/10">
               <div className="text-[9px] font-black uppercase tracking-widest text-[#10B981] mb-2 flex items-center gap-2">
                  <Zap size={10} /> Live Status
               </div>
               <div className="text-[11px] text-zinc-400 leading-relaxed">
                  Genesis Phase 1 is currently active. Building physical oracle nodes on Solana.
               </div>
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ──────────────────────────────── */}
        <main className="flex-1 px-6 sm:px-12 lg:px-24 py-16 lg:py-24 max-w-5xl">
          
          <div className="max-w-3xl">
            {/* Header */}
            <header id="introduction" className="mb-20">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#10B981]/5 border border-[#10B981]/10 rounded-full text-[10px] font-black uppercase tracking-widest text-[#10B981] mb-8">
                 v1.0.4 Release
              </div>
              <h1 className="text-5xl font-display font-black text-white tracking-tight mb-6">
                Build with <span className="text-[#10B981]">Ground Truth.</span>
              </h1>
              <p className="text-lg leading-relaxed text-zinc-500">
                Welcome to the Signal protocol documentation. Learn how our decentralized human-oracle network captures, verifies, and delivers real-world physical telemetrics directly to your AI agents on Solana.
              </p>
            </header>

            <div className="space-y-32">
              
              {/* Architecture */}
              <section id="architecture">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#10B981] mb-4">Core Concepts</div>
                <h2 className="text-3xl font-display font-black text-white mb-8">Protocol Architecture</h2>
                <div className="prose prose-invert max-w-none text-zinc-400 leading-relaxed space-y-6">
                  <p>
                    Signal is an asynchronous physical oracle network designed for institutional-grade reliability. By decoupling edge data capture from on-chain consensus, we achieve sub-second telemetrics while maintaining the strict deterministic integrity required for automated AI trading and supply chain protocols.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                    <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 group hover:border-[#10B981]/30 transition-all">
                      <div className="w-10 h-10 rounded-2xl bg-[#3B82F6]/10 flex items-center justify-center border border-[#3B82F6]/20 mb-6 transition-transform group-hover:scale-110">
                        <Smartphone size={20} className="text-[#3B82F6]" />
                      </div>
                      <h4 className="text-white font-bold mb-3">Edge Oracle Nodes</h4>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        Telegram-native nodes performing local cryptographic hashing of physical data to ensure security at the first-mile.
                      </p>
                    </div>
                    <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 group hover:border-[#10B981]/30 transition-all">
                      <div className="w-10 h-10 rounded-2xl bg-[#10B981]/10 flex items-center justify-center border border-[#10B981]/20 mb-6 transition-transform group-hover:scale-110">
                        <ShieldCheck size={20} className="text-[#10B981]" />
                      </div>
                      <h4 className="text-white font-bold mb-3">Consensus Pipeline</h4>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        Multi-tiered verification logic using Vision AI and spatial consensus to commit verified states to the Solana Truth Ledger.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Verification */}
              <section id="verification">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#10B981] mb-4">Verification</div>
                <h2 className="text-3xl font-display font-black text-white mb-8">Proof-of-Physical Work</h2>
                <div className="space-y-8">
                  <p className="text-zinc-500 leading-relaxed">
                    Data authenticity is the foundation of the Signal protocol. Every submission must pass a rigorous verification engine before being admitted to the global state:
                  </p>
                  
                  <div className="space-y-4">
                    {[
                      { title: "Spatial Consensus", desc: "Cross-referencing reports within a geofence to filter noise." },
                      { title: "Image Fingerprinting", desc: "SHA-256 collision detection prevents data farming." },
                      { title: "Vision AI Extraction", desc: "High-precision OCR extracting raw physical variables." },
                    ].map((idx, i) => (
                      <div key={i} className="flex gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.03] transition-colors">
                        <div className="w-6 h-6 rounded-lg bg-[#10B981]/20 flex items-center justify-center shrink-0">
                          <CheckCircle2 size={14} className="text-[#10B981]" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white mb-1">{idx.title}</div>
                          <div className="text-xs text-zinc-500">{idx.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Economics */}
              <section id="economics">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#10B981] mb-4">Incentives</div>
                <h2 className="text-3xl font-display font-black text-white mb-8">Crypto-Economics</h2>
                <div className="glass p-10 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-8 opacity-10">
                      <Coins size={120} className="text-zinc-500" />
                   </div>
                   <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div>
                        <h4 className="text-white font-bold text-sm mb-4">Bonded Staking</h4>
                        <p className="text-xs leading-relaxed text-zinc-500">
                          Operators must bond <span className="text-white">0.05 SOL</span> per node. This stake acts as insurance for the accuracy of their reported telemetrics.
                        </p>
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-sm mb-4">Dynamic Rewards</h4>
                        <p className="text-xs leading-relaxed text-zinc-500">
                          Verified submissions earn instant USDC payouts directly to the node's Solana wallet, incentivizing density in high-demand zones.
                        </p>
                      </div>
                   </div>
                </div>
              </section>

              {/* Quick Start */}
              <section id="quick-start">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#10B981] mb-4">Developer</div>
                <h2 className="text-3xl font-display font-black text-white mb-8">Quick Start</h2>
                
                <div className="bg-[#0f0f12] rounded-24 overflow-hidden border border-white/5 shadow-2xl">
                  <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Bash</span>
                    <Terminal size={14} className="text-zinc-500" />
                  </div>
                  <div className="p-8 font-mono text-sm">
                    <span className="text-[#10B981]">pnpm</span> install @signal-network/sdk @solana/web3.js
                  </div>
                </div>
              </section>

              {/* SDK Reference */}
              <section id="sdk">
                 <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#10B981] mb-4">Integration</div>
                 <h2 className="text-3xl font-display font-black text-white mb-8">AI Agent SDK</h2>
                 
                 <div className="space-y-12">
                    <p className="text-zinc-500 leading-relaxed max-w-2xl">
                       The Signal SDK provides AI agents with a type-safe interface to query the physical world. Fetch real-time gas prices, energy availability, and retail inventory as verifiable on-chain objects.
                    </p>

                    {/* ── ZERION TRACK: AGENT SANDBOX ────────────────── */}
                    <div className="glass p-1 rounded-3xl overflow-hidden border border-white/5">
                       <div className="bg-[#0f0f12] p-8 md:p-10">
                          <div className="flex flex-col md:flex-row gap-10 items-start">
                             <div className="flex-1 space-y-6">
                                <h4 className="text-white font-bold text-lg">AI Sensor Sandbox</h4>
                                <p className="text-xs text-zinc-500 leading-relaxed">
                                   Simulate an autonomous agent requesting ground-truth sensors. This playground demonstrates how our SDK abstracts complex PoPW verification into a single sensor stream.
                                </p>
                                <AgentSandbox />
                             </div>
                             <div className="w-full md:w-80 space-y-4">
                                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                   <div className="text-[8px] font-black uppercase tracking-widest text-[#10B981] mb-2">Capabilities</div>
                                   <div className="space-y-2">
                                      {['Price Discovery', 'Visual Consensus', 'Inventory Proofs'].map(c => (
                                         <div key={c} className="flex items-center gap-2">
                                            <CheckCircle2 size={10} className="text-[#10B981]" />
                                            <span className="text-[10px] text-zinc-400 font-medium">{c}</span>
                                         </div>
                                      ))}
                                   </div>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="bg-[#0f0f12] rounded-24 overflow-hidden border border-white/5 shadow-2xl">
                      <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">agent-integration.ts</span>
                        <Code size={14} className="text-zinc-500" />
                      </div>
                      <div className="p-8 font-mono text-xs leading-relaxed overflow-x-auto">
                        <pre>
                          <span className="text-purple-500">import</span> {"{ SignalClient }"} <span className="text-purple-500">from</span> <span className="text-emerald-500">'@signal-network/sdk'</span>;<br/><br/>
                          <span className="text-zinc-600">// Initialize the secure oracle client</span><br/>
                          <span className="text-blue-500">const</span> client = <span className="text-purple-500">new</span> <span className="text-amber-500">SignalClient</span>({"{"}<br/>
                          {"  "}apiKey: <span className="text-emerald-500">'SIGNAL_PRO_2026'</span>,<br/>
                          {"  "}endpoint: <span className="text-emerald-500">'https://api.signal-oracle.io'</span><br/>
                          {"}"});<br/><br/>
                          <span className="text-zinc-600">// Query the global truth ledger</span><br/>
                          <span className="text-blue-500">const</span> report = <span className="text-purple-500">await</span> client.getLatestVerification({"{"}<br/>
                          {"  "}category: <span className="text-emerald-500">'RETAIL_PRICE_FUEL'</span>,<br/>
                          {"  "}location: <span className="text-emerald-500">'PARIS_ZONE_1'</span><br/>
                          {"}"});<br/><br/>
                          <span className="text-blue-500">console</span>.log(<span className="text-emerald-500">{'`Verified state: $${report.value}`'}</span>);
                        </pre>
                      </div>
                    </div>
                 </div>
              </section>


              {/* Security */}
              <section id="security" className="pb-32">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500 mb-4">Security</div>
                <h2 className="text-3xl font-display font-black text-white mb-8">Anti-Abuse Measures</h2>
                <div className="prose prose-invert max-w-none text-zinc-500 leading-relaxed">
                   <p>
                     To protect the integrity of the data market, Signal employs a multi-vector security engine. Our <strong>Duplicate Entry Check</strong> system ensures that every unique data point is only rewarded once.
                   </p>
                   <div className="mt-8 p-8 rounded-3xl bg-red-500/5 border border-red-500/10 font-mono text-[11px] leading-relaxed">
                      <div className="text-zinc-600 mb-2"># Slashing Condition: Media Collision</div>
                      <div className="text-red-400">1. Image Buffer Hashing (Blake3)</div>
                      <div className="text-red-400">2. Global Hash Ledger Comparison</div>
                      <div className="text-red-400">3. IF Match: Discard Submission & Burn Stake</div>
                      <div className="text-red-400">4. IF Unique: Admission to Consensus Layer</div>
                   </div>
                </div>
              </section>

            </div>
          </div>
        </main>

        {/* RIGHT SIDEBAR REMOVED FOR CLEANER DUAL-COLUMN LAYOUT */}

      </div>
    </div>
  );
}
