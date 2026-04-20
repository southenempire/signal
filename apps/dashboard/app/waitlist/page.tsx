"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Clock, Globe, Shield, Zap, ChevronRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import NavBar from "../../components/NavBar";
import { LAUNCH_DATE } from "../../lib/constants";

/* ═══════════════════════════════════════════════════════
   CINEMATIC PARTICLE BACKGROUND
   (Synchronized with main branding)
   ═══════════════════════════════════════════════════════ */
function ParticleBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf: number;
    let W = 0, H = 0;

    const particles: any[] = [];
    const COUNT = 120;

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
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        r: Math.random() * 1.5 + 0.5,
        targetAlpha: Math.random() * 0.4 + 0.1,
        currentAlpha: 0,
      });
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;

        p.currentAlpha += (p.targetAlpha - p.currentAlpha) * 0.05;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16, 185, 129, ${p.currentAlpha})`;
        ctx.fill();

        // Subtle glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = "rgba(16, 185, 129, 0.4)";
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={ref} className="fixed inset-0 pointer-events-none opacity-40" />;
}

/* ═══════════════════════════════════════════════════════
   WAITLIST PORTAL
   ═══════════════════════════════════════════════════════ */
export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [timeLeft, setTimeLeft] = useState({ days: 11, hours: 0, mins: 0, secs: 0 });

  // Countdown Logic: Targets 11 days from genesis repo initialization
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
      <ParticleBackground />
      
      <NavBar />

      {/* ─── HERO CONTENT ─── */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 max-w-4xl mx-auto text-center">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 1 }}
           className="space-y-6"
        >
          <h1 className="text-5xl md:text-8xl font-display font-black tracking-tighter leading-none italic mb-4">
            THE WORLD'S <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#10B981] to-zinc-500">
              FIRST HUMAN ORACLE
            </span>
          </h1>
          
          <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Bridging the physical-to-digital gap with decentralized human consensus. 
            Powered by Solana, authenticated by Claude-3.5-Sonnet Vision AI.
          </p>

          {/* ─── COUNTDOWN ─── */}
          <div className="grid grid-cols-4 gap-4 py-12 max-w-md mx-auto">
            {Object.entries(timeLeft).map(([label, val]) => (
              <div key={label} className="group flex flex-col items-center">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl md:text-3xl font-black italic backdrop-blur-xl group-hover:border-[#10B981]/50 transition-colors shadow-2xl">
                  {val.toString().padStart(2, '0')}
                </div>
                <div className="text-[10px] font-black uppercase text-zinc-500 mt-2 tracking-widest">
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* ─── EMAIL CAPTURE ─── */}
          <div className="max-w-md mx-auto w-full relative">
            <AnimatePresence mode="wait">
              {status === "success" ? (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="p-6 rounded-2xl bg-[#10B981]/10 border border-[#10B981]/30 flex flex-col items-center gap-3 backdrop-blur-xl"
                >
                  <CheckCircle2 className="text-[#10B981]" size={32} />
                  <div className="text-sm font-bold text-white uppercase tracking-wider">Welcome to Genesis. We'll alert you soon.</div>
                </motion.div>
              ) : (
                <motion.form 
                  exit={{ opacity: 0, scale: 0.95 }}
                  onSubmit={handleJoin} 
                  className="relative group"
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email for early access..."
                    className="w-full bg-[#0a0a0c] border border-white/10 rounded-2xl py-5 px-8 outline-none focus:border-[#10B981]/50 transition-all font-mono text-sm placeholder:text-zinc-600 focus:ring-4 focus:ring-[#10B981]/5"
                    disabled={status === "loading"}
                  />
                  <button
                    type="submit"
                    className="absolute right-3 top-3 bottom-3 px-6 bg-white text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#10B981] hover:text-white transition-all active:scale-95 disabled:opacity-50"
                    disabled={status === "loading"}
                  >
                    {status === "loading" ? "Joining..." : "Join Genesis"}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
            {status === "error" && (
              <p className="text-[10px] text-red-500 font-bold uppercase mt-2">Error joining waitlist. Try again.</p>
            )}
          </div>
        </motion.div>
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-10 p-12 flex flex-col items-center gap-8 border-t border-white/5 bg-[#08080a]/50 backdrop-blur-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl w-full">
          <Feature icon={Shield} title="Encrypted" desc="End-to-end encryption for all physical oracle signals." />
          <Feature icon={Zap} title="Sub-second" desc="Powered by Solana's lightning-fast finalized transactions." />
          <Feature icon={Clock} title="24/7 Autonomy" desc="Autonomous agent monitoring across global timezones." />
        </div>
        <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.3em]">
          Signal DePIN © 2026 Genesis Launch
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="flex flex-col items-center md:items-start text-center md:text-left gap-2 group">
      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 group-hover:text-[#10B981] group-hover:bg-[#10B981]/5 transition-all">
        <Icon size={16} />
      </div>
      <div className="font-display font-black text-xs uppercase tracking-widest text-zinc-300">{title}</div>
      <div className="text-[11px] text-zinc-500 leading-relaxed max-w-[200px]">{desc}</div>
    </div>
  );
}
