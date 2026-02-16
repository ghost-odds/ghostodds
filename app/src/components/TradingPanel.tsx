"use client";

import { useState, useMemo } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { cn } from "@/lib/utils";
import { Market, Side } from "@/lib/types";
import { buyOutcome, sellOutcome } from "@/lib/anchor";
import { AlertTriangle, Loader2, Wallet, ArrowDownUp } from "lucide-react";
import { useToast } from "./Toast";

const QUICK_AMOUNTS = [10, 25, 50, 100, 250];

type TradeMode = "buy" | "sell";

export function TradingPanel({ market }: { market: Market }) {
  const { connected, publicKey, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();
  const { toast } = useToast();
  const [side, setSide] = useState<Side>("YES");
  const [mode, setMode] = useState<TradeMode>("buy");
  const [amount, setAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");

  const price = side === "YES" ? market.yesPrice : market.noPrice;
  const amountNum = parseFloat(amount) || 0;

  // Estimate output from AMM
  const estimate = useMemo(() => {
    if (amountNum <= 0 || !market.yesAmount || !market.noAmount) {
      return { tokensOut: 0, fee: 0, slippage: 0 };
    }

    const feeBps = market.feeBps || 200;
    const yesAmt = market.yesAmount;
    const noAmt = market.noAmount;

    if (mode === "buy") {
      const feeAmount = (amountNum * feeBps + 9999) / 10000;
      const inputAfterFee = amountNum - feeAmount;
      const [inputReserve, outputReserve] = side === "YES" ? [noAmt, yesAmt] : [yesAmt, noAmt];
      const k = inputReserve * outputReserve;
      const newInputReserve = inputReserve + inputAfterFee;
      const newOutputReserve = k / newInputReserve;
      const tokensOut = outputReserve - newOutputReserve;
      const effectivePrice = tokensOut > 0 ? amountNum / tokensOut : 0;
      const slippage = price > 0 ? Math.abs(effectivePrice - price) / price * 100 : 0;
      return { tokensOut, fee: feeAmount, slippage };
    } else {
      // Sell mode: amount is in tokens
      const [inputReserve, outputReserve] = side === "YES" ? [yesAmt, noAmt] : [noAmt, yesAmt];
      const k = inputReserve * outputReserve;
      const newInputReserve = inputReserve + amountNum;
      const newOutputReserve = k / newInputReserve;
      const collateralBefore = outputReserve - newOutputReserve;
      const feeAmount = (collateralBefore * feeBps + 9999) / 10000;
      const collateralOut = collateralBefore - feeAmount;
      return { tokensOut: collateralOut, fee: feeAmount, slippage: 0 };
    }
  }, [amountNum, market, side, mode]);

  const isLocked = market.status !== "active";

  const handleTrade = async () => {
    if (amountNum <= 0) return;

    if (!connected || !publicKey || !signTransaction || !signAllTransactions) {
      toast("Connect your wallet to trade", "error");
      return;
    }

    setLoading(true);
    setLoadingText("Preparing transaction...");

    try {
      const wallet = { publicKey, signTransaction, signAllTransactions };

      let txSig: string;

      if (mode === "buy") {
        setLoadingText("Confirm in wallet...");
        txSig = await buyOutcome(connection, wallet, market.id, amountNum, side === "YES");
      } else {
        setLoadingText("Confirm in wallet...");
        txSig = await sellOutcome(connection, wallet, market.id, amountNum, side === "YES");
      }

      setLoadingText("Confirming...");
      toast(
        mode === "buy"
          ? `Bought ${estimate.tokensOut.toFixed(2)} ${side} shares`
          : `Sold ${amountNum} ${side} shares for $${estimate.tokensOut.toFixed(2)}`,
        "success",
        `Tx: ${txSig.slice(0, 8)}...${txSig.slice(-8)}`
      );
      setAmount("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Transaction failed";
      if (msg.includes("rejected") || msg.includes("User rejected")) {
        toast("Transaction cancelled", "info");
      } else {
        toast("Transaction failed", "error", msg.length > 100 ? msg.slice(0, 100) + "..." : msg);
      }
    } finally {
      setLoading(false);
      setLoadingText("");
    }
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-5 sticky top-24">
      {/* Buy/Sell Toggle */}
      <div className="flex rounded-lg overflow-hidden border border-border mb-4">
        {(["buy", "sell"] as TradeMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "flex-1 py-2 text-xs font-semibold transition-colors cursor-pointer uppercase tracking-wider",
              mode === m
                ? m === "buy" ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
                : "bg-transparent text-text-secondary hover:text-text-primary"
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Side Toggle */}
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
            {s} — {Math.round((s === "YES" ? market.yesPrice : market.noPrice) * 100)}¢
          </button>
        ))}
      </div>

      <div className="mb-4">
        <label className="text-xs text-text-muted mb-1.5 block">
          {mode === "buy" ? "Amount (USDC)" : "Tokens to Sell"}
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          disabled={isLocked}
          className="w-full bg-background border border-border rounded-lg px-4 py-3 text-lg font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
        />
        {mode === "buy" && (
          <div className="flex gap-2 mt-2">
            {QUICK_AMOUNTS.map((qa) => (
              <button
                key={qa}
                onClick={() => setAmount(qa.toString())}
                disabled={isLocked}
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
        )}
      </div>

      <div className="space-y-2.5 mb-5 text-sm">
        <div className="flex justify-between">
          <span className="text-text-secondary">Price</span>
          <span className={cn("font-mono font-semibold", side === "YES" ? "text-success" : "text-danger")}>
            {Math.round(price * 100)}¢
          </span>
        </div>
        {amountNum > 0 && (
          <>
            <div className="flex justify-between">
              <span className="text-text-secondary">
                {mode === "buy" ? "Est. Shares" : "Est. Payout"}
              </span>
              <span className="font-mono text-text-primary">
                {mode === "buy" ? estimate.tokensOut.toFixed(2) : `$${estimate.tokensOut.toFixed(2)}`}
              </span>
            </div>
            {mode === "buy" && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Potential Payout</span>
                <span className="font-mono text-success">${estimate.tokensOut.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-text-secondary">Fee</span>
              <span className="font-mono text-text-muted">${estimate.fee.toFixed(2)}</span>
            </div>
            {estimate.slippage > 1 && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Price Impact</span>
                <span className="font-mono text-warning">{estimate.slippage.toFixed(1)}%</span>
              </div>
            )}
          </>
        )}
      </div>

      {estimate.slippage > 5 && amountNum > 0 && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-warning/10 border border-warning/30 rounded-lg text-warning text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>High price impact: {estimate.slippage.toFixed(1)}%</span>
        </div>
      )}

      {isLocked && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-warning/10 border border-warning/30 rounded-lg text-warning text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>This market is {market.status} — trading is disabled</span>
        </div>
      )}

      {!connected && !isLocked && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-primary/10 border border-primary/30 rounded-lg text-primary text-xs">
          <Wallet className="w-4 h-4 shrink-0" />
          <span>Connect wallet to place trades</span>
        </div>
      )}

      <button
        onClick={handleTrade}
        disabled={amountNum <= 0 || loading || isLocked}
        className={cn(
          "w-full py-3 rounded-lg font-semibold text-white transition-all duration-150 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
          mode === "buy"
            ? side === "YES" ? "bg-success hover:bg-success/90" : "bg-danger hover:bg-danger/90"
            : "bg-primary hover:bg-primary-hover"
        )}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            {loadingText}
          </span>
        ) : (
          mode === "buy"
            ? `Buy ${side} — $${amountNum.toFixed(2)}`
            : `Sell ${amountNum.toFixed(2)} ${side}`
        )}
      </button>
    </div>
  );
}
