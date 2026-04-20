"use client";

import { useEffect, useState, useRef } from "react";
import { Terminal, Shield, Activity, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LogEntry {
  id: string;
  timestamp: string;
  hash: string;
  action: string;
  depth: number;
  status: 'VERIFIED' | 'INGESTING' | 'SLASHED';
}

const ACTIONS = [
  "Vision AI Scan",
  "Spatial Core Check",
  "Collision Detection",
  "PDA State Commit",
  "Truth Ledger Sync",
  "Node Consensus",
];

const STATUSES: LogEntry['status'][] = ['VERIFIED', 'INGESTING', 'VERIFIED', 'VERIFIED'];

export default function TruthLedger() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const generateLog = (): LogEntry => {
    const id = Math.random().toString(36).substring(7);
    const hash = `sig_${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`;
    const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
    
    return {
      id,
      timestamp: new Date().toLocaleTimeString('en-GB', { hour12: false, fractionDigits: 3 } as any),
      hash,
      action,
      depth: Math.floor(Math.random() * 900) + 100,
      status,
    };
  };

  useEffect(() => {
    // Initial logs
    setLogs(Array.from({ length: 8 }, generateLog));

    const interval = setInterval(() => {
      setLogs((prev) => [generateLog(), ...prev.slice(0, 7)]);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden flex flex-col group hover:border-[#00FFAA]/20 transition-colors duration-500 shadow-2xl">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Terminal size={14} className="text-[#00FFAA]" />
            <div className="absolute inset-0 blur-sm bg-[#00FFAA]/50 animate-pulse" />
          </div>
          <span className="font-mono text-[10px] font-black tracking-widest text-zinc-400 uppercase">Truth Ledger Logs</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-[#00FFAA] animate-pulse" />
             <span className="font-mono text-[9px] text-[#00FFAA] uppercase tracking-tighter">Mainnet Sync</span>
          </div>
        </div>
      </div>

      {/* Logs Window */}
      <div 
        ref={containerRef}
        className="flex-grow p-4 space-y-3 font-mono text-[10px] overflow-hidden relative"
      >
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]" />
        
        <AnimatePresence mode="popLayout" initial={false}>
          {logs.map((log) => (
            <motion.div
              key={log.id}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex items-center gap-4 py-1.5 px-3 rounded-lg border border-transparent hover:border-white/5 hover:bg-white/[0.02] transition-all group/item"
            >
              <span className="text-zinc-600 tabular-nums shrink-0">{log.timestamp}</span>
              <span className="text-zinc-400 font-bold shrink-0">{log.action}</span>
              <span className="text-[#00FFAA]/60 flex-grow truncate">{log.hash}</span>
              
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-zinc-600 hidden sm:inline">D: {log.depth}nm</span>
                <div className={`px-2 py-0.5 rounded border text-[9px] font-black tracking-tighter ${
                  log.status === 'VERIFIED' ? 'bg-[#00FFAA]/10 border-[#00FFAA]/20 text-[#00FFAA]' : 
                  log.status === 'INGESTING' ? 'bg-zinc-500/10 border-zinc-500/20 text-zinc-500 animate-pulse' :
                  'bg-red-500/10 border-red-500/20 text-red-500'
                }`}>
                  {log.status}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer / Overlay */}
      <div className="p-3 border-t border-white/5 bg-black/40 backdrop-blur-xl flex justify-between items-center">
        <div className="flex gap-2">
           {[...Array(3)].map((_, i) => (
             <div key={i} className="w-1 h-3 bg-white/10 rounded-full" />
           ))}
        </div>
        <span className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest font-black">Oracle Runtime v2.0.4-genesis</span>
      </div>
    </div>
  );
}
