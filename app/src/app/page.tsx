"use client";

import { useState, useMemo } from "react";
import { Search, TrendingUp, Clock, Flame, LayoutGrid, Loader2, AlertCircle, Ghost } from "lucide-react";
import { useMarkets } from "@/lib/useMarkets";
import { MarketCard } from "@/components/MarketCard";
import { cn } from "@/lib/utils";

const filters = [
  { key: "all", label: "All", icon: LayoutGrid },
  { key: "Crypto", label: "Crypto", icon: TrendingUp },
  { key: "DeFi", label: "DeFi", icon: Flame },
  { key: "trending", label: "Trending", icon: Flame },
  { key: "ending", label: "Ending Soon", icon: Clock },
];

const sortOptions = [
  { key: "volume", label: "Volume" },
  { key: "newest", label: "Newest" },
  { key: "ending", label: "Ending Soon" },
];

export default function HomePage() {
  const { markets: allMarkets, loading, error } = useMarkets();
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("volume");
  const [search, setSearch] = useState("");

  const markets = useMemo(() => {
    let filtered = [...allMarkets];

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (m) => m.question.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)
      );
    }

    if (filter === "Crypto" || filter === "DeFi") {
      filtered = filtered.filter((m) => m.category === filter);
    } else if (filter === "trending") {
      filtered = filtered.sort((a, b) => b.volume - a.volume).slice(0, 6);
    } else if (filter === "ending") {
      filtered = filtered
        .filter((m) => new Date(m.expiresAt).getTime() > Date.now())
        .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
    }

    if (sort === "volume") filtered.sort((a, b) => b.volume - a.volume);
    else if (sort === "newest") filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (sort === "ending") filtered.sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());

    return filtered;
  }, [allMarkets, filter, sort, search]);

  return (
    <div>
      {/* Hero */}
      <div className="text-center py-12 sm:py-16">
        <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-4">
          Predict. Trade. <span className="text-primary">No trace.</span>
        </h1>
        <p className="text-text-secondary text-lg max-w-xl mx-auto mb-8">
          Decentralized prediction markets on Solana. Trade outcomes on crypto prices, DeFi metrics, and more.
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

        <div className="flex gap-3 items-center">
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

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-secondary focus:outline-none focus:border-primary cursor-pointer"
          >
            {sortOptions.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && allMarkets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
          <p className="text-text-secondary">Loading markets from Solana devnet...</p>
        </div>
      )}

      {/* Error State */}
      {error && allMarkets.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="w-8 h-8 text-danger mb-4" />
          <p className="text-text-secondary mb-2">Failed to load markets</p>
          <p className="text-xs text-text-muted">{error}</p>
        </div>
      )}

      {/* Market Grid */}
      {!loading && markets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {markets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && allMarkets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <Ghost className="w-12 h-12 text-text-muted mb-4" />
          <p className="text-text-secondary text-lg mb-2">No markets yet</p>
          <p className="text-text-muted text-sm">Markets will appear here once created on-chain.</p>
        </div>
      )}

      {!loading && markets.length === 0 && allMarkets.length > 0 && (
        <div className="text-center py-20 text-text-muted">
          No markets match your search.
        </div>
      )}
    </div>
  );
}
