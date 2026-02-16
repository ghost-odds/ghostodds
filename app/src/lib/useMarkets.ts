"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { fetchAllMarkets, fetchMarket, computePrices, toHuman, OnChainMarket } from "./anchor";
import { Market, MarketStatus } from "./types";
import { DEMO_MARKETS } from "./demo-markets";

function statusFromCode(code: number): MarketStatus {
  switch (code) {
    case 0: return "active";
    case 2: return "resolved";
    case 3: return "cancelled";
    default: return "active";
  }
}

function mapOnChainMarket(m: OnChainMarket): Market {
  const { yesPrice, noPrice } = computePrices(m.yesAmount, m.noAmount);

  const expiresAt = Number(m.expiresAt);
  const createdAt = Number(m.createdAt);
  const volume = toHuman(m.volume);
  const liquidity = toHuman(m.totalLiquidity);

  let status = statusFromCode(m.status);
  if (status === "active" && expiresAt * 1000 < Date.now()) {
    status = "expired";
  }

  return {
    id: m.marketId,
    publicKey: m.publicKey.toBase58(),
    question: m.question,
    description: m.description,
    category: m.category || "Other",
    yesPrice,
    noPrice,
    volume,
    liquidity,
    expiresAt: new Date(expiresAt * 1000).toISOString(),
    createdAt: new Date(createdAt * 1000).toISOString(),
    status,
    resolutionSource: m.resolutionSource,
    resolutionValue: m.resolutionValue ? toHuman(m.resolutionValue) : null,
    resolutionOperator: m.resolutionOperator,
    outcome: m.outcome,
    feeBps: m.feeBps,
    yesAmount: toHuman(m.yesAmount),
    noAmount: toHuman(m.noAmount),
    yesMint: m.yesMint.toBase58(),
    noMint: m.noMint.toBase58(),
    vault: m.vault.toBase58(),
    collateralMint: m.collateralMint.toBase58(),
    authority: m.authority.toBase58(),
  };
}

export function useMarkets() {
  const { connection } = useConnection();
  const [markets, setMarkets] = useState<Market[]>(DEMO_MARKETS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialLoad = useRef(true);

  const refresh = useCallback(async () => {
    // Only show loading spinner on very first load
    if (initialLoad.current) {
      setLoading(true);
      initialLoad.current = false;
    }
    try {
      const onChain = await fetchAllMarkets(connection);
      if (onChain.length > 0) {
        const mapped = onChain.map(mapOnChainMarket);
        mapped.sort((a, b) => b.volume - a.volume);
        setMarkets(mapped);
      }
      // If no on-chain markets, keep showing demo markets (initial state)
      setError(null);
    } catch {
      // Silently keep demo markets on error
    } finally {
      setLoading(false);
    }
  }, [connection]);

  useEffect(() => {
    refresh();
    // Poll every 60s (no visual disruption since we don't reset state)
    const id = setInterval(refresh, 60000);
    return () => clearInterval(id);
  }, [refresh]);

  return { markets, loading, error, refresh };
}

export function useMarket(marketId: number) {
  const { connection } = useConnection();
  const demoMarket = DEMO_MARKETS.find((m) => m.id === marketId) || null;
  const [market, setMarket] = useState<Market | null>(demoMarket);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialLoad = useRef(true);

  const refresh = useCallback(async () => {
    if (initialLoad.current) {
      setLoading(true);
      initialLoad.current = false;
    }
    try {
      const onChain = await fetchMarket(connection, marketId);
      if (onChain) {
        setMarket(mapOnChainMarket(onChain));
      }
      // If not found on-chain, keep demo market (initial state)
      setError(null);
    } catch {
      // Silently keep demo market on error
    } finally {
      setLoading(false);
    }
  }, [connection, marketId]);

  useEffect(() => {
    refresh();
    // Poll every 60s
    const id = setInterval(refresh, 60000);
    return () => clearInterval(id);
  }, [refresh]);

  return { market, loading, error, refresh };
}
