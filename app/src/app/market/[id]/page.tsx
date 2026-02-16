"use client";

import { use } from "react";
import { ArrowLeft, ExternalLink, Clock, BarChart2, Droplets, Calendar, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useMarket } from "@/lib/useMarkets";
import { formatUSD, formatTimeRemaining } from "@/lib/format";
import { TradingPanel } from "@/components/TradingPanel";

export default function MarketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { market, loading, error } = useMarket(parseInt(id));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-text-secondary">Loading market data...</p>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-8 h-8 text-danger mb-4" />
        <p className="text-text-secondary mb-2">Market not found</p>
        <p className="text-xs text-text-muted mb-4">{error || "This market doesn't exist on-chain."}</p>
        <Link href="/" className="text-primary text-sm hover:text-primary-hover">← Back to Markets</Link>
      </div>
    );
  }

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
              {market.status !== "active" && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  market.status === "resolved" ? "bg-success/20 text-success" :
                  market.status === "cancelled" ? "bg-danger/20 text-danger" :
                  "bg-warning/20 text-warning"
                }`}>
                  {market.status.toUpperCase()}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-3">
              {market.question}
            </h1>
            <p className="text-text-secondary text-sm leading-relaxed">
              {market.description}
            </p>
          </div>

          {/* Price Display */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="grid grid-cols-2 gap-8">
              <div className="text-center">
                <div className="text-xs text-text-muted mb-2">YES Price</div>
                <div className="text-4xl font-mono font-bold text-success">
                  {Math.round(market.yesPrice * 100)}¢
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-text-muted mb-2">NO Price</div>
                <div className="text-4xl font-mono font-bold text-danger">
                  {Math.round(market.noPrice * 100)}¢
                </div>
              </div>
            </div>
          </div>

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
            <h3 className="text-sm font-semibold text-text-primary mb-2">Resolution Details</h3>
            <div className="space-y-2 text-sm text-text-secondary">
              <div className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                {market.resolutionSource}
              </div>
              {market.resolutionValue != null && (
                <div className="text-xs text-text-muted">
                  Target: {market.resolutionOperator === 0 ? "≥" : market.resolutionOperator === 1 ? "≤" : "="}{" "}
                  ${market.resolutionValue.toLocaleString()}
                </div>
              )}
              {market.outcome != null && (
                <div className={`text-xs font-semibold ${market.outcome ? "text-success" : "text-danger"}`}>
                  Resolved: {market.outcome ? "YES" : "NO"}
                </div>
              )}
            </div>
          </div>

          {/* On-chain Info */}
          <div className="bg-surface border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-2">On-Chain Info</h3>
            <div className="space-y-1.5 text-xs text-text-muted font-mono">
              {market.publicKey && (
                <div className="flex justify-between">
                  <span>Market PDA:</span>
                  <a
                    href={`https://explorer.solana.com/address/${market.publicKey}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary-hover"
                  >
                    {market.publicKey.slice(0, 8)}...{market.publicKey.slice(-8)}
                  </a>
                </div>
              )}
              <div className="flex justify-between">
                <span>Fee:</span>
                <span>{(market.feeBps || 0) / 100}%</span>
              </div>
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
