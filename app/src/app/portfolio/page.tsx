"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { getPositions, claimPosition } from "@/lib/positions-store";
import { getMarketById } from "@/lib/mock-data";
import { Position } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Wallet, RefreshCw } from "lucide-react";
import { useToast } from "@/components/Toast";
import Link from "next/link";

export default function PortfolioPage() {
  const { connected } = useWallet();
  const { toast } = useToast();
  const [positions, setPositions] = useState<Position[]>([]);
  const [claiming, setClaiming] = useState<number | null>(null);

  useEffect(() => {
    const load = () => {
      const stored = getPositions();
      // Update current prices from mock data
      const updated = stored.map((p) => {
        const market = getMarketById(p.marketId);
        if (!market) return p;
        const currentPrice = p.side === "YES" ? market.yesPrice : market.noPrice;
        const pnl = p.shares * (currentPrice - p.avgPrice);
        return { ...p, currentPrice, pnl: Math.round(pnl * 100) / 100 };
      });
      setPositions(updated);
    };
    load();
    // Refresh on focus (in case trades made on other pages)
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, []);

  const active = positions.filter((p) => !p.resolved);
  const resolved = positions.filter((p) => p.resolved || p.claimable);
  const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
  const totalValue = positions.reduce((sum, p) => sum + p.shares * p.currentPrice, 0);

  const handleClaim = async (marketId: number) => {
    setClaiming(marketId);
    await new Promise((r) => setTimeout(r, 1500));
    const updated = claimPosition(marketId);
    setPositions(updated);
    setClaiming(null);
    toast("Position claimed!", "success", "Funds returned to wallet");
  };

  if (!connected) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-text-primary mb-6">Portfolio</h1>
        <div className="bg-surface border border-border rounded-xl p-10 text-center">
          <Wallet className="w-8 h-8 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary mb-2">Connect your wallet to view positions</p>
          <p className="text-xs text-text-muted">Your demo trades will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Portfolio</h1>
        <button
          onClick={() => {
            const stored = getPositions();
            setPositions(stored);
            toast("Positions refreshed", "info");
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="text-xs text-text-muted mb-1">Total Value</div>
          <div className="text-2xl font-mono font-bold text-text-primary">
            ${totalValue.toFixed(2)}
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="text-xs text-text-muted mb-1">Total P&L</div>
          <div className={cn("text-2xl font-mono font-bold flex items-center gap-2", totalPnl >= 0 ? "text-success" : "text-danger")}>
            {totalPnl >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="text-xs text-text-muted mb-1">Active Positions</div>
          <div className="text-2xl font-mono font-bold text-text-primary">
            {active.length}
          </div>
        </div>
      </div>

      {/* Active Positions */}
      <h2 className="text-lg font-semibold text-text-primary mb-4">Active Positions</h2>
      {active.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-10 text-center mb-8">
          <Wallet className="w-8 h-8 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary">No active positions. Start trading!</p>
          <Link href="/demo" className="inline-block mt-3 text-primary text-sm hover:text-primary-hover">
            Browse Markets →
          </Link>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted text-xs">
                  <th className="text-left px-4 py-3 font-medium">Market</th>
                  <th className="text-center px-4 py-3 font-medium">Side</th>
                  <th className="text-right px-4 py-3 font-medium">Shares</th>
                  <th className="text-right px-4 py-3 font-medium">Avg Price</th>
                  <th className="text-right px-4 py-3 font-medium">Current</th>
                  <th className="text-right px-4 py-3 font-medium">P&L</th>
                </tr>
              </thead>
              <tbody>
                {active.map((pos) => (
                  <tr key={`${pos.marketId}-${pos.side}`} className="border-b border-border/50 hover:bg-surface-elevated transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/market/${pos.marketId}`} className="text-text-primary hover:text-primary transition-colors">
                        {pos.question.length > 45 ? pos.question.slice(0, 45) + "..." : pos.question}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("font-semibold text-xs px-2 py-0.5 rounded", pos.side === "YES" ? "bg-success/15 text-success" : "bg-danger/15 text-danger")}>
                        {pos.side}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-text-primary">{pos.shares.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right font-mono text-text-secondary">{Math.round(pos.avgPrice * 100)}¢</td>
                    <td className="px-4 py-3 text-right font-mono text-text-primary">{Math.round(pos.currentPrice * 100)}¢</td>
                    <td className={cn("px-4 py-3 text-right font-mono font-semibold", pos.pnl >= 0 ? "text-success" : "text-danger")}>
                      {pos.pnl >= 0 ? "+" : ""}${pos.pnl.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Resolved — Claimable</h2>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {resolved.map((pos) => (
              <div key={pos.marketId} className="flex items-center justify-between px-4 py-3 border-b border-border/50 last:border-0">
                <span className="text-text-primary text-sm">{pos.question}</span>
                <button
                  onClick={() => handleClaim(pos.marketId)}
                  disabled={claiming === pos.marketId}
                  className="px-4 py-1.5 bg-success text-white text-xs font-semibold rounded-lg hover:bg-success/90 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {claiming === pos.marketId ? "Claiming..." : `Claim $${(pos.shares * 1).toFixed(2)}`}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
