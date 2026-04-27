"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Zap, Clock, CheckCircle2, Camera, Coins, Users } from "lucide-react";
import Image from "next/image";

const LAUNCH_DATE = new Date("2026-05-01T00:00:00Z");

/* ═══════════════════════════════════════════════════════
   ANIMATED ORB BACKGROUND — Works great on mobile
   ═══════════════════════════════════════════════════════ */
function OrbBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Primary emerald orb */}
      <div className="absolute -top-[40%] -left-[20%] w-[80vw] h-[80vw] md:w-[50vw] md:h-[50vw] rounded-full bg-[#10B981]/[0.07] blur-[100px] animate-[pulse_8s_ease-in-out_infinite]" />
      {/* Secondary blue orb */}
      <div className="absolute -bottom-[30%] -right-[20%] w-[70vw] h-[70vw] md:w-[40vw] md:h-[40vw] rounded-full bg-[#3B82F6]/[0.05] blur-[100px] animate-[pulse_10s_ease-in-out_infinite_2s]" />
      {/* Center accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] rounded-full bg-[#10B981]/[0.03] blur-[80px] animate-[pulse_6s_ease-in-out_infinite_1s]" />
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />
      {/* Radial vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#050505_70%)]" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   FLOATING PARTICLES (Canvas - reduced count on mobile)
   ═══════════════════════════════════════════════════════ */
function FloatingParticles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf: number;
    let W = 0, H = 0;
    const particles: any[] = [];
    const isMobile = window.innerWidth < 768;
    const COUNT = isMobile ? 40 : 80;

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    window.addEventListener("resize", resize);
    resize();

    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        r: Math.random() * 1.2 + 0.3,
        alpha: Math.random() * 0.3 + 0.05,
      });
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16, 185, 129, ${p.alpha})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={ref} className="fixed inset-0 pointer-events-none opacity-50" />;
}

/* ═══════════════════════════════════════════════════════
   LIVE NETWORK PULSE — shows the protocol is alive
   ═══════════════════════════════════════════════════════ */
function LivePulse() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#10B981]/[0.08] border border-[#10B981]/20 backdrop-blur-xl"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]" />
      </span>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#10B981]">
        Network Active — Genesis Phase
      </span>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   STAT CARDS — Social proof on mobile
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
          transition={{ delay: 0.8 + i * 0.1 }}
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

/* ═══════════════════════════════════════════════════════
   WAITLIST PAGE
   ═══════════════════════════════════════════════════════ */
export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = LAUNCH_DATE.getTime() - now;

      if (distance < 0) {
        clearInterval(timer);
        window.location.href = "/";
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        mins: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        secs: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        body: JSON.stringify({ email }),
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) setStatus("success");
      else setStatus("error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#10B981]/30 flex flex-col relative overflow-hidden">
      <OrbBackground />
      <FloatingParticles />

      {/* ─── HERO ─── */}
      <main className="flex-1 flex items-center justify-center relative z-10 px-5 md:px-8 py-8 md:py-0 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center w-full">
          
          {/* Left: Genesis Asset (desktop only) */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1.2 }}
            className="hidden lg:flex relative items-center justify-center p-12"
          >
            <div className="absolute inset-0 bg-[#10B981]/5 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] border border-[#10B981]/10 rounded-full animate-[spin_20s_linear_infinite]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] border-dashed border-[#10B981]/20 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
            
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

          {/* Right: Content + Countdown */}
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
                Powered by Solana, authenticated by Claude-3.5-Sonnet Vision AI.
              </p>
            </div>

            {/* ─── COUNTDOWN ─── */}
            <div className="grid grid-cols-4 gap-3 md:gap-4 w-full max-w-sm md:max-w-md mx-auto lg:mx-0">
              {Object.entries(timeLeft).map(([label, val], i) => (
                <motion.div 
                  key={label} 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="group flex flex-col items-center"
                >
                  <div className="w-full aspect-square max-w-[80px] rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-2xl md:text-3xl font-black italic backdrop-blur-xl group-hover:border-[#10B981]/50 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden">
                    <span className="relative z-10">{val.toString().padStart(2, '0')}</span>
                    <div className="absolute inset-0 bg-gradient-to-br from-[#10B981]/[0.06] to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#10B981]/30 to-transparent" />
                  </div>
                  <div className="text-[9px] md:text-[10px] font-black uppercase text-zinc-500 mt-2 tracking-[0.15em]">
                    {label}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* ─── EMAIL CAPTURE ─── */}
            <div className="w-full max-w-sm md:max-w-md mx-auto lg:mx-0">
              <AnimatePresence mode="wait">
                {status === "success" ? (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-5 rounded-2xl bg-[#10B981]/10 border border-[#10B981]/30 flex flex-col items-center gap-3 backdrop-blur-xl"
                  >
                    <CheckCircle2 className="text-[#10B981]" size={28} />
                    <div className="text-xs font-bold text-white uppercase tracking-wider">Welcome to Genesis. We&apos;ll alert you soon.</div>
                  </motion.div>
                ) : (
                  <motion.form 
                    exit={{ opacity: 0, scale: 0.95 }}
                    onSubmit={handleJoin} 
                    className="relative group"
                  >
                    <div className="absolute -inset-[1px] bg-gradient-to-r from-[#10B981]/20 via-transparent to-[#10B981]/20 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity blur-sm" />
                    <div className="relative flex items-center bg-[#0a0a0c] border border-white/[0.08] rounded-2xl group-focus-within:border-[#10B981]/30 transition-all shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter email for early access..."
                        className="flex-1 bg-transparent py-4 md:py-5 pl-5 md:pl-6 pr-2 outline-none font-mono text-xs md:text-sm placeholder:text-zinc-600 text-white"
                        disabled={status === "loading"}
                      />
                      <button
                        type="submit"
                        className="mr-2 px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-[#10B981] to-[#059669] text-black rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
                        disabled={status === "loading"}
                      >
                        {status === "loading" ? "..." : "Join Genesis"}
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
              {status === "error" && (
                <p className="text-[10px] text-red-500 font-bold uppercase mt-2 text-center">Error joining. Try again.</p>
              )}
            </div>

            {/* ─── STATS (visible on mobile!) ─── */}
            <StatsRow />

          </motion.div>
        </div>
      </main>

      {/* ─── FOOTER FEATURES ─── */}
      <footer className="relative z-10 px-5 py-10 md:p-12 border-t border-white/[0.04] bg-gradient-to-t from-[#050505] to-transparent">
        <div className="grid grid-cols-3 gap-4 md:gap-12 max-w-5xl mx-auto w-full">
          <Feature icon={Shield} title="Encrypted" desc="End-to-end encryption for all physical oracle signals." />
          <Feature icon={Zap} title="Sub-second" desc="Powered by Solana's lightning-fast finalized transactions." />
          <Feature icon={Clock} title="24/7 Live" desc="Autonomous agent monitoring across global timezones." />
        </div>
        <div className="text-center mt-8">
          <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.3em]">
            Signal DePIN © 2026 · Genesis Launch
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="flex flex-col items-center text-center gap-2 group"
    >
      <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 group-hover:text-[#10B981] group-hover:border-[#10B981]/30 group-hover:bg-[#10B981]/[0.05] transition-all">
        <Icon size={16} />
      </div>
      <div className="font-display font-black text-[10px] md:text-xs uppercase tracking-widest text-zinc-300">{title}</div>
      <div className="text-[10px] text-zinc-500 leading-relaxed max-w-[180px] hidden md:block">{desc}</div>
    </motion.div>
  );
}
