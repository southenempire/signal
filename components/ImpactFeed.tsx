"use client";

import { useEffect, useState } from "react";
import { User, MapPin, CheckCircle2, TrendingUp, Shield, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ImpactEntry {
  id: string;
  time: string;
  location: string;
  user: string;
  action: string;
  reward: string;
  avatarColor: string;
}

const LOCATIONS = ["London", "Tokyo", "New York", "Lagos", "Paris", "Berlin", "Seoul", "Sydney"];
const ACTIONS = [
  "verified fuel prices", 
  "updated retail stock", 
  "mapped local storefront", 
  "confirmed supply levels",
  "scanned pricing data"
];
const USERS = ["@signal_node", "@sol_scout", "@deboss", "@cryptoman", "@human_oracle"];
const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6"];

export default function ImpactFeed() {
  const [entries, setEntries] = useState<ImpactEntry[]>([]);

  const generateEntry = (): ImpactEntry => {
    const id = Math.random().toString(36).substring(7);
    const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
    const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    const user = USERS[Math.floor(Math.random() * USERS.length)];
    const avatarColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    
    return {
      id,
      time: "Just now",
      location,
      user,
      action,
      reward: (Math.random() * 0.5 + 0.1).toFixed(2),
      avatarColor,
    };
  };

  useEffect(() => {
    setEntries(Array.from({ length: 6 }, generateEntry));

    const interval = setInterval(() => {
      setEntries((prev) => [generateEntry(), ...prev.slice(0, 5)]);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-[400px] bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-[32px] overflow-hidden flex flex-col shadow-2xl">
      {/* Header */}
      <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#10B981]/10 flex items-center justify-center">
            <TrendingUp size={18} className="text-[#10B981]" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Community Impact</h3>
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-black">Institutional Data Stream</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
          <Shield size={10} className="text-[#10B981]" />
          <span className="text-[9px] text-zinc-300 font-bold uppercase tracking-widest">MagicBlock Secured</span>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-grow p-6 space-y-4 overflow-hidden relative">
        <AnimatePresence mode="popLayout" initial={false}>
          {entries.map((entry) => (
            <motion.div
              key={entry.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-all group"
            >
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/10 group-hover:scale-110 transition-transform relative"
                style={{ backgroundColor: `${entry.avatarColor}20`, color: entry.avatarColor }}
              >
                <User size={20} />
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#0a0a0c] border border-white/10 flex items-center justify-center shadow-lg">
                   <Lock size={8} className="text-zinc-500" />
                </div>
              </div>
              
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-bold text-xs">{entry.user}</span>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[8px] font-black uppercase text-zinc-500">
                     <CheckCircle2 size={8} className="text-[#10B981]" /> Visa.Settled
                  </div>
                </div>
                <p className="text-zinc-400 text-[11px] flex items-center gap-2">
                  <span className="shrink-0">{entry.action}</span>
                  <span className="text-zinc-600">in</span>
                  <span className="text-white flex items-center gap-1 font-medium">
                    <MapPin size={10} /> {entry.location}
                  </span>
                </p>
              </div>

              <div className="shrink-0 text-right">
                <div className="px-3 py-1.5 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 mb-1">
                   <div className="text-[10px] text-[#10B981] font-black tracking-tighter">+{entry.reward} USDC</div>
                </div>
                <div className="text-[7px] text-zinc-600 font-mono tracking-tighter uppercase whitespace-nowrap">SEC ID: {entry.id}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* Fader */}
        <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-[#0a0a0c] to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
