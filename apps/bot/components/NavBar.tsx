'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Network, BookOpen, ExternalLink, Menu, X, Sun, Moon } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from './ThemeProvider';

const BOT_URL = "https://t.me/OfficialSignalOracleBot";

const navItems = [
  { name: 'Live Network', path: '/network', icon: Network },
  { name: 'Developers', path: '/docs', icon: BookOpen },
];

export default function NavBar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const isLight = theme === 'light';

  return (
    <header className="fixed top-3 inset-x-0 z-50 px-4 sm:px-8 max-w-7xl mx-auto">
      <div
        className={`rounded-2xl backdrop-blur-2xl transition-all duration-300 border px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between shadow-2xl ${
          isLight
            ? "bg-white/80 border-zinc-200/80 shadow-zinc-200/40"
            : "bg-[#0c0d14]/75 border-white/[0.08] shadow-black/80"
        }`}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-8 h-8 rounded-xl overflow-hidden border border-white/10 shadow-md">
            <Image src="/logo.png" alt="Signal" fill className="object-cover" />
          </div>
          <span className={`font-bold tracking-tight text-lg ${isLight ? "text-zinc-900" : "text-white"}`}>
            Signal
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? isLight ? "text-zinc-900 bg-black/5" : "text-white bg-white/10"
                    : isLight ? "text-zinc-600 hover:text-zinc-900 hover:bg-black/5" : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Right CTA + Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Light/Dark Toggle */}
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className={`p-2 rounded-full border transition-all ${
              isLight
                ? "bg-black/5 border-zinc-300 text-zinc-700 hover:bg-black/10"
                : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            {isLight ? <Moon size={15} className="text-[#7C5CFC]" /> : <Sun size={15} className="text-[#00D4AA]" />}
          </button>

          {/* Launch Bot CTA */}
          <a
            href={BOT_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold text-white transition-all shadow-lg hover:opacity-95 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #7C5CFC, #E040FB)",
              boxShadow: "0 0 24px rgba(124,92,252,0.4)",
            }}
          >
            <span>Launch Signal Bot</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          {/* Mobile menu toggle */}
          <button
            className={`md:hidden p-1.5 rounded-lg transition-colors ${
              isLight ? "text-zinc-700 hover:bg-black/5" : "text-zinc-400 hover:bg-white/10"
            }`}
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Dropdown */}
      {isOpen && (
        <div
          className={`md:hidden mt-2 p-4 rounded-2xl border backdrop-blur-2xl transition-all shadow-2xl ${
            isLight ? "bg-white/95 border-zinc-200" : "bg-[#0c0d14]/95 border-white/10"
          }`}
        >
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                    isActive
                      ? isLight ? "bg-black/5 text-zinc-900" : "bg-white/10 text-white"
                      : isLight ? "text-zinc-600 hover:bg-black/5" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
