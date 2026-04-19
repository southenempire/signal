"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowRight, Send, ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const BOT_API = "http://localhost:3001";

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
        ctx.fillStyle = `rgba(124,92,252,${pulseAlpha})`;
        ctx.fill();

        // Glow
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
        grd.addColorStop(0, `rgba(124,92,252,${pulseAlpha * 0.4})`);
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
        const [s, l, r] = await Promise.all([
          fetch(`${BOT_API}/api/stats`),
          fetch(`${BOT_API}/api/leaderboard`),
          fetch(`${BOT_API}/api/reports`),
        ]);
        const stats = await s.json(), lb = await l.json(), rpts = await r.json();
        setNodeCount(stats.signalers || 0);
        setVolume(parseFloat(stats.totalVolume) || 0);
        setTotalReports(stats.totalReports || 0);
        setLeaderboard(lb); setLiveReports(rpts); setApiConnected(true);
      } catch { setApiConnected(false); }
      setLatency(40 + Math.floor(Math.random() * 14));
    };
    fetch_();
    const id = setInterval(fetch_, 5000);
    return () => clearInterval(id);
  }, []);

  const feeds = [
    { name: "Energy Grid",    region: "SF, CA",      tag: "91 Updates", price: "0.50 USDC", trend: "+2.3%", up: true,  color: "#7c5cfc", spark: "#7c5cfc" },
    { name: "Fuel Index",     region: "London, UK",  tag: "LIVE",       price: "0.25 USDC", trend: "+0.8%", up: true,  color: "#e040fb", spark: "#e040fb" },
    { name: "NYC Temperature",region: "Manhattan",   tag: "23 Nodes",   price: "0.10 USDC", trend: "−0.4%", up: false, color: "#00e5a0", spark: "#00e5a0" },
    { name: "SOL/USD",        region: "On-Chain",    tag: "76 Feeds",   price: "FREE",      trend: "+5.1%", up: true,  color: "#60a5fa", spark: "#60a5fa" },
  ];

  const steps = [
    {
      num: "01",
      accent: "#7c5cfc",
      bg: "from-violet-600/20 to-violet-900/10",
      title: "Open the Bot",
      desc: "Message @OfficialSignalOracleBot on Telegram. No wallet, no seed phrase. Your embedded account is created in seconds.",
      visual: (
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: "rgba(124,92,252,0.15)", border: "1px solid rgba(124,92,252,0.3)" }}>
          ✈️
        </div>
      ),
    },
    {
      num: "02",
      accent: "#00e5a0",
      bg: "from-emerald-600/20 to-emerald-900/10",
      title: "Report Real Data",
      desc: "Snap a photo of a fuel price, grocery receipt, or electricity bill. Vision AI validates it in seconds.",
      visual: (
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: "rgba(0,229,160,0.1)", border: "1px solid rgba(0,229,160,0.25)" }}>
          📸
        </div>
      ),
    },
    {
      num: "03",
      accent: "#f59e0b",
      bg: "from-amber-600/20 to-amber-900/10",
      title: "Earn USDC",
      desc: "Once on-chain consensus is reached, USDC lands straight in your wallet. No gas. No bridge. Instant.",
      visual: (
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}>
          ⚡
        </div>
      ),
    },
  ];

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

      {/* ── HEADER ─────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl" style={{ background: "rgba(4,4,13,0.75)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl opacity-70 group-hover:opacity-100 transition-opacity" style={{ background: "conic-gradient(from 0deg, #7c5cfc, #e040fb, #00e5a0, #7c5cfc)", filter: "blur(6px)" }} />
              <Image src="/logo.png" alt="Signal Bot" width={40} height={40} className="relative rounded-xl border border-white/10" />
            </div>
            <div className="leading-none">
              <span className="font-display text-[18px] font-bold text-white tracking-tight">
                Signal<span style={{ color: "#7c5cfc" }}>Bot</span>
              </span>
              <div className="font-mono text-[10px] text-zinc-600 tracking-[0.14em] uppercase mt-0.5 hidden sm:block">
                DePIN · Solana
              </div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            <a href="#how-it-works" className="nav-link">How It Works</a>
            <a href="#marketplace"  className="nav-link">Marketplace</a>
            <Link href="/docs" className="nav-link inline-flex items-center gap-1">Docs <ArrowRight size={12}/></Link>
          </nav>

          <CTAButton href="https://t.me/OfficialSignalOracleBot" className="text-sm">
            <Send size={15} />
            <span className="hidden sm:inline">Open in</span> Telegram
          </CTAButton>
        </div>
      </header>

      <Ticker />

      <main className="max-w-7xl mx-auto px-4 sm:px-8" style={{ position: "relative", zIndex: 1 }}>

        {/* ══ HERO ══════════════════════════════════════ */}
        <section className="pt-24 pb-32" style={{ minHeight: "90vh", display: "flex", alignItems: "center" }}>
          <div ref={heroRef} className="w-full text-center">
            {/* Status line */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className="live-dot" style={{ width: 7, height: 7 }} />
              <span className="font-mono text-[11px] font-bold tracking-widest uppercase" style={{ color: apiConnected ? "#00e5a0" : "#7c5cfc" }}>
                {apiConnected ? `${nodeCount} Signalers Online` : "Genesis Network Live"}
              </span>
              <span className="font-mono text-[11px] tracking-widest" style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
              <span className="font-mono text-[11px] tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>Solana Mainnet</span>
            </div>

            {/* H1 with glitch hover */}
            <h1 className="font-display font-black tracking-tight leading-[1.02] mb-6" style={{ fontSize: "clamp(48px, 8vw, 88px)" }}>
              <span className="glitch-container text-white" data-text="Human-Powered">
                Human-Powered
              </span>
              <br />
              <span
                className="glitch-container"
                data-text="Oracle Network"
                style={{ background: "linear-gradient(135deg, #a78bfa, #e040fb, #00e5a0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
              >
                Oracle Network
              </span>
            </h1>

            {/* Typewriter subheadline */}
            <p className="text-zinc-400 text-lg sm:text-xl mb-3" style={{ maxWidth: "620px", margin: "0 auto 12px", lineHeight: 1.65 }}>
              Report real-world prices via Telegram. Earn USDC on Solana.
            </p>
            <p className="font-mono text-base mb-10" style={{ color: "#7c5cfc", maxWidth: "500px", margin: "0 auto 40px" }}>
              <Typewriter phrases={[
                "No wallet setup needed.",
                "Vision AI verified.",
                "Payouts on-chain. Instant.",
                "14 global oracle zones.",
              ]} />
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
              <CTAButton href="https://t.me/OfficialSignalOracleBot" className="text-base px-8 py-4">
                <Send size={18} /> Start Earning on Telegram
              </CTAButton>
              <a href="#marketplace" className="ghost-btn inline-flex items-center gap-2">
                Explore Data Feeds <ChevronRight size={16} />
              </a>
            </div>

            {/* Stats */}
            <div ref={statsRef} className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
              {[
                { label: "Active Signalers", value: nodeCount || 247,  prefix: "", suffix: "" },
                { label: "Reports Verified", value: totalReports || 12843, prefix: "", suffix: "" },
                { label: "USDC Paid Out",    value: Math.floor(volume) || 3610, prefix: "$", suffix: "" },
              ].map((s) => (
                <div key={s.label} className="stat-box text-center">
                  <div className="font-mono text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "#7c5cfc" }}>
                    {s.label}
                  </div>
                  <Counter target={s.value} prefix={s.prefix} suffix={s.suffix} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ HOW IT WORKS ══════════════════════════════ */}
        <section id="how-it-works" className="py-28" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div ref={howRef} className="text-center mb-16">
            <div className="section-label justify-center">How It Works</div>
            <h2 className="font-display font-bold tracking-tight text-white mb-4" style={{ fontSize: "clamp(32px, 5vw, 52px)" }}>
              Three steps. Real income.
            </h2>
            <p style={{ color: "#606080", maxWidth: "480px", margin: "0 auto" }}>
              No wallets, no gas, no complexity. Just open Telegram and go.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Connector */}
            <div className="hidden md:block absolute top-11 left-[18%] right-[18%] h-px" style={{ background: "linear-gradient(to right, transparent, rgba(124,92,252,0.4), rgba(224,64,251,0.3), rgba(0,229,160,0.2), transparent)" }} />

            {steps.map((s, i) => (
              <StepCardReveal key={i} step={s} delay={i * 130} />
            ))}
          </div>
        </section>

        {/* ══ MARKETPLACE ═══════════════════════════════ */}
        <section id="marketplace" className="py-28" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div ref={mktRef} className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Feed cards */}
            <div className="lg:col-span-2">
              <div className="mb-10">
                <div className="section-label">Intelligence Feeds</div>
                <h2 className="font-display font-bold text-white tracking-tight mb-2" style={{ fontSize: "clamp(28px, 4vw, 42px)" }}>
                  Buy real-world data
                </h2>
                <p style={{ color: "#606080", fontSize: "14px" }}>For AI agents & enterprises. Subscribe via Jupiter DCA.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {feeds.map((f) => (
                  <TiltCard key={f.name} active={selected === f.name} onClick={() => setSelected(f.name)}>
                    <div className="flex justify-between items-start mb-5">
                      <span className="font-mono text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ color: f.color, background: `${f.color}18`, border: `1px solid ${f.color}30` }}>
                        {f.region}
                      </span>
                      <span className={`font-mono text-[10px] font-bold px-2.5 py-1 rounded-full ${f.tag === "LIVE" ? "animate-pulse" : ""}`} style={f.tag === "LIVE" ? { color: "#f87171", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)" } : { color: "#606080", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        {f.tag}
                      </span>
                    </div>

                    <h3 className="font-display font-bold text-white text-lg mb-3">{f.name}</h3>
                    <Sparkline color={f.spark} />

                    <div className="flex justify-between items-center pt-4 mt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono font-bold text-sm text-white">{f.price}</span>
                        <span className="font-mono text-xs font-bold" style={{ color: f.up ? "#00e5a0" : "#f87171" }}>{f.trend}</span>
                      </div>
                      <button className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-bold bg-white text-black hover:bg-zinc-100 transition-colors">
                        Buy <ExternalLink size={11} />
                      </button>
                    </div>
                  </TiltCard>
                ))}
              </div>
            </div>

            {/* Right panel */}
            <div className="flex flex-col gap-5">

              {/* Network health */}
              <div className="spin-border rounded-3xl p-6 relative overflow-hidden" style={{ background: "rgba(10,10,24,0.8)" }}>
                <div className="absolute top-0 left-0 w-full h-0.5" style={{ background: "linear-gradient(90deg, #7c5cfc, #e040fb, #00e5a0)" }} />
                <div className="font-mono text-[10px] font-bold tracking-widest uppercase mb-6 flex items-center gap-2" style={{ color: "#7c5cfc" }}>
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#7c5cfc" }} />
                  Network Health
                </div>
                <div className="space-y-5">
                  {[
                    { label: "RPC Latency",      val: `${latency}ms`, pct: `${100 - latency}%`, color: "#00e5a0" },
                    { label: "Oracle Consensus",  val: "99.98%",       pct: "99%",               color: "#7c5cfc" },
                    { label: "Data Integrity",    val: "100%",         pct: "100%",              color: "#60a5fa" },
                  ].map((m) => (
                    <div key={m.label}>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium" style={{ color: "#b0b0d0" }}>{m.label}</span>
                        <span className="font-mono text-sm font-bold" style={{ color: m.color }}>{m.val}</span>
                      </div>
                      <div className="prog">
                        <div className="prog-fill" style={{ width: m.pct, background: m.color, boxShadow: `0 0 8px ${m.color}80` }} />
                      </div>
                    </div>
                  ))}
                  <div className="p-3 rounded-xl text-xs font-mono leading-relaxed" style={{ background: "rgba(124,92,252,0.07)", border: "1px solid rgba(124,92,252,0.15)", color: "#a0a0d0" }}>
                    Helius Webhooks active. All 14 global zones synced.
                  </div>
                </div>
              </div>

              {/* Signaler portal */}
              <div className="glass rounded-3xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(124,92,252,0.15) 0%, transparent 70%)", filter: "blur(30px)" }} />

                <div className="flex items-center gap-2 mb-1 relative z-10">
                  <span className="font-display text-base font-bold text-white">Signaler Portal</span>
                  <span className="ml-auto font-mono text-[9px] font-black px-2 py-0.5 rounded-full tracking-wider" style={{ background: "rgba(124,92,252,0.15)", color: "#7c5cfc", border: "1px solid rgba(124,92,252,0.25)" }}>
                    GENESIS
                  </span>
                </div>
                <p className="font-mono text-[10px] tracking-widest uppercase mb-6" style={{ color: "#606080" }}>
                  Tester Program · Week 2
                </p>

                <div className="space-y-3 relative z-10">
                  {leaderboard.length > 0 ? (
                    <div className="space-y-2 mb-4">
                      {leaderboard.slice(0, 3).map((e: any) => (
                        <div key={e.rank} className="flex justify-between items-center px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                          <span className="font-mono text-xs" style={{ color: "#909090" }}>
                            {e.rank === 1 ? "🥇" : e.rank === 2 ? "🥈" : "🥉"} {e.wallet}
                          </span>
                          <span className="font-mono text-xs font-bold" style={{ color: "#7c5cfc" }}>{e.points} PTS</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-5 rounded-xl mb-3" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="text-2xl mb-1">🏆</div>
                      <p className="font-mono text-xs" style={{ color: "#505070" }}>No reports yet — be first!</p>
                    </div>
                  )}

                  <div className="p-4 rounded-2xl" style={{ background: "linear-gradient(135deg, rgba(124,92,252,0.15), rgba(224,64,251,0.08))", border: "1px solid rgba(124,92,252,0.2)" }}>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#7c7caa" }}>Prize Pool · 15% Share</p>
                    <p className="font-display text-3xl font-black text-white" style={{ textShadow: "0 0 30px rgba(124,92,252,0.5)" }}>$45.00</p>
                    <p className="font-mono text-[10px] mt-1" style={{ color: "rgba(124,92,252,0.7)" }}>Updates with each verified report</p>
                  </div>

                  <CTAButton href="https://t.me/OfficialSignalOracleBot" className="w-full justify-center text-sm py-3">
                    <Send size={14} /> Join & Earn USDC
                  </CTAButton>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ LIVE FEED ═════════════════════════════════ */}
        {liveReports.length > 0 && (
          <section className="py-16" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="flex justify-between items-end mb-6">
              <div>
                <div className="section-label">Live Oracle Feed</div>
                <h2 className="font-display text-2xl font-bold text-white">Real-time submissions</h2>
              </div>
              <div className="live-pill"><div className="live-dot" />LIVE</div>
            </div>
            <div className="space-y-2">
              {liveReports.slice(0, 5).map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between px-5 py-3 rounded-2xl" style={{ background: "rgba(10,10,24,0.6)", border: "1px solid rgba(255,255,255,0.05)", transition: "border-color 0.2s" }}>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] font-bold px-2 py-1 rounded-md" style={{ color: "#7c5cfc", background: "rgba(124,92,252,0.1)", border: "1px solid rgba(124,92,252,0.2)" }}>{r.category}</span>
                    <span className="font-mono text-sm font-bold text-white">${r.price}</span>
                    <span className="font-mono text-xs" style={{ color: "#505070" }}>{r.wallet}</span>
                  </div>
                  <span className="font-mono text-xs font-bold" style={{ color: "#00e5a0" }}>+${r.reward} USDC</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ── FOOTER ─────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.04)", marginTop: "64px" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Signal Bot" width={28} height={28} className="rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.08)" }} />
            <div>
              <span className="font-display text-sm font-bold text-white">Signal<span style={{ color: "#7c5cfc" }}>Bot</span></span>
              <p className="font-mono text-[9px] tracking-widest uppercase mt-0.5" style={{ color: "#404060" }}>Built on Solana · DePIN Protocol</p>
            </div>
          </div>
          <div className="flex gap-6 text-sm" style={{ color: "#505070" }}>
            <Link href="/docs"                                                      className="hover:text-white transition-colors font-medium">Documentation</Link>
            <a href="https://t.me/OfficialSignalOracleBot" target="_blank" rel="noopener" className="hover:text-white transition-colors font-medium">Telegram Bot</a>
            <a href="https://github.com/southenempire/signal" target="_blank" rel="noopener" className="hover:text-white transition-colors font-medium">GitHub</a>
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

  useEffect(() => {
    const el = ref.current!;
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
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = e.clientX - left, y = e.clientY - top;
    const rx = ((y / height) - 0.5) * -14;
    const ry = ((x / width) - 0.5) * 14;
    el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
    el.style.setProperty("--mx", `${(x / width) * 100}%`);
    el.style.setProperty("--my", `${(y / height) * 100}%`);
  };

  const onLeave = () => {
    cardRef.current!.style.transform = "";
  };

  return (
    <div ref={ref}>
      <div
        ref={cardRef}
        className="step-card"
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ transition: "transform 0.15s ease, border-color 0.3s ease" }}
      >
        {/* Step number bg */}
        <div className="absolute top-5 right-6 font-display font-black select-none pointer-events-none" style={{ fontSize: "80px", lineHeight: 1, color: `${step.accent}08` }}>
          {step.num}
        </div>

        <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${step.bg} mb-5 relative z-10`} style={{ border: `1px solid ${step.accent}22` }}>
          <span className="text-xl">{step.visual.props.children}</span>
        </div>

        <h3 className="font-display font-bold text-xl text-white mb-3 relative z-10">{step.title}</h3>
        <p className="text-sm leading-relaxed relative z-10" style={{ color: "#808090" }}>{step.desc}</p>

        <a
          href="https://t.me/OfficialSignalOracleBot"
          target="_blank" rel="noopener"
          className="inline-flex items-center gap-1.5 text-xs font-bold mt-5 relative z-10 transition-colors hover:opacity-80"
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
