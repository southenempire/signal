"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, ArrowLeft, Camera, ShieldCheck, 
  Zap, Globe, Cpu, ChevronRight, Play, 
  Layers, Database, LineChart, Wallet, 
  Scan, Fingerprint, Network, Activity,
  AlertCircle, CheckCircle2, TrendingUp, Users, 
  ExternalLink, Code, Terminal, Rocket
} from "lucide-react";
import Image from "next/image";

/* ═══════════════════════════════════════════════════════
   PITCH DECK SLIDES — REFACTORED PER DE-PITCH MASTERCLASS
═══════════════════════════════════════════════════════ */
const SLIDES = [
  {
    id: "hook",
    title: "AI IS",
    subtitle: "BLIND.",
    description: "WE GIVE IT EYES.",
    accent: "#10B981",
    bg: "/signal_global_network_1778259340871.png",
    oneSentence: "The world's first decentralized Physical Oracle Network on Solana."
  },
  {
    id: "problem",
    title: "The Physical",
    subtitle: "Truth Gap",
    description: "99% of AI data is digital. 0% is real-time physical truth.",
    accent: "#F59E0B",
    bg: "/signal_vision_scanner_1778259257988.png",
    stat: "70% of AI agents fail real-world tasks due to stale data.",
    problemLine: "AI agents can trade tokens, but they don't know the real price of bread in Lagos. We bridge that gap."
  },
  {
    id: "value-prop",
    title: "Sovereign",
    subtitle: "Sensors",
    description: "Signal is the decentralized physical data layer for the AI economy.",
    accent: "#3B82F6",
    bg: "/signal_vision_scanner_wide_1778262657340.png",
    memorable: "Turning every smartphone into a physical truth sensor for AI."
  },
  {
    id: "how-it-works",
    title: "Capture.",
    subtitle: "Collect.",
    description: "Truth-as-a-Service in 3 steps.",
    accent: "#8B5CF6",
    steps: [
      { t: "Capture", d: "Users snap reality via Telegram." },
      { t: "Audit", d: "AI verifies truth in milliseconds." },
      { t: "Settle", d: "Instant USDC via MagicBlock PER." }
    ]
  },
  {
    id: "demo",
    title: "Reality",
    subtitle: "Verified.",
    description: "The 'Wow' Moment.",
    accent: "#10B981",
    bg: "/signal_vision_scanner_1778259257988.png",
    isDemo: true
  },
  {
    id: "market",
    title: "The Data",
    subtitle: "Economy",
    description: "Targeting the $500B AI Training & Intelligence market.",
    accent: "#EC4899",
    focus: "AI Agents + Supply Chain + Institutional Analytics",
    trend: "Stablecoin adoption + DePIN growth"
  },
  {
    id: "business-model",
    title: "Capture",
    subtitle: "Value",
    description: "Sustainable economic loops.",
    accent: "#6366F1",
    models: [
      { t: "Transaction Fees", d: "5% fee on every truth bounty." },
      { t: "Data Licensing", d: "API access for institutional agents." },
      { t: "Premium Lanes", d: "Higher rewards for priority data." }
    ]
  },
  {
    id: "traction",
    title: "The Network",
    subtitle: "is Live.",
    description: "Proven usage, not potential hopes.",
    accent: "#10B981",
    bg: "/signal_global_network_1778259340871.png",
    stats: [
      { l: "Reports", v: "8,934+" },
      { l: "Regions", v: "14+" },
      { l: "Volume", v: "$24.5k+" }
    ]
  },
  {
    id: "roadmap",
    title: "The Path",
    subtitle: "Forward",
    description: "Execution is our only strategy.",
    accent: "#F43F5E",
    milestones: [
      { q: "Q2 2026", d: "Mainnet Launch & Reward Boost" },
      { q: "Q3 2026", d: "Global Data Marketplace v1" },
      { q: "Q4 2026", d: "Cross-chain Settlement Integration" }
    ]
  },
  {
    id: "team",
    title: "The",
    subtitle: "Builders",
    description: "We did it before. We deliver again.",
    accent: "#8B5CF6",
    facts: [
      "Previously built Signal Dashboard (~142 nodes).",
      "Solana Colosseum Finalists.",
      "Experts in Vision AI & Decentralized Systems."
    ]
  },
  {
    id: "cta",
    title: "Signal",
    subtitle: "The Future.",
    description: "Reality is now an API.",
    accent: "#10B981",
    bg: "/signal_payout_ui_1778259360440.png",
    cta: "Scan to Join the Network"
  }
];

/* ═══════════════════════════════════════════════════════
   COMPONENTS
═══════════════════════════════════════════════════════ */

function BackgroundVisual({ slide }: { slide: any }) {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, scale: 1.2, rotate: 1 }}
          animate={{ opacity: 0.35, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.9, rotate: -1 }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          {slide.bg ? (
            <Image 
              src={slide.bg} 
              alt="bg" 
              fill 
              className="object-cover grayscale-[0.5] contrast-[1.2]" 
              priority
            />
          ) : (
            <div className="w-full h-full bg-[#030308]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-[#030308]/60 via-transparent to-[#030308]" />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,#030308_120%)]" />
      
      {/* Moving Particles/Glow */}
      <div className="absolute inset-0 z-1 pointer-events-none">
        <motion.div 
          animate={{ x: [0, 100, 0], y: [0, -100, 0], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full"
          style={{ background: `radial-gradient(circle, ${slide.accent}22 0%, transparent 70%)`, filter: "blur(80px)" }}
        />
      </div>
    </div>
  );
}

export default function PitchDeck() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  const next = () => {
    if (current < SLIDES.length - 1) {
      setDirection(1);
      setCurrent(current + 1);
    }
  };

  const prev = () => {
    if (current > 0) {
      setDirection(-1);
      setCurrent(current - 1);
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [current]);

  const slide = SLIDES[current];

  return (
    <div className="relative h-screen w-full bg-[#030308] overflow-hidden text-white font-sans selection:bg-emerald-500/30 cursor-default">
      
      {/* ── Background ── */}
      <BackgroundVisual slide={slide} />

      {/* ── Navigation HUD ── */}
      <div className="absolute top-12 left-12 right-12 z-50 flex justify-between items-center">
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Image src="/logo.png" alt="Signal" width={24} height={24} className="rounded-md" />
           </div>
           <span className="font-display font-black tracking-tighter text-xl">SIGNAL.</span>
        </div>
        
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <div 
              key={i} 
              className="h-1 w-6 rounded-full transition-all duration-500"
              style={{ 
                backgroundColor: i === current ? slide.accent : (i < current ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.05)"),
                width: i === current ? "32px" : "24px",
                boxShadow: i === current ? `0 0 15px ${slide.accent}` : "none"
              }}
            />
          ))}
        </div>

        <div className="text-[10px] font-black tracking-[0.3em] uppercase opacity-40">
           CONFIDENTIAL · COLOSSEUM 2026
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="absolute bottom-12 left-12 right-12 z-50 flex justify-between items-end">
        <div className="flex items-center gap-4 text-[12px] font-black tracking-[0.2em] uppercase opacity-30">
          <span>{current + 1} / {SLIDES.length}</span>
        </div>

        <div className="flex items-center gap-6">
          <button 
            onClick={prev}
            disabled={current === 0}
            className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center transition-all hover:bg-white/5 disabled:opacity-20 active:scale-90"
          >
            <ArrowLeft size={24} />
          </button>
          <button 
            onClick={next}
            disabled={current === SLIDES.length - 1}
            className="px-10 h-16 rounded-2xl flex items-center gap-3 font-black tracking-tight transition-all hover:scale-105 active:scale-95 group shadow-2xl"
            style={{ backgroundColor: slide.accent, color: "#000" }}
          >
            {current === SLIDES.length - 1 ? "Finish" : "Next Slide"} 
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <main className="relative z-10 h-full flex items-center px-12 md:px-24">
        <div className="max-w-6xl w-full">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              initial={{ opacity: 0, x: direction * 50, filter: "blur(20px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: direction * -50, filter: "blur(20px)" }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-12"
            >
              {/* Header Group */}
              <div className="space-y-2">
                <motion.h2 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-5xl md:text-7xl font-black tracking-tight text-white/20 uppercase"
                >
                  {slide.title}
                </motion.h2>
                <motion.h1 
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-7xl md:text-[140px] font-black leading-[0.8] tracking-tighter uppercase"
                  style={{ color: slide.accent }}
                >
                  {slide.subtitle}
                </motion.h1>
              </div>

              {/* Description Body */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="max-w-3xl space-y-12"
              >
                <p className="text-2xl md:text-3xl font-bold text-zinc-400 leading-tight">
                  {slide.description}
                </p>
                
                {/* ── Context Specific Layouts ── */}
                <div className="mt-8">
                  
                  {/* Hook slide special */}
                  {slide.oneSentence && (
                    <div className="p-8 border-l-4 rounded-r-3xl glass border-emerald-500/50 max-w-xl">
                       <p className="text-xl font-bold text-white italic">"{slide.oneSentence}"</p>
                    </div>
                  )}

                  {/* Problem slide special */}
                  {slide.stat && (
                    <div className="flex flex-col md:flex-row gap-12 items-start">
                       <div className="p-8 rounded-[40px] glass border border-white/5 flex-grow">
                          <AlertCircle size={40} className="mb-4" style={{ color: slide.accent }} />
                          <p className="text-xl font-medium text-zinc-300 leading-relaxed">
                             {slide.problemLine}
                          </p>
                       </div>
                       <div className="p-8 rounded-[40px] bg-amber-500/10 border border-amber-500/20 w-full md:w-64">
                          <div className="text-5xl font-black text-amber-500 mb-2">99%</div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-amber-500/60">Stale Data</div>
                       </div>
                    </div>
                  )}

                  {/* How it works slide special */}
                  {slide.steps && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {slide.steps.map((step: any, idx: number) => (
                        <motion.div 
                          key={idx}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 + (idx * 0.1) }}
                          className="p-8 glass rounded-[40px] border border-white/5 space-y-4 group hover:border-white/10 transition-colors"
                        >
                          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black transition-transform group-hover:scale-110" style={{ backgroundColor: `${slide.accent}20`, color: slide.accent }}>
                            {idx + 1}
                          </div>
                          <h4 className="font-black text-white uppercase tracking-wider">{step.t}</h4>
                          <p className="text-sm text-zinc-500 leading-relaxed">{step.d}</p>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Demo slide special */}
                  {slide.isDemo && (
                    <div className="relative aspect-video rounded-[40px] overflow-hidden border border-white/10 glass shadow-2xl max-w-4xl">
                       <div className="absolute inset-0 flex items-center justify-center bg-black/40 group cursor-pointer">
                          <div className="w-24 h-24 rounded-full bg-white/10 border border-white/20 flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-white/20">
                             <Play fill="white" size={32} />
                          </div>
                       </div>
                       <Image src="/hero-lifestyle.png" alt="demo" fill className="object-cover opacity-60" />
                       <div className="absolute bottom-8 left-8 right-8 flex justify-between items-center">
                          <div className="flex gap-2">
                             <div className="px-3 py-1 rounded-full bg-[#10B981]/20 border border-[#10B981]/30 text-[10px] font-black uppercase text-[#10B981]">Live Transaction</div>
                             <div className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] font-black uppercase">Solana Devnet</div>
                          </div>
                       </div>
                    </div>
                  )}

                  {/* Business Model special */}
                  {slide.models && (
                    <div className="space-y-4">
                       {slide.models.map((m: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-6 p-6 glass rounded-2xl border border-white/5">
                             <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/5">
                                <TrendingUp size={20} style={{ color: slide.accent }} />
                             </div>
                             <div>
                                <h4 className="font-black text-white">{m.t}</h4>
                                <p className="text-sm text-zinc-500">{m.d}</p>
                             </div>
                          </div>
                       ))}
                    </div>
                  )}

                  {/* Traction slide special */}
                  {slide.stats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                       {slide.stats.map((s: any, idx: number) => (
                          <div key={idx} className="space-y-2">
                             <div className="text-6xl md:text-8xl font-black text-white tracking-tighter">{s.v}</div>
                             <div className="text-[12px] font-black uppercase tracking-[0.4em] opacity-40">{s.l}</div>
                             <div className="h-1 w-12" style={{ backgroundColor: slide.accent }} />
                          </div>
                       ))}
                    </div>
                  )}

                  {/* Roadmap slide special */}
                  {slide.milestones && (
                    <div className="space-y-6">
                       {slide.milestones.map((m: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-8 group">
                             <div className="font-display font-black text-3xl opacity-20 group-hover:opacity-100 transition-opacity" style={{ color: slide.accent }}>{m.q}</div>
                             <div className="h-[1px] flex-grow bg-white/5" />
                             <div className="text-xl font-bold text-zinc-400">{m.d}</div>
                          </div>
                       ))}
                    </div>
                  )}

                  {/* Team slide special */}
                  {slide.facts && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       {slide.facts.map((f: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-4">
                             <CheckCircle2 size={24} className="mt-1" style={{ color: slide.accent }} />
                             <p className="text-xl font-medium text-zinc-300">{f}</p>
                          </div>
                       ))}
                    </div>
                  )}

                  {/* CTA slide special */}
                  {slide.cta && (
                    <div className="flex flex-col md:flex-row gap-12 items-center">
                       <motion.a
                        href="https://t.me/OfficialSignalOracleBot"
                        target="_blank"
                        className="px-16 h-24 rounded-[40px] flex items-center gap-6 text-2xl font-black transition-all hover:scale-105 active:scale-95 shadow-[0_0_50px_-10px_rgba(16,185,129,0.5)]"
                        style={{ backgroundColor: slide.accent, color: "#000" }}
                      >
                        {slide.cta} <Zap size={32} fill="currentColor" />
                      </motion.a>
                      <div className="p-6 glass rounded-3xl border border-white/5">
                         <div className="w-32 h-32 bg-white rounded-2xl flex items-center justify-center p-2">
                            {/* Placeholder for QR Code */}
                            <Image src="/qr-code.png" alt="QR" width={110} height={110} />
                         </div>
                      </div>
                    </div>
                  )}

                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* CSS for Ripple/Glow */}
      <style jsx global>{`
        .glass {
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        @font-face {
          font-family: 'Space Grotesk';
          src: url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        }
        body {
          font-family: 'Space Grotesk', sans-serif;
        }
      `}</style>
    </div>
  );
}
