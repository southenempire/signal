'use client';

import { useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════════
   CINEMATIC DATA NETWORK BACKGROUND
   Drifting nodes joined by faint lines when they come close. Shared by Docs and Live Network.
   ═══════════════════════════════════════════════════════ */
export default function DataNetworkBackground({ count = 60, strength = 1 }: { count?: number; strength?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf: number;
    let W = 0, H = 0;

    const particles: { x: number; y: number; vx: number; vy: number; r: number }[] = [];

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        r: Math.random() * 1.5 + 0.5,
      });
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      // Darker green on the light theme, so the lines stay visible on a pale page.
      const light = document.documentElement.classList.contains('light');
      const rgb = light ? '4, 120, 87' : '16, 185, 129';

      // Draw Connections
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 200) {
            ctx.strokeStyle = `rgba(${rgb}, ${0.08 * strength * (1 - dist / 200) * 1.6})`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw Nodes
      for (const p of particles) {
        if (!still) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0) p.x = W;
          if (p.x > W) p.x = 0;
          if (p.y < 0) p.y = H;
          if (p.y > H) p.y = 0;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, ${0.2 * strength})`;
        ctx.fill();
      }
      if (!still) raf = requestAnimationFrame(draw);
    }
    draw();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
    };
  }, [count, strength]);

  return <canvas ref={ref} aria-hidden className="fixed inset-0 pointer-events-none z-0" />;
}
