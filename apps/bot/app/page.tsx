"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { ArrowRight, ExternalLink, Globe, Cpu, Database, CheckCircle2, ShieldCheck, MapPin, Receipt, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "../components/ThemeProvider";

const BOT_URL = "https://t.me/OfficialSignalOracleBot";

/* ── CountUp Helper ─────────────────────────────────── */
function CountUp({ to, decimals = 0 }: { to: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    const duration = 1800;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = to * eased;
      setDisplay(
        decimals > 0
          ? current.toFixed(decimals)
          : Math.round(current).toLocaleString()
      );
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, to, decimals]);

  return <span ref={ref}>{display}</span>;
}

/* ── Reveal Wrapper ─────────────────────────────────── */
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Real Telegram Verification Inspector ──────────── */
function TelegramInspector({ isLight }: { isLight: boolean }) {
  return (
    <div
      className={`rounded-3xl p-5 sm:p-7 border transition-all ${
        isLight
          ? "bg-white border-zinc-200/90 shadow-xl shadow-zinc-200/40"
          : "bg-[#0b0c12]/90 border-white/[0.08] shadow-2xl shadow-black/80"
      }`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-current/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#7C5CFC] to-[#E040FB] flex items-center justify-center text-white font-bold text-xs shadow-md">
            S
          </div>
          <div>
            <div className={`text-xs font-bold ${isLight ? "text-zinc-900" : "text-white"}`}>
              Signal Oracle Bot
            </div>
            <div className="text-[10px] text-[#00D4AA] flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D4AA] animate-pulse" /> online · @OfficialSignalOracleBot
            </div>
          </div>
        </div>
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider px-2 py-1 rounded bg-current/5">
          Live Verification
        </span>
      </div>

      {/* Messages */}
      <div className="space-y-3 font-sans text-xs">
        {/* Contributor Message */}
        <div className="flex flex-col items-end">
          <div
            className={`max-w-[90%] sm:max-w-[80%] p-3.5 rounded-2xl rounded-tr-sm ${
              isLight ? "bg-zinc-100 text-zinc-900" : "bg-white/10 text-zinc-100"
            }`}
          >
            <div className="flex items-center gap-2 mb-2 text-[10px] text-zinc-400 font-mono">
              <Receipt size={12} /> Photo submission · Lagos, NG
            </div>
            
            {/* Real Receipt Photo Preview */}
            <div className="relative w-full h-32 sm:h-36 rounded-xl overflow-hidden mb-2 border border-black/10 dark:border-white/10 shadow-inner bg-black/40">
              <Image
                src="/receipt-sample.jpg"
                alt="De-Wincare Supermarket Receipt"
                fill
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <span className="absolute bottom-1.5 left-2 text-[10px] font-mono text-white/90 bg-black/60 px-2 py-0.5 rounded backdrop-blur-md">
                De Wincare Supermarket · ₦5,300.00
              </span>
            </div>

            <div className="text-[11px] leading-relaxed">
              Submitting grocery basket prices for retail inflation feed.
            </div>
          </div>
          <span className="text-[9px] text-zinc-500 mt-1 font-mono">14:02 · Contributor #084</span>
        </div>

        {/* Oracle Confirmation Message */}
        <div className="flex flex-col items-start">
          <div
            className={`max-w-[92%] sm:max-w-[85%] p-4 rounded-2xl rounded-tl-sm border ${
              isLight
                ? "bg-[#f8f9fc] border-zinc-200 text-zinc-900"
                : "bg-[#11131c] border-white/10 text-zinc-100"
            }`}
          >
            <div className="flex items-center gap-1.5 text-[#00D4AA] font-bold text-[11px] mb-2.5">
              <ShieldCheck size={14} /> AI Verification Passed · Confidence 99.8%
            </div>
            
            <div className="space-y-1.5 text-[11px] text-zinc-400 font-mono mb-3 bg-black/5 dark:bg-black/30 p-2.5 rounded-xl border border-current/5">
              <div className="flex justify-between text-zinc-500 text-[10px] border-b border-current/10 pb-1">
                <span>PARSED LINE ITEMS (4)</span>
                <span>PRICE (NGN)</span>
              </div>
              <div className="flex justify-between">
                <span className={isLight ? "text-zinc-800" : "text-zinc-200"}>Nasco Cornflakes 350g</span>
                <span className="font-bold">₦2,650</span>
              </div>
              <div className="flex justify-between">
                <span className={isLight ? "text-zinc-800" : "text-zinc-200"}>Ovaltine 4+1 Sachet</span>
                <span className="font-bold">₦850</span>
              </div>
              <div className="flex justify-between">
                <span className={isLight ? "text-zinc-800" : "text-zinc-200"}>Lush Bake Candy Bread</span>
                <span className="font-bold">₦1,000</span>
              </div>
              <div className="flex justify-between">
                <span className={isLight ? "text-zinc-800" : "text-zinc-200"}>Tayas Compound Chocolate</span>
                <span className="font-bold">₦800</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-current/10 font-bold text-xs">
                <span className={isLight ? "text-zinc-900" : "text-white"}>TOTAL BASKET:</span>
                <span className="text-[#00D4AA]">₦5,300.00 (~$3.53 USD)</span>
              </div>
            </div>

            <div
              className={`p-2.5 rounded-lg flex items-center justify-between font-mono text-[10px] ${
                isLight ? "bg-[#00D4AA]/10 text-[#008f73]" : "bg-[#00D4AA]/10 text-[#00D4AA]"
              }`}
            >
              <span>Settled on Solana:</span>
              <span className="font-bold">+0.25 USDC (SPL)</span>
            </div>
          </div>
          <span className="text-[9px] text-zinc-500 mt-1 font-mono">14:02 · Instant Settlement</span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════ */
export default function Home() {
  const [volume, setVolume]           = useState(24500);
  const [nodeCount, setNodeCount]     = useState(142);
  const { theme } = useTheme();
  const isLight = theme === 'light';

  /* Parallax for hero */
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroImageY  = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res  = await fetch("/api/network-stats");
        const data = await res.json();
        if (data.activeNodes)  setNodeCount(data.activeNodes);
        if (data.totalVolume) {
          const p = parseFloat(data.totalVolume.toString().replace(/,/g, ""));
          if (!isNaN(p)) setVolume(p);
        }
      } catch {}
    };
    fetchStats();
    const id = setInterval(fetchStats, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className={`min-h-screen overflow-x-hidden transition-colors duration-300 ${
        isLight ? "bg-[#f8f9fb] text-zinc-900" : "bg-[#060608] text-white"
      }`}
    >
      {/* ── AMBIENT GLOW SYSTEM (Matches approved mockup aura) ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Purple glow behind hero text */}
        <motion.div
          className="absolute top-[8%] -left-[10%] sm:left-[5%] w-[550px] sm:w-[700px] h-[550px] sm:h-[700px] rounded-full"
          style={{
            background: isLight
              ? "radial-gradient(circle, rgba(124,92,252,0.12) 0%, transparent 65%)"
              : "radial-gradient(circle, rgba(124,92,252,0.22) 0%, rgba(124,92,252,0.05) 45%, transparent 70%)",
            filter: "blur(75px)",
          }}
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -20, 15, 0],
          }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Pink / Violet aura behind image frame */}
        <motion.div
          className="absolute top-[12%] right-[0%] sm:right-[5%] w-[500px] sm:w-[650px] h-[500px] sm:h-[650px] rounded-full"
          style={{
            background: isLight
              ? "radial-gradient(circle, rgba(224,64,251,0.10) 0%, transparent 65%)"
              : "radial-gradient(circle, rgba(224,64,251,0.24) 0%, rgba(224,64,251,0.06) 45%, transparent 70%)",
            filter: "blur(80px)",
          }}
          animate={{
            x: [0, -30, 20, 0],
            y: [0, 25, -20, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* ══ HERO SECTION ════════════════════════ */}
      <section
        ref={heroRef}
        className="relative z-10 min-h-[92vh] flex items-center pt-24 sm:pt-28 pb-12 sm:pb-16"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 sm:gap-14 lg:gap-16 items-center">

            {/* Left — Copy & Stats */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              style={{ opacity: heroOpacity }}
              className="lg:col-span-6 space-y-6 sm:space-y-8"
            >
              <h1 className="font-black tracking-tight leading-[1.04] text-5xl sm:text-6xl md:text-7xl lg:text-[82px]">
                The Reality
                <br />
                <span
                  style={{
                    color: "#00D4AA",
                    textShadow: isLight ? "none" : "0 0 40px rgba(0,212,170,0.35)",
                  }}
                >
                  Oracle.
                </span>
              </h1>

              <p
                className={`text-base sm:text-lg leading-relaxed max-w-md ${
                  isLight ? "text-zinc-600" : "text-zinc-400"
                }`}
              >
                The world&apos;s first decentralized Physical Oracle Network on
                Solana. Capturing ground truth, verified by AI, settled in real-time.
              </p>

              {/* Stats Row with Horizontal Bar Divider (Matches Mockup) */}
              <div className="pt-4 sm:pt-6 flex items-center gap-6 sm:gap-8">
                <div>
                  <div className="text-3xl sm:text-4xl font-black tabular-nums tracking-tight">
                    $
                    <CountUp
                      to={volume >= 1000 ? volume / 1000 : volume}
                      decimals={volume >= 1000 ? 1 : 0}
                    />
                    {volume >= 1000 ? "k+" : "+"}
                  </div>
                  <div className={`text-[10px] sm:text-[11px] uppercase tracking-wider font-mono font-bold mt-1 ${
                    isLight ? "text-zinc-500" : "text-zinc-400"
                  }`}>
                    Community Payouts
                  </div>
                </div>

                <div
                  className={`w-8 sm:w-12 h-[1px] rounded-full self-center ${
                    isLight ? "bg-zinc-300" : "bg-white/20"
                  }`}
                />

                <div>
                  <div className="text-3xl sm:text-4xl font-black tabular-nums tracking-tight">
                    <CountUp to={nodeCount} />+
                  </div>
                  <div className={`text-[10px] sm:text-[11px] uppercase tracking-wider font-mono font-bold mt-1 ${
                    isLight ? "text-zinc-500" : "text-zinc-400"
                  }`}>
                    Active Nodes
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right — Glowing Frame Scanning Card (Matches Mockup) */}
            <motion.div
              className="lg:col-span-6 relative w-full max-w-lg mx-auto lg:max-w-none"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Outer Glow Halo */}
              <div
                className="absolute inset-0 rounded-[36px] pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse at center, rgba(224,64,251,0.35) 0%, rgba(124,92,252,0.2) 50%, transparent 75%)",
                  filter: "blur(30px)",
                  transform: "scale(1.05)",
                }}
              />

              {/* 2px Gradient Border Frame */}
              <motion.div
                className="relative p-[2px] rounded-[32px] sm:rounded-[36px] overflow-hidden"
                style={{
                  background: isLight
                    ? "linear-gradient(135deg, rgba(124,92,252,0.6), rgba(224,64,251,0.5), rgba(124,92,252,0.6))"
                    : "linear-gradient(135deg, #7C5CFC 0%, #E040FB 50%, #7C5CFC 100%)",
                  boxShadow: isLight
                    ? "0 20px 50px rgba(124,92,252,0.15)"
                    : "0 0 50px rgba(124,92,252,0.35), 0 30px 80px rgba(0,0,0,0.8)",
                  y: heroImageY,
                }}
              >
                <div className="relative rounded-[30px] sm:rounded-[34px] overflow-hidden aspect-[4/3] bg-black">
                  <Image
                    src="/hero-lifestyle.png"
                    alt="Signal real world grocery scanner"
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                  {/* Verified Dark Glass Chip */}
                  <div
                    className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold text-white shadow-2xl"
                    style={{
                      background: "rgba(12, 13, 18, 0.88)",
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                    }}
                  >
                    <span className="text-[#00D4AA] font-bold">✓</span>
                    <span>Verified · +$0.23 USDC</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ══ SECTION 1: PROOF OF GROUND TRUTH ══ */}
      <section
        id="how-it-works"
        className={`py-14 sm:py-20 border-t ${isLight ? "border-zinc-200" : "border-white/[0.06]"}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-center">
            
            <Reveal className="lg:col-span-5 space-y-5">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#7C5CFC]">
                Proof of Ground Truth
              </span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                From a phone camera to a Solana smart contract.
              </h2>
              <p className={`text-base leading-relaxed ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
                Traditional oracles only know what is already digital. Signal turns anyone with Telegram and a camera into an active data node — capturing real prices from neighbourhood markets, supermarkets, and gas stations.
              </p>

              <div className="space-y-3.5 pt-2">
                {[
                  {
                    step: "1",
                    title: "Zero Setup Contributor Flow",
                    desc: "Contributors snap a photo inside Telegram. No private key generation or technical friction required.",
                  },
                  {
                    step: "2",
                    title: "Groq & Vision AI Pipeline",
                    desc: "Extracts vendor data, item line items, and totals while filtering forged photos or duplicate submissions.",
                  },
                  {
                    step: "3",
                    title: "Immutable Inscription",
                    desc: "Every record is published to the BOTChain ledger and paid instantly via Solana SPL USDC.",
                  },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3.5 items-start">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs flex-shrink-0 mt-0.5 ${
                        isLight ? "bg-zinc-200 text-zinc-800" : "bg-white/10 text-white"
                      }`}
                    >
                      {item.step}
                    </div>
                    <div>
                      <div className={`font-bold text-sm ${isLight ? "text-zinc-900" : "text-white"}`}>
                        {item.title}
                      </div>
                      <div className={`text-xs mt-0.5 leading-relaxed ${isLight ? "text-zinc-500" : "text-zinc-400"}`}>
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.15} className="lg:col-span-7">
              <TelegramInspector isLight={isLight} />
            </Reveal>

          </div>
        </div>
      </section>

      {/* ══ SECTION 2: THE DATA GAP (EMERGING MARKETS) ══ */}
      <section className={`py-14 sm:py-20 border-t ${isLight ? "border-zinc-200" : "border-white/[0.06]"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-10">
          <Reveal className="max-w-2xl mb-8 sm:mb-12">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#00D4AA]">
              The Data Gap
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight mt-2.5">
              Why emerging market indices need physical consensus.
            </h2>
            <p className={`text-base mt-3 leading-relaxed ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
              Official inflation metrics in developing economies lag by 30–90 days. On-chain physical feeds deliver daily localized ground truth for DeFi lending, stablecoin purchasing power indexes, and algorithmic risk models.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                region: "Lagos & Abuja, Nigeria",
                category: "Food Basket & FMCG Index",
                observation: "Tracks staple grain and cooking oil retail divergence across urban informal markets in real-time.",
                metric: "₦4,680 Avg Basket",
                update: "Updated 4m ago",
              },
              {
                region: "Nairobi & Mombasa, Kenya",
                category: "Energy & Transportation",
                observation: "Monitors pump prices and logistics tariffs across transit corridors ahead of monthly central bank figures.",
                metric: "KES 188.4 / L",
                update: "Updated 12m ago",
              },
              {
                region: "Accra & Kumasi, Ghana",
                category: "Import vs Local Consumer Index",
                observation: "Measures FX pass-through inflation directly on retail shelves as currency rates fluctuate.",
                metric: "GH₵ 42.10 Index",
                update: "Updated 19m ago",
              },
            ].map((feed, idx) => (
              <Reveal key={feed.region} delay={idx * 0.1}>
                <div
                  className={`p-5 sm:p-6 rounded-3xl border h-full flex flex-col justify-between transition-all ${
                    isLight
                      ? "bg-white border-zinc-200/90 shadow-sm hover:border-zinc-400/80"
                      : "bg-[#0b0c12] border-white/[0.08] hover:border-white/20 shadow-xl shadow-black/40"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 mb-2.5">
                      <span className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-[#7C5CFC]" /> {feed.region}
                      </span>
                      <span className="text-[10px] text-[#00D4AA] font-bold">{feed.update}</span>
                    </div>
                    <div className={`font-bold text-base mb-1.5 ${isLight ? "text-zinc-900" : "text-white"}`}>
                      {feed.category}
                    </div>
                    <p className={`text-xs leading-relaxed ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
                      {feed.observation}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-current/10 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold">{feed.metric}</span>
                    <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                      Solana Feed <ArrowUpRight size={12} />
                    </span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SECTION 3: INCUBATION PARTNER (BOTCHAIN) ══ */}
      <section className={`py-16 sm:py-20 border-t ${isLight ? "border-zinc-200" : "border-white/[0.06]"}`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-8">
          <Reveal>
            <div
              className={`rounded-3xl p-8 sm:p-12 border backdrop-blur-xl transition-all shadow-2xl relative overflow-hidden ${
                isLight
                  ? "bg-white border-zinc-200/90 shadow-zinc-200/50"
                  : "bg-[#0b0c12] border-white/[0.08] shadow-black/90"
              }`}
            >
              {/* Soft ambient corner light */}
              <div
                className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none"
                style={{
                  background: isLight
                    ? "radial-gradient(circle, rgba(124,92,252,0.08) 0%, transparent 70%)"
                    : "radial-gradient(circle, rgba(124,92,252,0.18) 0%, transparent 70%)",
                  filter: "blur(50px)",
                }}
              />

              <div className="flex flex-col md:flex-row items-center gap-8 sm:gap-12 relative z-10">
                {/* Clean Logo Emblem */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-black/40 border border-white/10 flex items-center justify-center p-4 flex-shrink-0 shadow-lg">
                  <Image
                    src="/botchain-logo-clean.png"
                    alt="BOTChain Logo"
                    width={56}
                    height={72}
                    className="object-contain"
                  />
                </div>

                {/* Content */}
                <div className="space-y-4 text-center md:text-left flex-grow">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[#7C5CFC]/10 text-[#7C5CFC] border border-[#7C5CFC]/20">
                    Incubation Partner
                  </div>

                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
                    Signal is incubated by{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D4AA] to-[#7C5CFC]">
                      BOTChain.
                    </span>
                  </h2>

                  <p className={`text-sm sm:text-base leading-relaxed max-w-2xl ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
                    Every physical price verification event is hashed and inscribed permanently into the BOTChain ledger — creating an immutable, tamper-proof record of global economic ground truth that any decentralized protocol can audit.
                  </p>

                  <div className="pt-2 flex flex-wrap justify-center md:justify-start items-center gap-3">
                    <a
                      href="https://botchain.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold font-mono tracking-wider transition-all ${
                        isLight
                          ? "border border-zinc-300 text-zinc-900 bg-zinc-50 hover:bg-zinc-100 shadow-sm"
                          : "border border-white/10 text-white bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      Visit botchain.ai <ExternalLink size={12} />
                    </a>
                    <Link
                      href="/docs"
                      className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold transition-colors ${
                        isLight ? "text-zinc-600 hover:text-zinc-900" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Documentation <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ FINAL CTA ═══════════════════════════ */}
      <section className="py-16 sm:py-24 text-center relative">
        <Reveal className="max-w-xl mx-auto px-4 sm:px-6">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#7C5CFC]">
            Join The Network
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight mt-2.5 mb-3">
            Start contributing ground truth.
          </h2>
          <p className={`text-base sm:text-lg mb-7 ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
            Open Telegram and submit verified real-world data points in seconds. Earn USDC directly on Solana.
          </p>
          <motion.a
            href={BOT_URL}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 sm:px-10 sm:py-4.5 rounded-full font-bold text-white text-sm sm:text-base w-full sm:w-auto"
            style={{
              background: "linear-gradient(135deg, #7C5CFC, #E040FB)",
              boxShadow: "0 0 45px rgba(124,92,252,0.4)",
            }}
            whileHover={{
              scale: 1.03,
              boxShadow: "0 0 65px rgba(124,92,252,0.55)",
            }}
            whileTap={{ scale: 0.98 }}
          >
            Launch Signal Bot <ArrowRight size={18} />
          </motion.a>
        </Reveal>
      </section>

      {/* ══ FOOTER ══════════════════════════════ */}
      <footer
        className={`border-t py-10 sm:py-12 transition-colors ${
          isLight ? "bg-[#eaebef] border-zinc-200" : "bg-[#040406] border-white/[0.05]"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 mb-10 sm:mb-12">
            <div className="sm:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className={`relative w-8 h-8 rounded-xl overflow-hidden border ${
                  isLight ? "border-zinc-300" : "border-white/10"
                }`}>
                  <Image src="/logo.png" alt="Signal" fill className="object-cover" />
                </div>
                <span className={`font-bold text-lg tracking-tight ${isLight ? "text-zinc-900" : "text-white"}`}>
                  Signal
                </span>
              </div>
              <p className={`text-xs sm:text-sm leading-relaxed max-w-xs ${isLight ? "text-zinc-500" : "text-zinc-600"}`}>
                A permissionless Physical Oracle Layer. Community-powered. AI-verified. Settled on Solana.
              </p>
            </div>
            <div>
              <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 sm:mb-5 ${
                isLight ? "text-zinc-600 font-bold" : "text-zinc-500"
              }`}>
                Protocol
              </h4>
              <ul className="space-y-2.5 sm:space-y-3">
                <li>
                  <Link
                    href="/network"
                    className={`text-xs sm:text-sm transition-colors ${
                      isLight ? "text-zinc-600 hover:text-zinc-900" : "text-zinc-600 hover:text-white"
                    }`}
                  >
                    Live Network
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs"
                    className={`text-xs sm:text-sm transition-colors ${
                      isLight ? "text-zinc-600 hover:text-zinc-900" : "text-zinc-600 hover:text-white"
                    }`}
                  >
                    Developers
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 sm:mb-5 ${
                isLight ? "text-zinc-600 font-bold" : "text-zinc-500"
              }`}>
                Connect
              </h4>
              <ul className="space-y-2.5 sm:space-y-3">
                <li>
                  <a
                    href="https://x.com/signalprotcol"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-xs sm:text-sm transition-colors flex items-center gap-2 ${
                      isLight ? "text-zinc-600 hover:text-zinc-900" : "text-zinc-600 hover:text-white"
                    }`}
                  >
                    X / Twitter <ExternalLink size={11} />
                  </a>
                </li>
                <li>
                  <a
                    href={BOT_URL}
                    className={`text-xs sm:text-sm transition-colors flex items-center gap-2 ${
                      isLight ? "text-zinc-600 hover:text-zinc-900" : "text-zinc-600 hover:text-white"
                    }`}
                  >
                    Telegram Bot <ExternalLink size={11} />
                  </a>
                </li>
                <li>
                  <a
                    href="https://t.me/+gcVgzcIIu2M3ODFk"
                    className={`text-xs sm:text-sm transition-colors flex items-center gap-2 ${
                      isLight ? "text-zinc-600 hover:text-zinc-900" : "text-zinc-600 hover:text-white"
                    }`}
                  >
                    Community <ExternalLink size={11} />
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/southenempire/signal"
                    className={`text-xs sm:text-sm transition-colors flex items-center gap-2 ${
                      isLight ? "text-zinc-600 hover:text-zinc-900" : "text-zinc-600 hover:text-white"
                    }`}
                  >
                    GitHub <ExternalLink size={11} />
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className={`flex flex-col sm:flex-row justify-between items-center pt-6 sm:pt-8 border-t gap-3 sm:gap-4 ${
            isLight ? "border-zinc-300" : "border-white/[0.04]"
          }`}>
            <div className={`text-[10px] sm:text-[11px] font-mono tracking-widest uppercase text-center sm:text-left ${
              isLight ? "text-zinc-500" : "text-zinc-700"
            }`}>
              Signal Network · Physical Oracle Layer · 2026
            </div>
            <div className="flex items-center gap-2">
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-[#00D4AA]"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className={`text-[10px] sm:text-[11px] font-mono tracking-widest uppercase ${
                isLight ? "text-zinc-500" : "text-zinc-700"
              }`}>
                Operational · Solana Mainnet
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
