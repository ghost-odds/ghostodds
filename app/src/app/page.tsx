"use client";

import { useState, useMemo } from "react";
import { Search, TrendingUp, Clock, Flame, LayoutGrid } from "lucide-react";
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

const sortOptions = [
  { key: "volume", label: "Volume" },
  { key: "newest", label: "Newest" },
  { key: "ending", label: "Ending Soon" },
];

export default function HomePage() {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("volume");
  const [search, setSearch] = useState("");

  const markets = useMemo(() => {
    let filtered = [...MOCK_MARKETS];

    // Search
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (m) => m.question.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)
      );
    }

    // Filter
    if (filter === "Crypto" || filter === "DeFi") {
      filtered = filtered.filter((m) => m.category === filter);
    } else if (filter === "trending") {
      filtered = filtered.sort((a, b) => b.volume - a.volume).slice(0, 6);
    } else if (filter === "ending") {
      filtered = filtered
        .filter((m) => new Date(m.expiresAt).getTime() > Date.now())
        .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
    }

    // Sort
    if (sort === "volume") filtered.sort((a, b) => b.volume - a.volume);
    else if (sort === "newest") filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (sort === "ending") filtered.sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());

    return filtered;
  }, [filter, sort, search]);

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
        <a
          href="/demo"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-all duration-150 active:scale-[0.98]"
        >
          Try Demo Mode
        </a>
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

      {/* Market Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {markets.map((market) => (
          <MarketCard key={market.id} market={market} />
        ))}
      </div>

      {markets.length === 0 && (
        <div className="text-center py-20 text-text-muted">
          No markets found.
        </div>
      )}
    </div>
  );
}
