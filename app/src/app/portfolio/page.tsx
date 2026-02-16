"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Wallet, DollarSign, Briefcase, Trash2 } from "lucide-react";
import { useUsdc } from "@/lib/usdc-context";
import { usePositions } from "@/lib/positions-context";
import { useToast } from "@/components/Toast";
import Link from "next/link";

export default function PortfolioPage() {
  const { connected, publicKey } = useWallet();
  const { balance: usdcBalance, addBalance } = useUsdc();
  const { positions, clearPositions } = usePositions();
  const { toast } = useToast();

  // Filter out zero-share positions
  const activePositions = positions.filter(p => p.shares > 0);

  const totalPositionValue = activePositions.reduce((s, p) => s + p.shares * p.avgPrice, 0);
  const totalValue = totalPositionValue + usdcBalance;

  if (!connected) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-text-primary mb-6">Portfolio</h1>
        <div className="bg-surface border border-border rounded-xl p-10 text-center">
          <Wallet className="w-8 h-8 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary mb-2">Connect your wallet to view portfolio</p>
          <p className="text-xs text-text-muted">Your positions and balances will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Portfolio</h1>
        <div className="flex items-center gap-2">
          {activePositions.length > 0 && (
            <button
              onClick={() => { clearPositions(); toast("Positions cleared", "info"); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-text-muted hover:text-danger bg-transparent border border-border rounded-lg hover:border-danger/30 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          )}
          <button
            onClick={() => { addBalance(1000); toast("Received 1,000 USDC", "success"); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-success bg-success/10 border border-success/20 rounded-lg hover:bg-success/20 transition-colors cursor-pointer"
          >
            <DollarSign className="w-4 h-4" />
            Get Test USDC
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="text-xs text-text-muted mb-1">USDC Balance</div>
          <div className="text-2xl font-mono font-bold text-success">${usdcBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="text-xs text-text-muted mb-1">Total Portfolio Value</div>
          <div className="text-2xl font-mono font-bold text-text-primary">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="text-xs text-text-muted mb-1">Active Positions</div>
          <div className="text-2xl font-mono font-bold text-text-primary flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            {activePositions.length}
          </div>
        </div>
      </div>

      {/* Positions Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <h2 className="text-lg font-semibold text-text-primary px-5 py-4 border-b border-border">
          Positions
        </h2>
        {activePositions.length === 0 ? (
          <div className="text-center py-10 text-text-muted text-sm">
            No positions yet. <Link href="/" className="text-primary hover:text-primary-hover">Browse markets</Link> to start trading.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted text-xs">
                  <th className="text-left px-4 py-3 font-medium">Market</th>
                  <th className="text-center px-4 py-3 font-medium">Side</th>
                  <th className="text-right px-4 py-3 font-medium">Shares</th>
                  <th className="text-right px-4 py-3 font-medium">Avg Price</th>
                  <th className="text-right px-4 py-3 font-medium">Cost Basis</th>
                </tr>
              </thead>
              <tbody>
                {activePositions.map((pos, i) => (
                  <tr key={`${pos.marketId}-${pos.side}-${i}`} className="border-b border-border/50 hover:bg-surface-elevated transition-colors">
                    <td className="px-4 py-3 text-text-primary max-w-xs truncate">
                      <Link href={`/market/${pos.marketId}`} className="hover:text-primary transition-colors">
                        {pos.marketQuestion}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("font-semibold text-xs px-2 py-0.5 rounded", pos.side === "YES" ? "bg-success/15 text-success" : "bg-danger/15 text-danger")}>
                        {pos.side}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-text-primary">{pos.shares.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono text-text-secondary">{Math.round(pos.avgPrice * 100)}¢</td>
                    <td className="px-4 py-3 text-right font-mono text-text-primary">${(pos.shares * pos.avgPrice).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
