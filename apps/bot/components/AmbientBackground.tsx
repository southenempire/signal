"use client";

import { motion } from "framer-motion";

export default function AmbientBackground({ isLight }: { isLight: boolean }) {
  if (isLight) {
    return (
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Subtle grid pattern for light mode */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(#000 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
        {/* Soft daylight ambient tints */}
        <motion.div
          className="absolute -top-32 left-1/3 w-[500px] h-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(124,92,252,0.06) 0%, transparent 70%)",
            filter: "blur(70px)",
          }}
          animate={{
            x: [0, 40, -30, 0],
            y: [0, -25, 20, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Precision Dark Matrix Grid */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, #000 40%, transparent 90%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, #000 40%, transparent 90%)",
        }}
      />

      {/* Floating Aurora Orb 1 (Electric Purple) */}
      <motion.div
        className="absolute -top-40 left-1/4 w-[700px] h-[700px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(124,92,252,0.18) 0%, rgba(124,92,252,0.04) 45%, transparent 70%)",
          filter: "blur(80px)",
        }}
        animate={{
          x: [0, 60, -40, 0],
          y: [0, -40, 30, 0],
          scale: [1, 1.08, 0.95, 1],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Floating Aurora Orb 2 (Hot Pink / Magenta) */}
      <motion.div
        className="absolute top-1/3 right-1/4 w-[600px] h-[600px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(224,64,251,0.12) 0%, rgba(224,64,251,0.02) 45%, transparent 70%)",
          filter: "blur(90px)",
        }}
        animate={{
          x: [0, -50, 40, 0],
          y: [0, 50, -30, 0],
          scale: [1, 0.94, 1.06, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Floating Aurora Orb 3 (Teal Verified Wave) */}
      <motion.div
        className="absolute bottom-1/4 left-1/3 w-[650px] h-[650px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(0,212,170,0.10) 0%, transparent 65%)",
          filter: "blur(85px)",
        }}
        animate={{
          x: [0, 40, -50, 0],
          y: [0, -30, 40, 0],
          scale: [1, 1.1, 0.92, 1],
        }}
        transition={{
          duration: 24,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Vignette Rim Light to enhance contrast */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle at 50% 0%, transparent 30%, rgba(6,6,8,0.7) 90%)",
        }}
      />
    </div>
  );
}
