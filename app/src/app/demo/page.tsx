"use client";

import { useState, useMemo, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Search, TrendingUp, Clock, Flame, LayoutGrid, Coins, Zap, Droplets } from "lucide-react";
import { MOCK_MARKETS } from "@/lib/mock-data";
import { MarketCard } from "@/components/MarketCard";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/Toast";

const filters = [
  { key: "all", label: "All", icon: LayoutGrid },
  { key: "Crypto", label: "Crypto", icon: TrendingUp },
  { key: "DeFi", label: "DeFi", icon: Flame },
  { key: "trending", label: "Trending", icon: Flame },
  { key: "ending", label: "Ending Soon", icon: Clock },
];

function MarketCardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 h-[180px] animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="w-16 h-5 bg-border rounded-full" />
        <div className="w-20 h-4 bg-border rounded" />
      </div>
      <div className="w-full h-4 bg-border rounded mb-2" />
      <div className="w-3/4 h-4 bg-border rounded mb-6" />
      <div className="flex justify-between items-end">
        <div>
          <div className="w-12 h-3 bg-border rounded mb-1" />
          <div className="w-16 h-8 bg-border rounded" />
        </div>
        <div className="w-20 h-4 bg-border rounded" />
      </div>
    </div>
  );
}

export default function DemoPage() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const { toast } = useToast();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [airdropping, setAirdropping] = useState(false);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Simulate initial load
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  // Fetch balance
  useEffect(() => {
    if (!publicKey) { setSolBalance(null); return; }
    connection.getBalance(publicKey).then((b) => setSolBalance(b / LAMPORTS_PER_SOL)).catch(() => {});
  }, [publicKey, connection]);

  const handleAirdrop = async () => {
    if (!publicKey) {
      toast("Connect your wallet first", "error");
      return;
    }
    setAirdropping(true);
    try {
      const sig = await connection.requestAirdrop(publicKey, 2 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig);
      const newBalance = await connection.getBalance(publicKey);
      setSolBalance(newBalance / LAMPORTS_PER_SOL);
      toast("Airdrop successful!", "success", "2 SOL received on devnet");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Airdrop failed";
      toast("Airdrop failed", "error", msg.includes("limit") ? "Rate limited — try again in a minute" : msg);
    } finally {
      setAirdropping(false);
    }
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
      <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-success/10 border border-primary/30 rounded-xl p-4 sm:p-5 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔮</span>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">
                Demo Mode — Trading on Solana Devnet
              </h2>
              <p className="text-xs text-text-secondary">
                All trades are simulated. Connect a wallet and get devnet tokens to explore.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {connected && solBalance !== null && (
              <span className="text-xs font-mono text-text-secondary px-3 py-2 bg-surface rounded-lg border border-border">
                {solBalance.toFixed(2)} SOL
              </span>
            )}
            <button
              onClick={handleAirdrop}
              disabled={airdropping || !connected}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 active:scale-[0.98] cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed",
                "bg-primary hover:bg-primary-hover text-white"
              )}
            >
              {airdropping ? (
                <>
                  <Zap className="w-4 h-4 animate-pulse" />
                  Airdropping...
                </>
              ) : (
                <>
                  <Coins className="w-4 h-4" />
                  Airdrop 2 SOL
                </>
              )}
            </button>
            <a
              href="https://spl-token-faucet.com/?token-name=USDC"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-primary/50 text-primary hover:bg-primary/10 transition-colors cursor-pointer"
            >
              <Droplets className="w-4 h-4" />
              Get Devnet USDC
            </a>
          </div>
        </div>
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
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <MarketCardSkeleton key={i} />)
          : markets.map((market) => <MarketCard key={market.id} market={market} />)
        }
      </div>
    </div>
  );
}
