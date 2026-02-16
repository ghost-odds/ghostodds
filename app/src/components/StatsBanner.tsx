"use client";

import { useEffect, useState } from "react";

const stats = [
  { label: "Total Volume", target: 1200000, prefix: "$", suffix: "+", format: "compact" },
  { label: "Active Markets", target: 15, prefix: "", suffix: "+", format: "number" },
  { label: "Traders", target: 2400, prefix: "", suffix: "+", format: "comma" },
  { label: "Total Payouts", target: 890000, prefix: "$", suffix: "+", format: "compact" },
];

function formatValue(value: number, format: string, prefix: string, suffix: string) {
  let str: string;
  if (format === "compact") {
    if (value >= 1_000_000) str = `${(value / 1_000_000).toFixed(1)}M`;
    else if (value >= 1_000) str = `${(value / 1_000).toFixed(0)}K`;
    else str = value.toFixed(0);
  } else if (format === "comma") {
    str = value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  } else {
    str = value.toFixed(0);
  }
  return `${prefix}${str}${suffix}`;
}

export function StatsBanner() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 1500;
    function tick() {
      const elapsed = performance.now() - start;
      const p = Math.min(elapsed / duration, 1);
      // easeOutExpo
      setProgress(p === 1 ? 1 : 1 - Math.pow(2, -10 * p));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, []);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-surface border border-border rounded-xl p-4 text-center hover:border-primary/30 transition-colors"
        >
          <div className="text-2xl sm:text-3xl font-bold font-mono text-text-primary mb-1">
            {formatValue(Math.round(s.target * progress), s.format, s.prefix, s.suffix)}
          </div>
          <div className="text-xs text-text-muted uppercase tracking-wider">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
