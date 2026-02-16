"use client";

import { useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Wallet, DollarSign, Briefcase } from "lucide-react";
import { useUsdc } from "@/lib/usdc-context";
import { useToast } from "@/components/Toast";
import Link from "next/link";

// Seeded PRNG for deterministic mock positions per wallet
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function walletSeed(pubkey: string): number {
  let h = 0;
  for (let i = 0; i < pubkey.length; i++) {
    h = ((h << 5) - h + pubkey.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const MOCK_QUESTIONS = [
  "Will SOL reach $300 by March 2026?",
  "Will ETH flip BTC market cap by 2027?",
  "Will Bitcoin hit $150K by end of 2026?",
  "Will Solana TPS exceed 100K sustained?",
  "Will a Solana DEX surpass Uniswap in volume?",
  "Will Jupiter become top aggregator by TVL?",
  "Will Firedancer launch on mainnet by Q2 2026?",
  "Will NFT trading volume recover to 2021 levels?",
];

interface MockPosition {
  id: number;
  question: string;
  side: "YES" | "NO";
  shares: number;
  avgPrice: number;
  currentPrice: number;
  value: number;
  pnl: number;
}

function generateMockPositions(pubkey: string): MockPosition[] {
  const rng = seededRandom(walletSeed(pubkey));
  const count = 2 + Math.floor(rng() * 5); // 2-6 positions
  const positions: MockPosition[] = [];

  for (let i = 0; i < count; i++) {
    const qIdx = Math.floor(rng() * MOCK_QUESTIONS.length);
    const side = rng() > 0.5 ? "YES" as const : "NO" as const;
    const shares = Math.round((10 + rng() * 490) * 100) / 100;
    const avgPrice = Math.round((0.15 + rng() * 0.7) * 100) / 100;
    const drift = (rng() - 0.45) * 0.3; // slight upward bias
    const currentPrice = Math.max(0.05, Math.min(0.95, Math.round((avgPrice + drift) * 100) / 100));
    const value = Math.round(shares * currentPrice * 100) / 100;
    const cost = Math.round(shares * avgPrice * 100) / 100;
    const pnl = Math.round((value - cost) * 100) / 100;

    positions.push({ id: i + 1, question: MOCK_QUESTIONS[qIdx], side, shares, avgPrice, currentPrice, value, pnl });
  }
  return positions;
}

export default function PortfolioPage() {
  const { connected, publicKey } = useWallet();
  const { balance: usdcBalance, addBalance } = useUsdc();
  const { toast } = useToast();

  const pubkey = publicKey?.toBase58() ?? "";
  const positions = useMemo(() => (pubkey ? generateMockPositions(pubkey) : []), [pubkey]);
  const totalValue = positions.reduce((s, p) => s + p.value, 0) + usdcBalance;
  const totalPnl = positions.reduce((s, p) => s + p.pnl, 0);

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
        <button
          onClick={() => { addBalance(1000); toast("Received 1,000 USDC", "success"); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-success bg-success/10 border border-success/20 rounded-lg hover:bg-success/20 transition-colors cursor-pointer"
        >
          <DollarSign className="w-4 h-4" />
          Get Test USDC
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="text-xs text-text-muted mb-1">USDC Balance</div>
          <div className="text-2xl font-mono font-bold text-success">${usdcBalance.toLocaleString()}</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="text-xs text-text-muted mb-1">Total Portfolio Value</div>
          <div className="text-2xl font-mono font-bold text-text-primary">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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
          <div className="text-2xl font-mono font-bold text-text-primary flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            {positions.length}
          </div>
        </div>
      </div>

      {/* Positions Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <h2 className="text-lg font-semibold text-text-primary px-5 py-4 border-b border-border">
          Positions
        </h2>
        {positions.length === 0 ? (
          <div className="text-center py-10 text-text-muted text-sm">
            No positions yet. <Link href="/" className="text-primary hover:text-primary-hover">Browse markets</Link>
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
                  <th className="text-right px-4 py-3 font-medium">Current</th>
                  <th className="text-right px-4 py-3 font-medium">Value</th>
                  <th className="text-right px-4 py-3 font-medium">P&L</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((pos) => (
                  <tr key={pos.id} className="border-b border-border/50 hover:bg-surface-elevated transition-colors">
                    <td className="px-4 py-3 text-text-primary max-w-xs truncate">{pos.question}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("font-semibold text-xs px-2 py-0.5 rounded", pos.side === "YES" ? "bg-success/15 text-success" : "bg-danger/15 text-danger")}>
                        {pos.side}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-text-primary">{pos.shares.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono text-text-secondary">{Math.round(pos.avgPrice * 100)}¢</td>
                    <td className="px-4 py-3 text-right font-mono text-text-primary">{Math.round(pos.currentPrice * 100)}¢</td>
                    <td className="px-4 py-3 text-right font-mono text-text-primary">${pos.value.toFixed(2)}</td>
                    <td className={cn("px-4 py-3 text-right font-mono font-semibold", pos.pnl >= 0 ? "text-success" : "text-danger")}>
                      {pos.pnl >= 0 ? "+" : ""}${pos.pnl.toFixed(2)}
                    </td>
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
