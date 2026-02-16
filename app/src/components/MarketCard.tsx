"use client";

import Link from "next/link";
import { Clock, BarChart2, Users } from "lucide-react";
import { Market } from "@/lib/types";
import { formatUSD, formatTimeRemaining } from "@/lib/format";
import { generatePriceHistory, getMarketStats } from "@/lib/mock-activity";
import { LineChart, Line, ResponsiveContainer } from "recharts";

const categoryColors: Record<string, string> = {
  Crypto: "bg-primary/20 text-primary",
  DeFi: "bg-success/20 text-success",
  NFTs: "bg-warning/20 text-warning",
  Other: "bg-text-muted/20 text-text-muted",
};

export function MarketCard({ market }: { market: Market }) {
  const yesPercent = Math.round(market.yesPrice * 100);
  const noPercent = 100 - yesPercent;
  const history = generatePriceHistory(market.yesPrice, 0.03, 30, market.id * 77);
  const stats = getMarketStats(market.id, market.volume);

  return (
    <div className="group bg-surface border border-border rounded-xl p-5 hover:border-primary/50 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColors[market.category] || categoryColors.Other}`}>
          {market.category}
        </span>
        <span className="text-xs text-text-muted flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatTimeRemaining(market.expiresAt)}
        </span>
      </div>

      <Link href={`/market/${market.id}`}>
        <h3 className="text-[15px] font-semibold text-text-primary mb-3 leading-snug cursor-pointer hover:text-primary transition-colors">
          {market.question}
        </h3>
      </Link>

      {/* Probability bar */}
      <div className="flex h-2 rounded-full overflow-hidden mb-3">
        <div className="bg-success" style={{ width: `${yesPercent}%` }} />
        <div className="bg-danger" style={{ width: `${noPercent}%` }} />
      </div>

      {/* Prices */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-lg font-mono font-bold text-success">{yesPercent}¢</span>
          <span className="text-xs text-text-muted ml-1">YES</span>
        </div>
        <div className="text-right">
          <span className="text-lg font-mono font-bold text-danger">{noPercent}¢</span>
          <span className="text-xs text-text-muted ml-1">NO</span>
        </div>
      </div>

      {/* Sparkline */}
      <div className="h-10 mb-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history}>
            <Line type="monotone" dataKey="price" stroke="#6366f1" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-text-muted mb-3">
        <span className="flex items-center gap-1"><BarChart2 className="w-3 h-3" />{formatUSD(market.volume)}</span>
        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{stats.totalTraders}</span>
      </div>

      {/* Buy buttons */}
      <div className="flex gap-2 mt-auto">
        <Link href={`/market/${market.id}`} className="flex-1">
          <button className="w-full py-1.5 rounded-lg bg-success/10 text-success text-xs font-semibold hover:bg-success/20 transition-colors cursor-pointer border border-success/20">
            Yes {yesPercent}¢
          </button>
        </Link>
        <Link href={`/market/${market.id}`} className="flex-1">
          <button className="w-full py-1.5 rounded-lg bg-danger/10 text-danger text-xs font-semibold hover:bg-danger/20 transition-colors cursor-pointer border border-danger/20">
            No {noPercent}¢
          </button>
        </Link>
      </div>
    </div>
  );
}
