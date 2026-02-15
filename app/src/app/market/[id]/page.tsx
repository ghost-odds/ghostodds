"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Clock, BarChart2, Droplets, Calendar } from "lucide-react";
import Link from "next/link";
import { getMarketById, formatUSD, formatTimeRemaining } from "@/lib/mock-data";
import { TradingPanel } from "@/components/TradingPanel";
import { PriceChart } from "@/components/PriceChart";

export default function MarketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const market = getMarketById(parseInt(id));
  if (!market) notFound();

  return (
    <div>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Markets
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Content — 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                {market.category}
              </span>
              <span className="text-xs text-text-muted flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimeRemaining(market.expiresAt)}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-3">
              {market.question}
            </h1>
            <p className="text-text-secondary text-sm leading-relaxed">
              {market.description}
            </p>
          </div>

          {/* Price Chart */}
          <PriceChart data={market.priceHistory} />

          {/* Market Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Volume", value: formatUSD(market.volume), icon: BarChart2 },
              { label: "Liquidity", value: formatUSD(market.liquidity), icon: Droplets },
              { label: "Created", value: new Date(market.createdAt).toLocaleDateString(), icon: Calendar },
              { label: "Expires", value: new Date(market.expiresAt).toLocaleDateString(), icon: Clock },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-surface border border-border rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
                  <Icon className="w-3 h-3" />
                  {label}
                </div>
                <div className="text-sm font-semibold text-text-primary">{value}</div>
              </div>
            ))}
          </div>

          {/* Resolution Source */}
          <div className="bg-surface border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-2">Resolution Source</h3>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <ExternalLink className="w-4 h-4" />
              {market.resolutionSource}
            </div>
          </div>

          {/* Recent Trades */}
          <div className="bg-surface border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Recent Trades</h3>
            <div className="space-y-2">
              {market.recentTrades.slice(0, 8).map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-semibold text-xs px-2 py-0.5 rounded ${
                        trade.side === "YES"
                          ? "bg-success/15 text-success"
                          : "bg-danger/15 text-danger"
                      }`}
                    >
                      {trade.side}
                    </span>
                    <span className="font-mono text-text-primary">${trade.amount}</span>
                    <span className="text-text-muted">@ {Math.round(trade.price * 100)}¢</span>
                  </div>
                  <div className="flex items-center gap-3 text-text-muted text-xs">
                    <span className="font-mono">{trade.wallet}</span>
                    <span>{new Date(trade.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — Trading Panel */}
        <div>
          <TradingPanel market={market} />
        </div>
      </div>
    </div>
  );
}
