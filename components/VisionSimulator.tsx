'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Eye, ShieldCheck, Zap, Maximize2, Tag } from 'lucide-react';

export default function VisionSimulator() {
  const [stage, setStage] = useState<'IDLE' | 'SCANNING' | 'EXTRACTING' | 'DONE'>('IDLE');
  const [scannedText, setScannedText] = useState<{ x: number, y: number, text: string, label: string }[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setStage('IDLE');
      setScannedText([]);
      setTimeout(() => setStage('SCANNING'), 1000);
      setTimeout(() => {
        setStage('EXTRACTING');
        setScannedText([
          { x: 42, y: 35, text: '$3.45', label: 'UNLEADED/GALLON' },
          { x: 42, y: 65, text: '$3.98', label: 'PREMIUM/GALLON' },
        ]);
      }, 3000);
      setTimeout(() => setStage('DONE'), 5500);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden bg-black border border-white/10 shadow-2xl group">
      {/* Background Physical Asset */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-[5s]"
        style={{ 
          backgroundImage: `url('/sim/fuel_sign.png')`,
          filter: stage === 'SCANNING' ? 'grayscale(0.5) brightness(0.4)' : 'none',
          transform: stage === 'SCANNING' ? 'scale(1.05)' : 'scale(1)'
        }} 
      />

      {/* Holographic Overlay Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        
        {/* Scanning Beam */}
        <AnimatePresence>
          {stage === 'SCANNING' && (
            <motion.div 
              initial={{ top: '0%' }}
              animate={{ top: '100%' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#00FFAA] to-transparent shadow-[0_0_20px_#00FFAA]"
            />
          )}
        </AnimatePresence>

        {/* Node Telemetry Box */}
        <div className="absolute top-4 left-4 p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#00FFAA] animate-pulse" />
          <div className="font-mono text-[10px] text-white">
            <div className="font-bold opacity-50 uppercase tracking-tighter">Node ID: 8sf9...3k2</div>
            <div className={stage === 'SCANNING' ? 'text-[#00FFAA]' : 'text-white'}>
              {stage}
            </div>
          </div>
        </div>

        {/* Security Overlay (Vision AI) */}
        <div className="absolute top-4 right-4 p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-2">
           <ShieldCheck size={14} className={stage === 'DONE' ? 'text-[#00FFAA]' : 'text-zinc-500'} />
           <span className="font-mono text-[10px] text-white uppercase tracking-widest">
             {stage === 'DONE' ? 'Verified Hash: SHA-256' : 'Ingesting...'}
           </span>
        </div>

        {/* Extracted Labels */}
        {scannedText.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: stage === 'EXTRACTING' || stage === 'DONE' ? 1 : 0, scale: 1 }}
            className="absolute p-3 rounded-lg bg-[#00FFAA]/10 border border-[#00FFAA]/30 backdrop-blur-sm"
            style={{ left: `${t.x}%`, top: `${t.y}%` }}
          >
            <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-[#00FFAA]" />
            <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-[#00FFAA]" />
            
            <div className="font-mono text-[8px] text-[#00FFAA] font-bold uppercase tracking-widest mb-1">{t.label}</div>
            <div className="font-display text-xl font-black text-white">{t.text}</div>
            
            {/* Tracking Line */}
            <motion.div 
               animate={{ width: stage === 'EXTRACTING' ? [0, 40, 0] : 0 }}
               className="h-[1px] bg-[#00FFAA]/50 absolute top-1/2 left-full origin-left"
            />
          </motion.div>
        ))}

        {/* Final Result Card */}
        <AnimatePresence>
          {stage === 'DONE' && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-gradient-to-r from-zinc-900 to-black border border-white/20 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Zap size={48} className="text-[#00FFAA]" />
              </div>
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <div className="text-[10px] font-mono text-[#00FFAA] uppercase tracking-[0.2em] mb-1">State Decoupled</div>
                  <div className="text-sm font-bold text-white">Consensus Reached: $3.45/GL</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono text-zinc-500 mb-1">Confidence Score</div>
                  <div className="text-lg font-black text-[#00FFAA]">99.8%</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Decorative Grids */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
    </div>
  );
}
