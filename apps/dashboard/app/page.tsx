"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowRight, Send, ChevronRight, ExternalLink, Smartphone, Camera, CircleDollarSign, Zap, Trophy, Medal, ShieldCheck, CheckCircle2, MapPin, Network, Cpu } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import VisionSimulator from "../components/VisionSimulator";
import ImpactFeed from "../components/ImpactFeed";
import { motion, AnimatePresence } from "framer-motion";

const BOT_API = process.env.NEXT_PUBLIC_API_URL || "";
const LAUNCH_DATE = new Date("2026-05-01T00:00:00Z");
const isLive = () => {
    const now = new Date().getTime();
    return now >= LAUNCH_DATE.getTime();
};

/* ═══════════════════════════════════════════════════════
   CANVAS — Particle Network (DePIN nodes)
═══════════════════════════════════════════════════════ */
function ParticleNetwork() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf: number;
    let W = 0, H = 0;
    let mouse = { x: -9999, y: -9999 };

    type Particle = {
      x: number; y: number;
      vx: number; vy: number;
      r: number; alpha: number;
      pulse: number; pulseSpeed: number;
    };
    const particles: Particle[] = [];
    const COUNT = 90;

    function resize() {
      W = canvas.width  = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    }
    window.addEventListener("resize", resize);
    resize();

    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 2 + 1,
        alpha: Math.random() * 0.6 + 0.2,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.03,
      });
    }

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    canvas.addEventListener("mousemove", onMove);

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Update & draw particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
        p.pulse += p.pulseSpeed;

        // Mouse repulsion
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 80) {
          p.vx += (dx / dist) * 0.08;
          p.vy += (dy / dist) * 0.08;
          // Cap speed
          const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          if (speed > 1.5) { p.vx /= speed; p.vy /= speed; }
        } else {
          p.vx *= 0.999;
          p.vy *= 0.999;
        }

        const pulseAlpha = p.alpha + Math.sin(p.pulse) * 0.15;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16,185,129,${pulseAlpha})`;
        ctx.fill();

        // Glow
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
        grd.addColorStop(0, `rgba(16,185,129,${pulseAlpha * 0.4})`);
        grd.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          const MAX = 130;
          if (d < MAX) {
            const alpha = (1 - d / MAX) * 0.35;
            const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            grad.addColorStop(0, `rgba(124,92,252,${alpha})`);
            grad.addColorStop(0.5, `rgba(224,64,251,${alpha * 0.7})`);
            grad.addColorStop(1, `rgba(0,229,160,${alpha * 0.5})`);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Data packets along connections
      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.7 }}
    />
  );
}

/* ═══════════════════════════════════════════════════════
   TYPEWRITER
═══════════════════════════════════════════════════════ */
function Typewriter({ phrases }: { phrases: string[] }) {
  const [text, setText] = useState("");
  const [pIdx, setPIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const phrase = phrases[pIdx];
    const speed = deleting ? 40 : 80;
    const t = setTimeout(() => {
      if (!deleting && text === phrase) {
        if (pIdx === phrases.length - 1) { setDone(true); return; }
        setTimeout(() => setDeleting(true), 1800);
        return;
      }
      if (deleting && text === "") {
        setDeleting(false);
        setPIdx((p) => (p + 1) % phrases.length);
        return;
      }
      setText(deleting ? text.slice(0, -1) : phrase.slice(0, text.length + 1));
    }, speed);
    return () => clearTimeout(t);
  }, [text, deleting, pIdx, phrases]);

  return (
    <span className={`${done ? "" : "cursor-blink"}`}>
      {text || "\u00a0"}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════
   ANIMATED COUNTER
═══════════════════════════════════════════════════════ */
function Counter({ target, prefix = "", suffix = "", duration = 2000 }: {
  target: number; prefix?: string; suffix?: string; duration?: number;
}) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (target === 0) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 4);
          setVal(Math.floor(eased * target));
          if (progress < 1) requestAnimationFrame(tick);
          else setVal(target);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, duration]);

  return (
    <span ref={ref} className="font-display text-3xl sm:text-4xl font-black text-white tabular-nums">
      {prefix}{val.toLocaleString()}{suffix}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════
   SCROLL REVEAL HOOK
═══════════════════════════════════════════════════════ */
function useReveal(direction = "up", delay = 0) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add("reveal");
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        el.style.animationDelay = `${delay}ms`;
        el.classList.add(`in-view-${direction}`);
        obs.disconnect();
      }
    }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [direction, delay]);
  return ref;
}



/* ═══════════════════════════════════════════════════════
   SPARKLINE
═══════════════════════════════════════════════════════ */
function Sparkline({ color }: { color: string }) {
  const data = [28, 42, 36, 58, 50, 68, 62, 79, 72, 88];
  const max = Math.max(...data), min = Math.min(...data);
  const norm = (v: number) => 90 - ((v - min) / (max - min)) * 75;
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * 100},${norm(d)}`);
  const polyline = pts.join(" ");
  const area = `${pts[0]} ${pts.join(" ")} 100,100 0,100`;

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-12">
      <defs>
        <linearGradient id={`sg-${color.replace(/[#,()]/g,"")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.5" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sg-${color.replace(/[#,()]/g,"")})`} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════
   TICKER BAR
═══════════════════════════════════════════════════════ */
const TICKS = [
  "SOLANA MAINNET", "VISION AI VERIFIED", "USDC PAYOUTS", "HELIUS WEBHOOKS",
  "14 GLOBAL ZONES", "JUPITER INTEGRATED", "TELEGRAM NATIVE", "DEPIN ORACLE",
];
function Ticker() {
  const items = [...TICKS, ...TICKS];
  return (
    <div className="border-y border-white/5 bg-white/[0.015] overflow-hidden py-2.5 relative select-none">
      <div className="absolute left-0 top-0 bottom-0 w-20 z-10 bg-gradient-to-r from-[#04040d] to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 z-10 bg-gradient-to-l from-[#04040d] to-transparent pointer-events-none" />
      <div className="ticker-track">
        {items.map((t, i) => (
          <span key={i} className="font-mono text-[10px] font-bold tracking-[0.18em] text-zinc-600 flex items-center gap-4 px-6">
            <span className="w-1 h-1 rounded-full bg-violet-500/60 inline-block" />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   CTA BUTTON with ripple
═══════════════════════════════════════════════════════ */
function CTAButton({ href, children, className = "" }: {
  href: string; children: React.ReactNode; className?: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const ripple = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const btn = ref.current!;
    const { left, top } = btn.getBoundingClientRect();
    const span = document.createElement("span");
    const size = Math.max(btn.offsetWidth, btn.offsetHeight);
    span.className = "ripple";
    span.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-left-size/2}px;top:${e.clientY-top-size/2}px`;
    btn.appendChild(span);
    setTimeout(() => span.remove(), 700);
  };
  return (
    <a ref={ref} href={href} target="_blank" rel="noopener" className={`cta-btn inline-flex items-center gap-2.5 ${className}`} onClick={ripple}>
      {children}
    </a>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
export default function Home() {
  const [loading, setLoading] = useState(true);
  const [isLaunched, setIsLaunched] = useState(false);

  useEffect(() => {
    // Redirect logic enabled for production waitlist phase
    if (!isLive()) {
        window.location.href = "/waitlist";
    } else {
        setIsLaunched(true);
        setLoading(false);
    }
  }, []);

  const [selected, setSelected] = useState("Energy Grid");
  const [latency, setLatency] = useState(44);
  const [nodeCount, setNodeCount] = useState(0);
  const [volume, setVolume] = useState(0);
  const [totalReports, setTotalReports] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [liveReports, setLiveReports] = useState<any[]>([]);
  const [apiConnected, setApiConnected] = useState(false);

  // Refs for scroll-reveal sections
  const heroRef   = useReveal("up", 0);
  const statsRef  = useReveal("up", 100);
  const howRef    = useReveal("up", 0);
  const mktRef    = useReveal("up", 0);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const [s, r] = await Promise.all([
          fetch('/api/network-stats'),
          fetch('/api/truth-ledger'),
        ]);
        const stats = await s.json(), rpts = await r.json();
        setNodeCount(stats.activeNodes || 0);
        setVolume(parseFloat(stats.totalVolume.replace(/,/g, '')) || 0);
        setTotalReports(stats.totalReports || 0);
        setLiveReports(rpts); setApiConnected(true);
      } catch (err) { 
        console.error("Dashboard Fetch Error:", err);
        setApiConnected(false); 
      }
      setLatency(40 + Math.floor(Math.random() * 14));
    };
    fetch_();
    const id = setInterval(fetch_, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-animated overflow-x-hidden">
      {/* ── FULL-VIEWPORT BACKGROUND LAYER (canvas + orbs) ── */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <ParticleNetwork />
        {/* Vignette over canvas */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 90% 80% at 50% 40%, transparent 30%, #04040d 90%)" }} />
        {/* Floating colour orbs */}
        <div className="absolute top-[8%] left-[6%] w-[500px] h-[500px] rounded-full float-a" style={{ background: "radial-gradient(circle, rgba(124,92,252,0.35) 0%, transparent 65%)", filter: "blur(60px)" }} />
        <div className="absolute top-[15%] right-[5%] w-[400px] h-[400px] rounded-full float-b" style={{ background: "radial-gradient(circle, rgba(224,64,251,0.28) 0%, transparent 65%)", filter: "blur(70px)" }} />
        <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[300px]" style={{ background: "radial-gradient(ellipse, rgba(0,229,160,0.18) 0%, transparent 65%)", filter: "blur(80px)" }} />
        <div className="absolute top-1/2 left-[30%] w-[300px] h-[300px] rounded-full float-c" style={{ background: "radial-gradient(circle, rgba(96,165,250,0.15) 0%, transparent 65%)", filter: "blur(80px)" }} />
      </div>

      {/* ── HEADER REMOVED: Using Global NavBar from layout.tsx ── */}

      <Ticker />

      <main className="max-w-7xl mx-auto px-4 sm:px-8" style={{ position: "relative", zIndex: 1 }}>

        {/* ══ HERO ══════════════════════════════════════ */}
        <section className="pt-32 pb-32 min-h-screen flex items-center">
          <div ref={heroRef} className="w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
              {/* Left Side: Content */}
              <div className="lg:col-span-6 space-y-12">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3">
                    <div className="live-dot" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#10B981]">
                      {apiConnected ? `${nodeCount} Nodes Online` : "Community Network Live"}
                    </span>
                  </div>

                  <h1 className="font-display font-black tracking-tight leading-[1.1] text-white" style={{ fontSize: "clamp(48px, 6vw, 84px)" }}>
                    The Reality <br /> <span className="text-[#10B981]">Oracle.</span>
                  </h1>

                  <p className="text-zinc-400 text-lg md:text-xl max-w-lg leading-relaxed font-medium">
                    A community-powered network capturing real-world data verified by AI. 
                    <span className="text-white"> Earn rewards for providing the ground truth.</span>
                  </p>
                </motion.div>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <CTAButton href="https://t.me/OfficialSignalOracleBot" className="px-10 h-16">
                    Join the Movement
                  </CTAButton>
                  <a href="#how-it-works" className="text-white hover:text-[#10B981] font-bold text-sm transition-colors flex items-center gap-2 group">
                    How it works <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>

                {/* Relatable Social Proof */}
                <div className="pt-8 border-t border-white/5 grid grid-cols-2 gap-8">
                   <div>
                      <div className="text-2xl font-black text-white tabular-nums">${(volume / 1000).toFixed(1)}k+</div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Community Payouts</div>
                   </div>
                   <div>
                      <div className="text-2xl font-black text-white tabular-nums">{nodeCount}+</div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Verified Eyes</div>
                   </div>
                </div>
              </div>

              {/* Right Side: Immersive Visual */}
              <div className="lg:col-span-6 relative">
                <div className="absolute -inset-10 bg-[#10B981]/10 rounded-full blur-[100px] animate-pulse" />
                <motion.div 
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   transition={{ delay: 0.2 }}
                   className="relative glass p-4 overflow-hidden"
                >
                   <div className="relative aspect-square rounded-[24px] overflow-hidden border border-white/10 shadow-2xl">
                      <Image 
                        src="/hero-lifestyle.png" 
                        alt="Join the Signal movement" 
                        fill 
                        className="object-cover" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      
                      {/* Interactive Scanners Overlay */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-[#10B981]/50 rounded-2xl animate-pulse flex items-center justify-center">
                         <div className="w-full h-0.5 bg-[#10B981]/30 absolute top-1/2 animate-[bounce_2s_infinite]" />
                         <span className="font-mono text-[10px] text-[#10B981] font-black uppercase tracking-tighter bg-black/40 px-2 rounded">Scanning Reality</span>
                      </div>
                   </div>

                   {/* Floating "Relatable" Item */}
                   <motion.div 
                     animate={{ y: [0, -10, 0] }}
                     transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                     className="absolute -bottom-6 -right-6 p-6 glass border border-white/10 z-20 max-w-[200px]"
                   >
                      <div className="flex items-center gap-3 mb-2">
                         <div className="w-8 h-8 rounded-lg bg-[#10B981]/20 flex items-center justify-center">
                            <CheckCircle2 size={16} className="text-[#10B981]" />
                         </div>
                         <span className="text-[11px] font-bold text-white leading-tight">Price Verified</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 leading-relaxed">System confirmed $5.00 accuracy via collective consensus.</p>
                   </motion.div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ REALITY PORTAL HUB ══════════════════════════ */}
        <section className="py-24 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* GATEWAY 1: THE NETWORK (Mirror) */}
            <PortalCard 
              title="The Global Mirror"
              desc="Explore live physical coverage from 14+ regions captured by the community."
              btnText="Live Network"
              href="/network"
              icon={Network}
              accent="#10B981"
            >
              <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                 <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    <span>Truth Finality</span>
                    <span className="text-[#10B981]">Managed by Dune</span>
                 </div>
                 <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                    <motion.div 
                      className="h-full bg-[#10B981]" 
                      animate={{ width: ["20%", "60%", "45%", "85%"] }} 
                      transition={{ duration: 4, repeat: Infinity }}
                    />
                 </div>
              </div>
            </PortalCard>

            {/* GATEWAY 2: THE NODE (Rewards) */}
            <PortalCard 
              title="Profit from Truth"
              desc="Become a human sensor. Take photos of reality and earn USDC in seconds."
              btnText="Start Earning"
              href="https://t.me/OfficialSignalOracleBot"
              icon={Smartphone}
              accent="#3B82F6"
            >
              <div className="mt-8 pt-8 border-t border-white/5 flex gap-4">
                 {['Snap', 'Verify', 'Yield'].map(s => (
                    <div key={s} className="px-2 py-1 rounded-md bg-white/5 border border-white/5 text-[8px] font-black uppercase text-zinc-400">
                       {s}
                    </div>
                 ))}
              </div>
            </PortalCard>

            {/* GATEWAY 3: THE SDK (AI Agents) */}
            <PortalCard 
              title="World-Aware AI"
              desc="The developer terminal for building agents that sense the physical world."
              btnText="Docs & SDK"
              href="/docs"
              icon={Cpu}
              accent="#F59E0B"
            >
              <div className="mt-8 pt-8 border-t border-white/5 font-mono text-[9px] text-[#F59E0B]/60">
                 $ signal.query('FUEL_PRICE_NYC')
              </div>
            </PortalCard>

          </div>
        </section>

        {/* ══ LIVE ACTIVITY PULSE ═══════════════════════ */}
        <section className="pb-32 relative z-10" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="pt-24 mb-12 text-center">
            <div className="section-label justify-center">Live Network Activity</div>
            <h2 className="font-display text-2xl font-black text-white">Proof of Physical Work</h2>
          </div>
          <ImpactFeed />
        </section>

      </main>

      {/* ── FOOTER ─────────────────────────────────────── */}
      <footer className="pt-20 pb-12 border-t border-white/5 relative z-10 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                 <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-white/10">
                    <Image src="/logo.png" alt="Signal" fill className="object-cover" />
                 </div>
                 <span className="text-white font-[Space_Grotesk] font-bold text-xl tracking-tight">Signal</span>
              </div>
              <p className="text-zinc-500 text-sm max-w-xs leading-relaxed">
                A community-powered protocol capturing the world's ground truth, verified by AI.
              </p>
            </div>
            
            <div>
              <h4 className="font-display font-bold text-white text-[10px] mb-6 uppercase tracking-[0.2em]">Network</h4>
              <ul className="space-y-4">
                <li><a href="#how-it-works" className="text-zinc-500 text-sm hover:text-[#10B981] transition-colors">How It Works</a></li>
                <li><a href="#marketplace" className="text-zinc-500 text-sm hover:text-[#10B981] transition-colors">Insights</a></li>
                <li><Link href="/docs" className="text-zinc-500 text-sm hover:text-[#10B981] transition-colors">Docs</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-display font-bold text-white text-[10px] mb-6 uppercase tracking-[0.2em]">Social</h4>
              <ul className="space-y-4">
                <li><a href="https://t.me/OfficialSignalOracleBot" className="text-zinc-500 text-sm hover:text-[#10B981] transition-colors flex items-center gap-2">Telegram <ExternalLink size={12}/></a></li>
                <li><a href="https://github.com/southenempire/signal" className="text-zinc-500 text-sm hover:text-[#10B981] transition-colors flex items-center gap-2">GitHub <ExternalLink size={12}/></a></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-white/5 gap-4">
            <div className="text-zinc-600 text-[11px] font-mono tracking-widest uppercase">
              © 2026 SIGNAL NETWORK · DEPIN CORE
            </div>
            <div className="flex items-center gap-6">
              <span className="text-zinc-600 text-[11px] font-mono tracking-widest uppercase flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Connectivity: Operational
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Step card with reveal ─ */
function StepCardReveal({ step, delay }: { step: any; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const Icon = step.icon;

  useEffect(() => {
    const el = ref.current!;
    if (!el) return;
    el.classList.add("reveal");
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        el.style.animationDelay = `${delay}ms`;
        el.classList.add("in-view-up");
        obs.disconnect();
      }
    }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current!;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = e.clientX - left, y = e.clientY - top;
    const rx = ((y / height) - 0.5) * -14;
    const ry = ((x / width) - 0.5) * 14;
    el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
    el.style.setProperty("--mx", `${(x / width) * 100}%`);
    el.style.setProperty("--my", `${(y / height) * 100}%`);
  };

  const onLeave = () => {
    if (cardRef.current) cardRef.current.style.transform = "";
  };

  return (
    <div ref={ref}>
      <div
        ref={cardRef}
        className="step-card group"
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ transition: "transform 0.15s ease, border-color 0.3s ease" }}
      >
        {/* Step number bg */}
        <div className="absolute top-5 right-6 font-display font-black select-none pointer-events-none transition-colors group-hover:text-white/10" style={{ fontSize: "80px", lineHeight: 1, color: `${step.accent}08` }}>
          {step.num}
        </div>

        <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${step.bg} mb-5 relative z-10 transition-transform group-hover:scale-110`} style={{ border: `1px solid ${step.accent}22` }}>
          <Icon size={20} style={{ color: step.accent }} />
        </div>

        <h3 className="font-display font-bold text-xl text-white mb-3 relative z-10">{step.title}</h3>
        <p className="text-sm leading-relaxed relative z-10" style={{ color: "#808090" }}>{step.desc}</p>

        <a
          href="https://t.me/OfficialSignalOracleBot"
          target="_blank" rel="noopener"
          className="inline-flex items-center gap-1.5 text-xs font-bold mt-5 relative z-10 transition-all hover:gap-2.5"
          style={{ color: step.accent }}
        >
          Get Started <ArrowRight size={12} />
        </a>
      </div>
    </div>
  );
}

/* TiltCard needs onClick prop */
function TiltCard({ children, className, active = false, onClick }: {
  children: React.ReactNode; className?: string; active?: boolean; onClick?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current!;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = e.clientX - left, y = e.clientY - top;
    el.style.transform = `perspective(900px) rotateX(${((y / height) - 0.5) * -14}deg) rotateY(${((x / width) - 0.5) * 14}deg) scale(1.02)`;
    el.style.setProperty("--mx", `${(x / width) * 100}%`);
    el.style.setProperty("--my", `${(y / height) * 100}%`);
  };

  const onLeave = () => {
    ref.current!.style.transform = "";
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onClick}
      className={`feed-card${active ? " active" : ""} ${className ?? ""}`}
      style={{ transition: "transform 0.15s ease, border-color 0.3s ease", cursor: "pointer" }}
    >
      {children}
    </div>
  );
}
function PortalCard({ title, desc, btnText, href, icon: Icon, accent, children }: any) {
  const cardRef = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current!;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = e.clientX - left, y = e.clientY - top;
    const rx = ((y / height) - 0.5) * -12;
    const ry = ((x / width) - 0.5) * 12;
    el.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-8px)`;
    el.style.boxShadow = `0 25px 60px -15px ${accent}20`;
  };

  const onLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = "";
      cardRef.current.style.boxShadow = "";
    }
  };

  return (
    <motion.div 
      ref={cardRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="p-10 rounded-[40px] glass border border-white/5 transition-all duration-300 relative group overflow-hidden h-full flex flex-col"
    >
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon size={120} style={{ color: accent }} />
      </div>
      
      <div className="relative z-10 flex-grow">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8 border border-white/10" style={{ backgroundColor: `${accent}10` }}>
          <Icon size={24} style={{ color: accent }} />
        </div>
        <h3 className="text-2xl font-display font-black text-white mb-4">{title}</h3>
        <p className="text-zinc-500 text-sm leading-relaxed mb-8 max-w-[240px]">{desc}</p>
        
        {children}
      </div>

      <div className="mt-8 pt-8 border-t border-white/5 relative z-10">
        <Link 
          href={href} 
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest hover:gap-4 transition-all" 
          style={{ color: accent }}
        >
          {btnText} <ArrowRight size={14} />
        </Link>
      </div>
    </motion.div>
  );
}
