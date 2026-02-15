"use client";

import { useState } from "react";
import { MOCK_MARKETS, formatUSD } from "@/lib/mock-data";
import { Plus, BarChart2, Users, DollarSign, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminPage() {
  const [form, setForm] = useState({
    question: "",
    description: "",
    category: "Crypto",
    resolutionSource: "SOL/USD",
    targetPrice: "",
    operator: "above",
    expiry: "",
    liquidity: "",
  });
  const [creating, setCreating] = useState(false);

  const stats = [
    { label: "Total Volume", value: formatUSD(MOCK_MARKETS.reduce((s, m) => s + m.volume, 0)), icon: BarChart2 },
    { label: "Total Markets", value: MOCK_MARKETS.length.toString(), icon: Activity },
    { label: "Active Markets", value: MOCK_MARKETS.filter((m) => m.status === "active").length.toString(), icon: Users },
    { label: "Fees Collected", value: formatUSD(MOCK_MARKETS.reduce((s, m) => s + m.volume * 0.02, 0)), icon: DollarSign },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    await new Promise((r) => setTimeout(r, 1500));
    setCreating(false);
    setForm({ question: "", description: "", category: "Crypto", resolutionSource: "SOL/USD", targetPrice: "", operator: "above", expiry: "", liquidity: "" });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Admin Panel</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
              <Icon className="w-3.5 h-3.5" />
              {label}
            </div>
            <div className="text-xl font-mono font-bold text-text-primary">{value}</div>
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
            <label className="text-xs text-text-muted mb-1 block">Question</label>
            <input
              type="text"
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              placeholder="Will SOL reach $300 by..."
              className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
              required
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Detailed resolution criteria..."
              rows={3}
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
              <label className="text-xs text-text-muted mb-1 block">Resolution Source</label>
              <select
                value={form.resolutionSource}
                onChange={(e) => setForm({ ...form, resolutionSource: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-text-secondary focus:outline-none focus:border-primary cursor-pointer"
              >
                {["SOL/USD", "BTC/USD", "ETH/USD"].map((f) => (
                  <option key={f}>Pyth: {f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Operator</label>
              <select
                value={form.operator}
                onChange={(e) => setForm({ ...form, operator: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-text-secondary focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="above">Above</option>
                <option value="below">Below</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-text-muted mb-1 block">Target Price ($)</label>
              <input
                type="number"
                value={form.targetPrice}
                onChange={(e) => setForm({ ...form, targetPrice: e.target.value })}
                placeholder="250.00"
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
                required
              />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Expiry</label>
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
                value={form.liquidity}
                onChange={(e) => setForm({ ...form, liquidity: e.target.value })}
                placeholder="10000"
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-all duration-150 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {creating ? "Creating..." : "Create Market"}
          </button>
        </form>
      </div>

      {/* Active Markets Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <h2 className="text-lg font-semibold text-text-primary px-5 py-4 border-b border-border">
          Active Markets
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted text-xs">
                <th className="text-left px-4 py-3 font-medium">Market</th>
                <th className="text-center px-4 py-3 font-medium">YES</th>
                <th className="text-right px-4 py-3 font-medium">Volume</th>
                <th className="text-right px-4 py-3 font-medium">Liquidity</th>
                <th className="text-right px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_MARKETS.map((m) => (
                <tr key={m.id} className="border-b border-border/50 hover:bg-surface-elevated transition-colors">
                  <td className="px-4 py-3 text-text-primary max-w-xs truncate">{m.question}</td>
                  <td className="px-4 py-3 text-center font-mono text-success">{Math.round(m.yesPrice * 100)}¢</td>
                  <td className="px-4 py-3 text-right font-mono text-text-secondary">{formatUSD(m.volume)}</td>
                  <td className="px-4 py-3 text-right font-mono text-text-secondary">{formatUSD(m.liquidity)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-success/15 text-success font-medium">
                      {m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
