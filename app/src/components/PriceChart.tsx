"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PricePoint } from "@/lib/types";

const TIMEFRAMES = [
  { label: "1H", hours: 1 },
  { label: "6H", hours: 6 },
  { label: "24H", hours: 24 },
  { label: "7D", hours: 168 },
];

export function PriceChart({ data }: { data: PricePoint[] }) {
  const [tf, setTf] = useState("7D");

  const hours = TIMEFRAMES.find((t) => t.label === tf)?.hours || 168;
  const cutoff = new Date(Date.now() - hours * 3600000).toISOString();
  const filtered = data.filter((p) => p.time >= cutoff);
  const points = filtered.length > 1 ? filtered : data.slice(-10);

  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 0.01;

  const width = 600;
  const height = 200;
  const padding = 4;

  const pathPoints = points.map((p, i) => {
    const x = padding + (i / (points.length - 1)) * (width - padding * 2);
    const y = height - padding - ((p.price - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const linePath = `M${pathPoints.join(" L")}`;
  const areaPath = `${linePath} L${width - padding},${height} L${padding},${height} Z`;

  const isUp = points.length > 1 && points[points.length - 1].price >= points[0].price;
  const color = isUp ? "#22c55e" : "#ef4444";

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-text-secondary">YES Price</span>
        <div className="flex gap-1">
          {TIMEFRAMES.map((t) => (
            <button
              key={t.label}
              onClick={() => setTf(t.label)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer",
                tf === t.label
                  ? "bg-primary/20 text-primary"
                  : "text-text-muted hover:text-text-secondary"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#chartGradient)" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" />
        {/* Last point dot */}
        {pathPoints.length > 0 && (
          <circle
            cx={pathPoints[pathPoints.length - 1].split(",")[0]}
            cy={pathPoints[pathPoints.length - 1].split(",")[1]}
            r="4"
            fill={color}
          />
        )}
      </svg>
      <div className="flex justify-between text-xs text-text-muted mt-1 font-mono">
        <span>{Math.round(min * 100)}¢</span>
        <span>{Math.round(max * 100)}¢</span>
      </div>
    </div>
  );
}
