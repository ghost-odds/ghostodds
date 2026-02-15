"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Market, Side } from "@/lib/types";
import { AlertTriangle, Loader2 } from "lucide-react";

const QUICK_AMOUNTS = [10, 25, 50, 100, 250];
const FEE_RATE = 0.02;

export function TradingPanel({ market }: { market: Market }) {
  const [side, setSide] = useState<Side>("YES");
  const [amount, setAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const price = side === "YES" ? market.yesPrice : market.noPrice;
  const amountNum = parseFloat(amount) || 0;
  const shares = amountNum > 0 ? amountNum / price : 0;
  const fee = amountNum * FEE_RATE;
  const potentialPayout = shares * 1; // $1 per share if correct
  const slippage = amountNum > 100 ? ((amountNum / market.liquidity) * 100) : 0;

  const handleTrade = async () => {
    if (amountNum <= 0) return;
    setLoading(true);
    // Simulate transaction
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
    setAmount("");
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-5 sticky top-24">
      <div className="flex rounded-lg overflow-hidden border border-border mb-5">
        {(["YES", "NO"] as Side[]).map((s) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className={cn(
              "flex-1 py-2.5 text-sm font-semibold transition-colors cursor-pointer",
              side === s
                ? s === "YES"
                  ? "bg-success text-white"
                  : "bg-danger text-white"
                : "bg-transparent text-text-secondary hover:text-text-primary"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <label className="text-xs text-text-muted mb-1.5 block">Amount (USDC)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full bg-background border border-border rounded-lg px-4 py-3 text-lg font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
        />
        <div className="flex gap-2 mt-2">
          {QUICK_AMOUNTS.map((qa) => (
            <button
              key={qa}
              onClick={() => setAmount(qa.toString())}
              className={cn(
                "flex-1 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer",
                amount === qa.toString()
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-text-secondary hover:border-text-muted"
              )}
            >
              ${qa}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5 mb-5 text-sm">
        <div className="flex justify-between">
          <span className="text-text-secondary">Price</span>
          <span className={cn("font-mono font-semibold", side === "YES" ? "text-success" : "text-danger")}>
            {Math.round(price * 100)}¢
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Est. Shares</span>
          <span className="font-mono text-text-primary">{shares.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Potential Payout</span>
          <span className="font-mono text-success">${potentialPayout.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Fee (2%)</span>
          <span className="font-mono text-text-muted">${fee.toFixed(2)}</span>
        </div>
      </div>

      {slippage > 2 && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-warning/10 border border-warning/30 rounded-lg text-warning text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Estimated slippage: {slippage.toFixed(1)}%</span>
        </div>
      )}

      <button
        onClick={handleTrade}
        disabled={amountNum <= 0 || loading}
        className={cn(
          "w-full py-3 rounded-lg font-semibold text-white transition-all duration-150 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
          side === "YES" ? "bg-success hover:bg-success/90" : "bg-danger hover:bg-danger/90"
        )}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
        ) : success ? (
          "✓ Trade Placed!"
        ) : (
          `Buy ${side} — $${amountNum.toFixed(2)}`
        )}
      </button>
    </div>
  );
}
