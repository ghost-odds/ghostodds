"use client";

import Link from "next/link";
import { Ghost } from "lucide-react";
import { GhostPattern } from "./GhostPattern";

export function Footer() {
  return (
    <footer className="relative border-t border-border mt-16 overflow-hidden">
      <GhostPattern variant="footer" />
      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Ghost className="w-5 h-5 text-primary" />
            <span className="text-sm text-text-secondary">
              GhostOdds © 2026 — Predict. Trade. No trace.
            </span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/" className="text-xs text-text-muted hover:text-text-primary transition-colors">
              Markets
            </Link>
            <Link href="/portfolio" className="text-xs text-text-muted hover:text-text-primary transition-colors">
              Portfolio
            </Link>
            <Link href="/admin" className="text-xs text-text-muted hover:text-text-primary transition-colors">
              Admin
            </Link>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="inline-block w-2 h-2 rounded-full bg-[#9945FF]" />
            Built on Solana
          </div>
        </div>
      </div>
    </footer>
  );
}
