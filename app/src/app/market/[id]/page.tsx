"use client";

import { use, useState, useMemo } from "react";
import {
  ArrowLeft, ExternalLink, Clock, BarChart2, Droplets, Calendar,
  Loader2, AlertCircle, Users, TrendingUp, Copy, Check, Info
} from "lucide-react";
import Link from "next/link";
import { useMarket } from "@/lib/useMarkets";
import { formatUSD, formatTimeRemaining } from "@/lib/format";
import { TradingPanel } from "@/components/TradingPanel";
import { generatePriceHistory, generateRecentTrades, getMarketStats, getDemoPDA } from "@/lib/mock-activity";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Area, AreaChart
} from "recharts";

type TimeRange = "1H" | "6H" | "24H" | "7D";
const RANGE_POINTS: Record<TimeRange, number> = { "1H": 60, "6H": 120, "24H": 200, "7D": 500 };

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function MarketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { market, loading, error } = useMarket(parseInt(id));
  const [range, setRange] = useState<TimeRange>("24H");
  const [copied, setCopied] = useState(false);

  const priceHistory = useMemo(() => {
    if (!market) return [];
    const pts = RANGE_POINTS[range];
    const all = generatePriceHistory(market.yesPrice, 0.015, 500, market.id * 13 + 7);
    // slice based on range
    if (range === "1H") return all.slice(-60);
    if (range === "6H") return all.slice(-120);
    if (range === "24H") return all.slice(-200);
    return all;
  }, [market, range]);

  const trades = useMemo(() => {
    if (!market) return [];
    return generateRecentTrades(market.id, market.yesPrice);
  }, [market]);

  const stats = useMemo(() => {
    if (!market) return { totalTraders: 0, volume24h: 0 };
    return getMarketStats(market.id, market.volume);
  }, [market]);

  const pda = useMemo(() => {
    if (!market) return "";
    return market.publicKey?.startsWith("demo") ? getDemoPDA(market.id) : (market.publicKey || "");
  }, [market]);

  const isDemo = market?.publicKey?.startsWith("demo");

  const copyPDA = () => {
    navigator.clipboard.writeText(pda);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  const priceMin = Math.min(...priceHistory.map(p => p.price));
  const priceMax = Math.max(...priceHistory.map(p => p.price));
  const yMin = Math.max(0, Math.floor(priceMin * 100 - 3) / 100);
  const yMax = Math.min(1, Math.ceil(priceMax * 100 + 3) / 100);

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
        {/* Left Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
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
              {isDemo && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-text-muted">
                  Demo
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

          {/* Price Chart */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">Price History</h3>
              <div className="flex gap-1">
                {(["1H", "6H", "24H", "7D"] as TimeRange[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      range === r
                        ? "bg-primary/20 text-primary"
                        : "text-text-muted hover:text-text-secondary"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={priceHistory} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" hide />
                  <YAxis
                    domain={[yMin, yMax]}
                    tickFormatter={(v: number) => `${Math.round(v * 100)}¢`}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    width={42}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#12121a",
                      border: "1px solid #1e1e2e",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ display: "none" }}
                    formatter={(value: number) => [`${Math.round(value * 100)}¢`, "YES"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#priceGradient)"
                    dot={false}
                    animationDuration={500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Volume", value: formatUSD(market.volume), icon: BarChart2 },
              { label: "24h Volume", value: formatUSD(stats.volume24h), icon: TrendingUp },
              { label: "Liquidity", value: formatUSD(market.liquidity), icon: Droplets },
              { label: "Traders", value: stats.totalTraders.toString(), icon: Users },
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

          {/* Recent Trades */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Recent Trades</h3>
            <div className="space-y-2">
              {trades.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      trade.side === "YES"
                        ? "bg-success/15 text-success"
                        : "bg-danger/15 text-danger"
                    }`}>
                      {trade.side}
                    </span>
                    <span className="text-sm font-mono text-text-primary">
                      ${trade.amount.toFixed(0)}
                    </span>
                    <span className="text-xs text-text-muted">
                      @{Math.round(trade.price * 100)}¢
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-muted font-mono">
                      {trade.wallet.slice(0, 4)}...{trade.wallet.slice(-4)}
                    </span>
                    <span className="text-xs text-text-muted w-16 text-right">
                      {timeAgo(trade.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resolution Details */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Resolution Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <ExternalLink className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
                <div>
                  <div className="text-text-primary font-medium">Oracle Source</div>
                  <div className="text-text-secondary text-xs">{market.resolutionSource}</div>
                </div>
              </div>
              {market.resolutionValue != null && (
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
                  <div>
                    <div className="text-text-primary font-medium">Resolution Criteria</div>
                    <div className="text-text-secondary text-xs">
                      Price {market.resolutionOperator === 0 ? "≥" : market.resolutionOperator === 1 ? "≤" : "="}{" "}
                      ${market.resolutionValue.toLocaleString()} at expiry
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
                <div>
                  <div className="text-text-primary font-medium">Fee</div>
                  <div className="text-text-secondary text-xs">{(market.feeBps || 0) / 100}% per trade</div>
                </div>
              </div>
              {market.outcome != null && (
                <div className={`text-sm font-semibold mt-2 ${market.outcome ? "text-success" : "text-danger"}`}>
                  ✓ Resolved: {market.outcome ? "YES" : "NO"}
                </div>
              )}
            </div>
          </div>

          {/* On-Chain Info */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">On-Chain Info</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">Market PDA</span>
                <div className="flex items-center gap-2">
                  <a
                    href={`https://explorer.solana.com/address/${pda}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:text-primary-hover font-mono"
                  >
                    {pda.slice(0, 6)}...{pda.slice(-6)}
                  </a>
                  <button onClick={copyPDA} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                    {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">Oracle Feed</span>
                <span className="text-xs text-text-secondary font-mono">{market.resolutionSource}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">Network</span>
                <span className="text-xs text-text-secondary">Solana Devnet</span>
              </div>
              <a
                href={`https://explorer.solana.com/address/${pda}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary-hover mt-1"
              >
                <ExternalLink className="w-3 h-3" />
                View on Solana Explorer
              </a>
            </div>
          </div>
        </div>

        {/* Right — Trading Panel (sticky) */}
        <div className="lg:self-start lg:sticky lg:top-24">
          <TradingPanel market={market} />
        </div>
      </div>
    </div>
  );
}
