"use client";

import { useMemo } from "react";
import { DEMO_MARKETS } from "@/lib/demo-markets";

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function shortAddr(rng: () => number) {
  const hex = "0123456789abcdef";
  let s = "0x";
  for (let i = 0; i < 4; i++) s += hex[Math.floor(rng() * 16)];
  return s;
}

export function ActivityTicker() {
  const trades = useMemo(() => {
    const rng = seededRng(424242);
    const items: string[] = [];
    for (let i = 0; i < 24; i++) {
      const market = DEMO_MARKETS[Math.floor(rng() * DEMO_MARKETS.length)];
      const isYes = rng() > 0.45;
      const emoji = isYes ? "🟢" : "🔴";
      const side = isYes ? "YES" : "NO";
      const amount = Math.round(50 + rng() * 900);
      const addr = shortAddr(rng);
      const mins = Math.round(1 + rng() * 58);
      const q = market.question.length > 30 ? market.question.slice(0, 30) + "…" : market.question;
      items.push(`${emoji} ${addr} bought ${amount} ${side} on "${q}" — ${mins}m ago`);
    }
    return items;
  }, []);

  // Duplicate for seamless loop
  const all = [...trades, ...trades];

  return (
    <div className="mb-8 overflow-hidden relative group">
      <div className="flex gap-8 animate-ticker whitespace-nowrap group-hover:[animation-play-state:paused]">
        {all.map((t, i) => (
          <span key={i} className="text-xs text-text-muted flex-shrink-0">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
