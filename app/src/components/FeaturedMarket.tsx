"use client";

import Link from "next/link";
import { Market } from "@/lib/types";
import { formatUSD, formatTimeRemaining } from "@/lib/format";
import { generatePriceHistory } from "@/lib/mock-activity";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { Clock, BarChart2, Users, Droplets } from "lucide-react";
import { getMarketStats } from "@/lib/mock-activity";

export function FeaturedMarket({ market }: { market: Market }) {
  const history = generatePriceHistory(market.yesPrice, 0.04, 60, market.id * 100 + 1);
  const stats = getMarketStats(market.id, market.volume);
  const yesPercent = Math.round(market.yesPrice * 100);
  const noPercent = 100 - yesPercent;

  return (
    <div className="mb-8 bg-surface border border-border rounded-2xl p-6 hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/20 text-primary">
          🔥 Featured
        </span>
        <span className="text-xs text-text-muted flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatTimeRemaining(market.expiresAt)}
        </span>
      </div>

      <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-4">{market.question}</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="h-32 sm:h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <YAxis domain={[0, 1]} hide />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Prices + Actions */}
        <div className="flex flex-col justify-between">
          <div className="flex gap-4 mb-4">
            <div className="flex-1 bg-success/10 border border-success/20 rounded-xl p-4 text-center">
              <div className="text-xs text-text-muted mb-1">YES</div>
              <div className="text-3xl font-mono font-bold text-success">{yesPercent}¢</div>
              <div className="text-xs text-text-muted mt-1">{yesPercent}% chance</div>
            </div>
            <div className="flex-1 bg-danger/10 border border-danger/20 rounded-xl p-4 text-center">
              <div className="text-xs text-text-muted mb-1">NO</div>
              <div className="text-3xl font-mono font-bold text-danger">{noPercent}¢</div>
              <div className="text-xs text-text-muted mt-1">{noPercent}% chance</div>
            </div>
          </div>

          <div className="flex gap-3 mb-4">
            <Link href={`/market/${market.id}`} className="flex-1">
              <button className="w-full py-2.5 rounded-lg bg-success/15 text-success font-semibold text-sm hover:bg-success/25 transition-colors cursor-pointer border border-success/20">
                Buy YES
              </button>
            </Link>
            <Link href={`/market/${market.id}`} className="flex-1">
              <button className="w-full py-2.5 rounded-lg bg-danger/15 text-danger font-semibold text-sm hover:bg-danger/25 transition-colors cursor-pointer border border-danger/20">
                Buy NO
              </button>
            </Link>
          </div>

          <div className="flex gap-4 text-xs text-text-muted">
            <span className="flex items-center gap-1"><BarChart2 className="w-3 h-3" />{formatUSD(market.volume)} vol</span>
            <span className="flex items-center gap-1"><Droplets className="w-3 h-3" />{formatUSD(market.liquidity)} liq</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{stats.totalTraders} traders</span>
          </div>
        </div>
      </div>
    </div>
  );
}
