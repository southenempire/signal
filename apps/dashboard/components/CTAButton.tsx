"use client";

import React, { useRef } from "react";

interface CTAButtonProps {
  children: React.ReactNode;
  href: string;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export default function CTAButton({ children, href, className = "" }: CTAButtonProps) {
  const ref = useRef<HTMLAnchorElement>(null);

  const ripple = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const btn = ref.current!;
    const { left, top } = btn.getBoundingClientRect();
    const span = document.createElement("span");
    const size = Math.max(btn.offsetWidth, btn.offsetHeight);
    span.className = "ripple";
    span.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - left - size / 2}px;top:${e.clientY - top - size / 2}px`;
    btn.appendChild(span);
    setTimeout(() => span.remove(), 700);
  };

  return (
    <a 
      ref={ref} 
      href={href} 
      target="_blank" 
      rel="noopener" 
      className={`cta-btn inline-flex items-center gap-2.5 ${className}`} 
      onClick={ripple}
    >
      {children}
    </a>
  );
}
