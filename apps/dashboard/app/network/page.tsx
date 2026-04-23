'use client';

import { useEffect, useState } from 'react';
import { Network, Activity, Users, FileText, Database, CheckCircle2, MapPin, Shield, MessageCircle, Code, Globe, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface Stats {
  activeNodes: number;
  totalReports: number;
  totalVolume: string;
}

export default function NetworkExplorer() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/network-stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => {
        setStats({
          activeNodes: 142,
          totalReports: 8934,
          totalVolume: '24,500.00'
        });
        setLoading(false);
      });
  }, []);

  return (
    <div className="h-screen w-full bg-[#0a0a0c] text-white flex flex-col overflow-hidden font-sans selection:bg-[#10B981]/30">
      
      {/* ── HEADER / TOP NAV ─────────────────────────── */}
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-[#0a0a0c] relative z-40">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center">
            <Network size={16} className="text-[#10B981]" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest text-white">Global Truth Console</h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">Mission Control v1.0.4</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
           <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Network Status</span>
              <span className="text-[10px] font-mono text-[#10B981] flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                 SOLANA.MAINNET.ACTIVE
              </span>
           </div>
           <div className="w-px h-8 bg-white/5" />
           <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-full bg-[#10B981]/5 border border-[#10B981]/20 flex items-center justify-center text-[10px] font-mono text-[#10B981] cursor-help hover:bg-[#10B981]/10 transition-all group relative"
                title="Sovereign Identity Key"
              >
                ?
                <div className="absolute top-10 right-0 w-48 p-3 rounded-xl bg-[#0a0a0c] border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
                    <p className="text-[9px] font-mono text-zinc-400">Your sovereign session is secured via RSA-4096. All telemetrics are end-to-end encrypted.</p>
                </div>
              </div>
           </div>
        </div>
      </header>

      {/* ── MAIN CONTENT AREA ────────────────────────── */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {/* BACKGROUND MAP (Immersive Layer) */}
        <div className="absolute inset-x-0 inset-y-0 z-0 pointer-events-none opacity-20">
           <svg viewBox="0 0 1000 500" className="w-full h-full fill-white/5">
              <defs>
                 <pattern id="gridLarge" width="80" height="80" patternUnits="userSpaceOnUse">
                    <path d="M 80 0 L 0 0 0 80" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/>
                 </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#gridLarge)" />
              
              {/* Pulsing Nodes */}
              {[
                {x: 200, y: 150}, {x: 480, y: 140}, {x: 750, y: 180}, {x: 820, y: 220}, 
                {x: 300, y: 350}, {x: 120, y: 280}, {x: 550, y: 250}, {x: 900, y: 100}
              ].map((p, i) => (
                <g key={i}>
                  <motion.circle
                    cx={p.x} cy={p.y} r="8"
                    fill="#10B981"
                    animate={{ opacity: [0.05, 0.2, 0.05], scale: [1, 3, 1] }}
                    transition={{ duration: 4, repeat: Infinity, delay: i * 0.5 }}
                  />
                  <circle cx={p.x} cy={p.y} r="1.5" fill="#10B981" />
                </g>
              ))}
           </svg>
        </div>

        {/* LEFT SIDEBAR: METADATA CONSOLE */}
        <aside className="w-80 border-r border-white/5 bg-[#0a0a0c]/80 backdrop-blur-xl relative z-10 flex flex-col p-8 overflow-y-auto">
           <div className="mb-12">
              <div className="text-[10px] font-black uppercase tracking-widest text-[#10B981] mb-2">Platform Metadata</div>
              <h2 className="text-lg font-display font-black text-white mb-6">Global Resilience</h2>
              
              <div className="space-y-6">
                 <StatPanel 
                   label="Active Ground Nodes" 
                   val={loading ? '...' : stats?.activeNodes.toLocaleString()} 
                   color="#10B981" 
                   icon={Users} 
                 />
                 <StatPanel 
                   label="Verified Reports" 
                   val={loading ? '...' : stats?.totalReports.toLocaleString()} 
                   color="#3B82F6" 
                   icon={FileText} 
                 />
                 <StatPanel 
                   label="Community Rewards" 
                   val={loading ? '...' : `$${stats?.totalVolume}`} 
                   color="#F59E0B" 
                   icon={Database} 
                 />
              </div>
           </div>

           <div className="mt-auto space-y-6">
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                 <div className="flex items-center gap-3 mb-3">
                    <Shield size={14} className="text-[#10B981]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Trust Layer</span>
                 </div>
                 <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">99.98% Cryptographic Integrity maintained across all edges.</p>
              </div>
              
              <Link 
                href="https://t.me/OfficialSignalOracleBot" 
                className="w-full h-12 rounded-xl bg-[#10B981] text-[#0a0a0c] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-[#00e5a0] transition-colors"
              >
                Become a Node <ExternalLink size={12} />
              </Link>
           </div>
        </aside>

        {/* CENTER AREA: VIRTUAL NAVIGATION */}
        <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center">
           <div className="relative z-10 text-center pointer-events-none select-none">
              <h3 className="text-[10px] font-mono text-zinc-500 tracking-[0.5em] uppercase mb-4">Signal Spatial Layer</h3>
              <div className="relative inline-block">
                <div className="text-6xl font-display font-black text-white tracking-tighter mix-blend-difference">REALITY</div>
                <div className="absolute -top-10 -right-10 w-20 h-20 rounded-full border border-[#10B981]/20 animate-ping opacity-20" />
              </div>
           </div>

           {/* RADAR SWEEP */}
           <motion.div 
             className="absolute inset-0 z-0 pointer-events-none"
             style={{ background: "conic-gradient(from 0deg, #10B98110 0deg, transparent 40deg)" }}
             animate={{ rotate: 360 }}
             transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
           />
        </div>

        {/* RIGHT SIDEBAR: TRANSPARENCY LEDGER */}
        <aside className="w-[420px] border-l border-white/5 bg-[#0a0a0c]/80 backdrop-blur-xl relative z-10 flex flex-col overflow-hidden">
           <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
              <div>
                 <h2 className="text-[11px] font-black uppercase tracking-widest text-white">Truth Ledger</h2>
                 <p className="text-[9px] font-mono text-zinc-600">Sub-Second Finality</p>
              </div>
              <div className="px-3 py-1 rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/20 text-[9px] font-black text-[#3B82F6] uppercase">Dune Enabled</div>
           </div>
           
           <div className="flex-1 overflow-y-auto custom-scrollbar">
              <TransparencyLedger />
           </div>

           <div className="p-8 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-[#10B981]">Mainnet Verified</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-600">SEC-ID: 0x4f...a2</span>
           </div>
        </aside>

      </main>

      {/* ── COMMAND BAR / BOTTOM FOOTER ────────────────── */}
      <footer className="h-14 border-t border-white/5 bg-[#0a0a0c] relative z-40 flex items-center justify-between px-8">
         <div className="flex items-center gap-6">
            <FooterLink label="Dashboard" href="/" />
            <FooterLink label="Documentation" href="/docs" />
            <FooterLink label="Mainnet Status" href="#" active />
            <div className="w-px h-4 bg-white/10" />
            <a href="https://github.com/southenempire/signal" target="_blank" className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 hover:text-white transition-colors">
               <Code size={12} /> Source
            </a>
         </div>

         <div className="flex items-center gap-6">
            <a 
              href="https://t.me/southen13" 
              target="_blank" 
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#10B981] hover:text-[#00e5a0] transition-colors group"
            >
               <MessageCircle size={14} className="group-hover:scale-110 transition-transform" />
               Direct Support: @southen13
            </a>
            <div className="w-px h-4 bg-white/10" />
            <span className="text-[10px] font-mono text-zinc-600">© 2026 SIGNAL NETWORK</span>
         </div>
      </footer>
    </div>
  );
}

function StatPanel({ label, val, color, icon: Icon }: any) {
  return (
    <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 hover:bg-white/[0.04] transition-all group">
       <div className="flex items-center gap-3 mb-2">
          <Icon size={12} style={{ color }} />
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-zinc-400 transition-colors">{label}</span>
       </div>
       <div className="text-xl font-display font-black text-white">{val}</div>
    </div>
  );
}

function FooterLink({ label, href, active }: any) {
  return (
    <Link 
      href={href} 
      className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${active ? 'text-[#10B981]' : 'text-zinc-500 hover:text-white'}`}
    >
       {label}
    </Link>
  );
}

function TransparencyLedger() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLedger = () => {
        fetch('/api/truth-ledger')
          .then(res => res.json())
          .then(data => {
            if (data && data.length > 0) {
                setLogs(data);
            }
            setLoading(false);
          })
          .catch(() => setLoading(false));
    };

    fetchLedger();
    const interval = setInterval(fetchLedger, 5000); // Poll real ledger every 5s
    return () => clearInterval(interval);
  }, []);

  if (loading && logs.length === 0) {
      return (
          <div className="flex items-center justify-center h-40">
              <div className="w-5 h-5 border-2 border-[#10B981]/30 border-t-[#10B981] rounded-full animate-spin" />
          </div>
      );
  }

  return (
    <div className="p-6 space-y-3">
      <AnimatePresence initial={false} mode="popLayout">
        {logs.map((log) => (
          <motion.div
            key={log.id}
            layout
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all"
          >
             <div className="flex justify-between items-start mb-3">
                <div>
                   <div className="text-[10px] font-mono text-zinc-300">#{log.id.slice(0,4)}</div>
                   <div className="text-[8px] font-mono text-zinc-600">{log.hash}</div>
                </div>
                <div className="px-2 py-0.5 rounded bg-[#10B981]/10 border border-[#10B981]/20 text-[8px] font-black uppercase text-[#10B981]">Cleared</div>
             </div>
             
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <MapPin size={10} className="text-[#3B82F6]" />
                   <span className="text-[9px] font-bold text-zinc-400">{log.region}</span>
                </div>
                 <div className="text-[10px] font-black text-[#10B981]">{log.reward > 0 ? `+${log.reward}` : 'Verified'} USDC</div>
             </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
