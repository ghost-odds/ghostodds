"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { useMarkets } from "@/lib/useMarkets";
import { createMarket } from "@/lib/anchor";
import { formatUSD } from "@/lib/format";
import { Plus, BarChart2, Users, DollarSign, Activity, Loader2, Wallet } from "lucide-react";
import { useToast } from "@/components/Toast";

export default function AdminPage() {
  const { connected, publicKey, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();
  const { markets, loading, refresh } = useMarkets();
  const { toast } = useToast();

  const [form, setForm] = useState({
    question: "",
    description: "",
    category: "Crypto",
    resolutionSource: "Pyth: SOL/USD",
    targetPrice: "",
    operator: "0", // 0 = >=
    expiry: "",
    liquidity: "",
  });
  const [creating, setCreating] = useState(false);

  const totalVolume = markets.reduce((s, m) => s + m.volume, 0);
  const activeCount = markets.filter((m) => m.status === "active").length;
  const estimatedFees = markets.reduce((s, m) => s + m.volume * ((m.feeBps || 200) / 10000), 0);

  const stats = [
    { label: "Total Volume", value: formatUSD(totalVolume), icon: BarChart2 },
    { label: "Total Markets", value: markets.length.toString(), icon: Activity },
    { label: "Active Markets", value: activeCount.toString(), icon: Users },
    { label: "Est. Fees", value: formatUSD(estimatedFees), icon: DollarSign },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !publicKey || !signTransaction || !signAllTransactions) {
      toast("Connect your wallet (must be platform authority)", "error");
      return;
    }

    setCreating(true);
    try {
      const wallet = { publicKey, signTransaction, signAllTransactions };
      const provider = new AnchorProvider(connection, wallet as never, { commitment: "confirmed" });

      const expiresAt = Math.floor(new Date(form.expiry).getTime() / 1000);
      const targetPrice = parseFloat(form.targetPrice);
      const liquidity = parseFloat(form.liquidity);

      if (isNaN(targetPrice) || isNaN(liquidity) || !form.expiry) {
        toast("Please fill all fields correctly", "error");
        setCreating(false);
        return;
      }

      const txSig = await createMarket(
        provider,
        form.question,
        form.description,
        form.category,
        form.resolutionSource,
        targetPrice,
        parseInt(form.operator),
        expiresAt,
        liquidity
      );

      toast("Market created!", "success", `Tx: ${txSig.slice(0, 8)}...${txSig.slice(-8)}`);
      setForm({ question: "", description: "", category: "Crypto", resolutionSource: "Pyth: SOL/USD", targetPrice: "", operator: "0", expiry: "", liquidity: "" });
      setTimeout(refresh, 2000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create market";
      toast("Market creation failed", "error", msg.length > 120 ? msg.slice(0, 120) + "..." : msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Admin Panel</h1>

      {!connected && (
        <div className="bg-surface border border-border rounded-xl p-10 text-center mb-8">
          <Wallet className="w-8 h-8 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary">Connect platform authority wallet to manage markets</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
              <Icon className="w-3.5 h-3.5" />
              {label}
            </div>
            <div className="text-xl font-mono font-bold text-text-primary">{loading ? "..." : value}</div>
          </div>
        ))}
      </div>

      {/* Create Market */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-text-primary mb-5 flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" />
          Create Market
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-text-muted mb-1 block">Question (max 128 chars)</label>
            <input
              type="text"
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              placeholder="Will SOL reach $300 by..."
              maxLength={128}
              className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
              required
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">Description (max 200 chars)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Detailed resolution criteria..."
              rows={3}
              maxLength={200}
              className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors resize-none"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-text-muted mb-1 block">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-text-secondary focus:outline-none focus:border-primary cursor-pointer"
              >
                {["Crypto", "DeFi", "NFTs", "Other"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Resolution Source (max 64)</label>
              <input
                type="text"
                value={form.resolutionSource}
                onChange={(e) => setForm({ ...form, resolutionSource: e.target.value })}
                placeholder="Pyth: SOL/USD"
                maxLength={64}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
                required
              />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Operator</label>
              <select
                value={form.operator}
                onChange={(e) => setForm({ ...form, operator: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-text-secondary focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="0">Above (≥)</option>
                <option value="1">Below (≤)</option>
                <option value="2">Equals (=)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-text-muted mb-1 block">Target Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.targetPrice}
                onChange={(e) => setForm({ ...form, targetPrice: e.target.value })}
                placeholder="250.00"
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
                required
              />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Expiry (min 24h from now)</label>
              <input
                type="datetime-local"
                value={form.expiry}
                onChange={(e) => setForm({ ...form, expiry: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-text-secondary focus:outline-none focus:border-primary cursor-pointer"
                required
              />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Initial Liquidity (USDC)</label>
              <input
                type="number"
                step="0.01"
                value={form.liquidity}
                onChange={(e) => setForm({ ...form, liquidity: e.target.value })}
                placeholder="100"
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={creating || !connected}
            className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-all duration-150 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {creating ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Creating...
              </span>
            ) : (
              "Create Market"
            )}
          </button>
        </form>
      </div>

      {/* Markets Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <h2 className="text-lg font-semibold text-text-primary px-5 py-4 border-b border-border">
          All Markets ({markets.length})
        </h2>
        {loading && markets.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : markets.length === 0 ? (
          <div className="text-center py-10 text-text-muted text-sm">
            No markets on-chain yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted text-xs">
                  <th className="text-left px-4 py-3 font-medium">ID</th>
                  <th className="text-left px-4 py-3 font-medium">Market</th>
                  <th className="text-center px-4 py-3 font-medium">YES</th>
                  <th className="text-right px-4 py-3 font-medium">Volume</th>
                  <th className="text-right px-4 py-3 font-medium">Liquidity</th>
                  <th className="text-right px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {markets.map((m) => (
                  <tr key={m.id} className="border-b border-border/50 hover:bg-surface-elevated transition-colors">
                    <td className="px-4 py-3 font-mono text-text-muted text-xs">#{m.id}</td>
                    <td className="px-4 py-3 text-text-primary max-w-xs truncate">{m.question}</td>
                    <td className="px-4 py-3 text-center font-mono text-success">{Math.round(m.yesPrice * 100)}¢</td>
                    <td className="px-4 py-3 text-right font-mono text-text-secondary">{formatUSD(m.volume)}</td>
                    <td className="px-4 py-3 text-right font-mono text-text-secondary">{formatUSD(m.liquidity)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        m.status === "active" ? "bg-success/15 text-success" :
                        m.status === "resolved" ? "bg-primary/15 text-primary" :
                        m.status === "cancelled" ? "bg-danger/15 text-danger" :
                        "bg-warning/15 text-warning"
                      }`}>
                        {m.status}
                      </span>
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
