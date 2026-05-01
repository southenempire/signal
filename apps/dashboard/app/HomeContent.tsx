"use client";

import { motion } from "framer-motion";
import { Shield, Zap, Clock, Camera, Coins, Users, ExternalLink, Activity } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

/* ═══════════════════════════════════════════════════════
   ANIMATED ORB BACKGROUND
   ═══════════════════════════════════════════════════════ */
function OrbBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-[40%] -left-[20%] w-[80vw] h-[80vw] md:w-[50vw] md:h-[50vw] rounded-full bg-[#10B981]/[0.07] blur-[100px] animate-pulse" />
      <div className="absolute -bottom-[30%] -right-[20%] w-[70vw] h-[70vw] md:w-[40vw] md:h-[40vw] rounded-full bg-[#3B82F6]/[0.05] blur-[100px] animate-pulse" />
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#050505_70%)]" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   LIVE NETWORK PULSE
   ═══════════════════════════════════════════════════════ */
function LivePulse() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#10B981]/[0.08] border border-[#10B981]/20 backdrop-blur-xl"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]" />
      </span>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#10B981]">
        Mainnet Live — Signal Network Active
      </span>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   STAT CARDS
   ═══════════════════════════════════════════════════════ */
function StatsRow() {
  const stats = [
    { icon: Camera, value: "1,247", label: "Reports Filed" },
    { icon: Users, value: "312", label: "Signalers" },
    { icon: Coins, value: "$4.2K", label: "USDC Distributed" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-md mx-auto lg:mx-0">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + i * 0.1 }}
          className="flex flex-col items-center gap-1.5 p-3 md:p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm"
        >
          <s.icon size={14} className="text-[#10B981]/60" />
          <div className="text-base md:text-lg font-black text-white">{s.value}</div>
          <div className="text-[8px] md:text-[9px] font-bold uppercase tracking-wider text-zinc-500">{s.label}</div>
        </motion.div>
      ))}
    </div>
  );
}

export default function HomeContent() {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#10B981]/30 flex flex-col relative overflow-hidden">
      <OrbBackground />

      <main className="flex-1 flex items-center justify-center relative z-10 px-5 md:px-8 py-8 md:py-0 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center w-full">
          
          {/* Left: Genesis Asset */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1.2 }}
            className="hidden lg:flex relative items-center justify-center p-12"
          >
            <div className="absolute inset-0 bg-[#10B981]/5 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] border border-[#10B981]/10 rounded-full animate-[spin_20s_linear_infinite]" />
            
            <div className="relative z-10 w-full max-w-lg aspect-square">
              <Image 
                src="/genesis-hand.png" 
                alt="Signal Genesis" 
                width={600}
                height={600}
                className="object-contain drop-shadow-[0_0_50px_rgba(16,185,129,0.3)] select-none pointer-events-none"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
            </div>
          </motion.div>

          {/* Right: Content + CTAs */}
          <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 1 }}
             className="space-y-8 md:space-y-10 text-center lg:text-left flex flex-col items-center lg:items-start"
          >
            <LivePulse />

            <div className="space-y-5">
              <h1 className="text-[2.5rem] leading-[0.95] md:text-7xl font-display font-black tracking-tighter italic">
                THE WORLD&apos;S <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#10B981] to-white/70 drop-shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                  FIRST HUMAN ORACLE
                </span>
              </h1>
              
              <p className="text-zinc-400 text-sm md:text-lg max-w-xl leading-relaxed">
                Bridging the physical-to-digital gap with decentralized human consensus. 
                Powered by Solana, authenticated by Vision AI.
              </p>
            </div>

            {/* ─── ACTION BUTTONS ─── */}
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
              <a 
                href="https://t.me/OfficialSignalOracleBot" 
                target="_blank"
                className="flex-1 h-14 rounded-2xl bg-[#10B981] text-[#0a0a0c] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-[#00e5a0] hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all active:scale-95 group"
              >
                Launch Bot <ExternalLink size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </a>
              <Link 
                href="/network" 
                className="flex-1 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-white/[0.08] transition-all active:scale-95"
              >
                Enter Console <Activity size={14} className="text-[#10B981]" />
              </Link>
            </div>

            <StatsRow />

          </motion.div>
        </div>
      </main>

      <footer className="relative z-10 px-5 py-10 md:p-12 border-t border-white/[0.04] bg-gradient-to-t from-[#050505] to-transparent">
        <div className="grid grid-cols-3 gap-4 md:gap-12 max-w-5xl mx-auto w-full">
          <Feature icon={Shield} title="Encrypted" desc="End-to-end encryption for all physical oracle signals." />
          <Feature icon={Zap} title="Sub-second" desc="Powered by Solana's lightning-fast transactions." />
          <Feature icon={Clock} title="24/7 Live" desc="Autonomous agent monitoring across global timezones." />
        </div>
        <div className="text-center mt-8">
          <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.3em]">
            Signal DePIN © 2026 · Built for Colosseum
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-2 group">
      <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 group-hover:text-[#10B981] group-hover:border-[#10B981]/30 transition-all">
        <Icon size={16} />
      </div>
      <div className="font-display font-black text-[10px] md:text-xs uppercase tracking-widest text-zinc-300">{title}</div>
      <div className="text-[10px] text-zinc-500 leading-relaxed max-w-[180px] hidden md:block">{desc}</div>
    </div>
  );
}
