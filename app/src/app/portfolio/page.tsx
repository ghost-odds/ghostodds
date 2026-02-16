"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { usePositions } from "@/lib/usePositions";
import { redeemWinnings } from "@/lib/anchor";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Wallet, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/components/Toast";
import Link from "next/link";

export default function PortfolioPage() {
  const { connected, publicKey, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();
  const { toast } = useToast();
  const { positions, loading, refresh } = usePositions();
  const [claiming, setClaiming] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const active = positions.filter((p) => !p.resolved);
  const resolved = positions.filter((p) => p.resolved && p.claimable);
  const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
  const totalValue = positions.reduce((sum, p) => sum + p.shares * p.currentPrice, 0);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
    toast("Positions refreshed", "info");
  };

  const handleClaim = async (marketId: number) => {
    if (!publicKey || !signTransaction || !signAllTransactions) return;
    setClaiming(marketId);
    try {
      const wallet = { publicKey, signTransaction, signAllTransactions };
      const provider = new AnchorProvider(connection, wallet as never, { commitment: "confirmed" });
      const txSig = await redeemWinnings(provider, marketId);
      toast("Winnings redeemed!", "success", `Tx: ${txSig.slice(0, 8)}...${txSig.slice(-8)}`);
      await refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to redeem";
      toast("Redeem failed", "error", msg.length > 100 ? msg.slice(0, 100) + "..." : msg);
    } finally {
      setClaiming(null);
    }
  };

  if (!connected) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-text-primary mb-6">Portfolio</h1>
        <div className="bg-surface border border-border rounded-xl p-10 text-center">
          <Wallet className="w-8 h-8 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary mb-2">Connect your wallet to view positions</p>
          <p className="text-xs text-text-muted">Your on-chain positions will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Portfolio</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Loading */}
      {loading && positions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
          <p className="text-text-secondary">Loading positions from chain...</p>
        </div>
      )}

      {!loading && (
        <>
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
              <Link href="/" className="inline-block mt-3 text-primary text-sm hover:text-primary-hover">
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
                        <td className="px-4 py-3 text-right font-mono text-text-primary">{pos.shares.toFixed(2)}</td>
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

          {/* Claimable */}
          {resolved.length > 0 && (
            <>
              <h2 className="text-lg font-semibold text-text-primary mb-4">Resolved — Claimable</h2>
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                {resolved.map((pos) => (
                  <div key={`${pos.marketId}-${pos.side}`} className="flex items-center justify-between px-4 py-3 border-b border-border/50 last:border-0">
                    <span className="text-text-primary text-sm">{pos.question}</span>
                    <button
                      onClick={() => handleClaim(pos.marketId)}
                      disabled={claiming === pos.marketId}
                      className="px-4 py-1.5 bg-success text-white text-xs font-semibold rounded-lg hover:bg-success/90 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {claiming === pos.marketId ? (
                        <span className="flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Claiming...
                        </span>
                      ) : (
                        `Redeem ${pos.side}`
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
