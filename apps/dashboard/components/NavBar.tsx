'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Zap, Network, BookOpen, ExternalLink, Menu, X } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { name: 'Live Network', path: '/network', icon: Network },
  { name: 'Developers', path: '/docs', icon: BookOpen },
];

export default function NavBar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-white/10 group-hover:border-[#10B981]/50 transition-all shadow-2xl">
              <Image 
                src="/logo.png" 
                alt="Signal" 
                fill
                className="object-cover transition-transform group-hover:scale-110" 
              />
            </div>
            <span className="text-white font-[Space_Grotesk] font-bold tracking-tight text-xl hidden sm:block">
              Signal
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`relative px-3 py-2 text-sm font-medium transition-colors flex items-center gap-2
                    ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                  {isActive && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#10B981] to-transparent"
                      initial={false}
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* CTA & Mobile Toggle */}
          <div className="flex items-center gap-4">
            <a
              href="https://t.me/OfficialSignalOracleBot"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm text-white font-medium transition-all group"
            >
              Open Telegram
              <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
            <button 
              className="md:hidden text-gray-400 hover:text-white"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <motion.div 
        initial={false}
        animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
        className="md:hidden overflow-hidden bg-black/95 border-b border-white/5"
      >
        <div className="px-4 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium
                  ${isActive ? 'bg-white/5 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}
                `}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
          <a
             href="https://t.me/OfficialSignalOracleBot"
             target="_blank"
             className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-[#10B981] hover:bg-white/5 mt-4"
          >
            Launch Telegram Bot <ExternalLink className="w-5 h-5" />
          </a>
        </div>
      </motion.div>
    </header>
  );
}
