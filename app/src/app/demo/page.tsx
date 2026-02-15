"use client";

import { useState, useMemo } from "react";
import { Search, TrendingUp, Clock, Flame, LayoutGrid, Coins, Zap } from "lucide-react";
import { MOCK_MARKETS } from "@/lib/mock-data";
import { MarketCard } from "@/components/MarketCard";
import { cn } from "@/lib/utils";

const filters = [
  { key: "all", label: "All", icon: LayoutGrid },
  { key: "Crypto", label: "Crypto", icon: TrendingUp },
  { key: "DeFi", label: "DeFi", icon: Flame },
  { key: "trending", label: "Trending", icon: Flame },
  { key: "ending", label: "Ending Soon", icon: Clock },
];

export default function DemoPage() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [airdropped, setAirdropped] = useState(false);
  const [airdropping, setAirdropping] = useState(false);

  const handleAirdrop = async () => {
    setAirdropping(true);
    await new Promise((r) => setTimeout(r, 2000));
    setAirdropping(false);
    setAirdropped(true);
  };

  const markets = useMemo(() => {
    let filtered = [...MOCK_MARKETS];
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((m) => m.question.toLowerCase().includes(q));
    }
    if (filter === "Crypto" || filter === "DeFi") {
      filtered = filtered.filter((m) => m.category === filter);
    } else if (filter === "trending") {
      filtered = filtered.sort((a, b) => b.volume - a.volume).slice(0, 6);
    } else if (filter === "ending") {
      filtered = filtered.sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
    }
    return filtered;
  }, [filter, search]);

  return (
    <div>
      {/* Demo Banner */}
      <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-success/10 border border-primary/30 rounded-xl p-4 sm:p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔮</span>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Demo Mode</h2>
            <p className="text-xs text-text-secondary">
              Explore GhostOdds with devnet tokens. All trades are simulated on Solana devnet.
            </p>
          </div>
        </div>
        <button
          onClick={handleAirdrop}
          disabled={airdropping || airdropped}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 active:scale-[0.98] cursor-pointer shrink-0",
            airdropped
              ? "bg-success/20 text-success border border-success/30"
              : "bg-primary hover:bg-primary-hover text-white"
          )}
        >
          {airdropping ? (
            <>
              <Zap className="w-4 h-4 animate-pulse" />
              Airdropping...
            </>
          ) : airdropped ? (
            <>
              <Coins className="w-4 h-4" />
              1,000 USDC Received!
            </>
          ) : (
            <>
              <Coins className="w-4 h-4" />
              Airdrop Devnet USDC
            </>
          )}
        </button>
      </div>

      {/* Hero */}
      <div className="text-center py-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3">
          Predict. Trade. <span className="text-primary">No trace.</span>
        </h1>
        <p className="text-text-secondary max-w-lg mx-auto">
          Try out prediction markets risk-free on Solana devnet.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-1 flex-wrap">
          {filters.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                filter === key
                  ? "bg-primary/15 text-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search markets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors w-56"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {markets.map((market) => (
          <MarketCard key={market.id} market={market} />
        ))}
      </div>
    </div>
  );
}
