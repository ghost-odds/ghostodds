"use client";

import { useState, useEffect, useCallback } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { BN } from "@coral-xyz/anchor";
import { fetchAllMarkets, fetchMarket, computePrices, toHuman, OnChainMarket } from "./anchor";
import { Market, MarketStatus } from "./types";

function statusFromCode(code: number): MarketStatus {
  switch (code) {
    case 0: return "active";
    case 2: return "resolved";
    case 3: return "cancelled";
    default: return "active";
  }
}

function mapOnChainMarket(m: OnChainMarket): Market {
  const yesAmount = new BN(m.yesAmount.toString());
  const noAmount = new BN(m.noAmount.toString());
  const { yesPrice, noPrice } = computePrices(yesAmount, noAmount);
  const marketId = new BN((m.marketId as any).toString()).toNumber();

  const expiresAt = new BN(m.expiresAt.toString()).toNumber();
  const createdAt = new BN(m.createdAt.toString()).toNumber();
  const volume = toHuman(new BN(m.volume.toString()));
  const liquidity = toHuman(new BN(m.totalLiquidity.toString()));

  let status = statusFromCode(m.status);
  if (status === "active" && expiresAt * 1000 < Date.now()) {
    status = "expired";
  }

  return {
    id: marketId,
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
    resolutionValue: m.resolutionValue ? toHuman(new BN(m.resolutionValue.toString())) : null,
    resolutionOperator: m.resolutionOperator,
    outcome: m.outcome,
    feeBps: m.feeBps,
    yesAmount: toHuman(yesAmount),
    noAmount: toHuman(noAmount),
    yesMint: m.yesMint.toBase58(),
    noMint: m.noMint.toBase58(),
    vault: m.vault.toBase58(),
    collateralMint: m.collateralMint.toBase58(),
    authority: m.authority.toBase58(),
  };
}

export function useMarkets() {
  const { connection } = useConnection();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const onChain = await fetchAllMarkets(connection);
      const mapped = onChain.map(mapOnChainMarket);
      mapped.sort((a, b) => b.volume - a.volume);
      setMarkets(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch markets");
      setMarkets([]);
    } finally {
      setLoading(false);
    }
  }, [connection]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, [refresh]);

  return { markets, loading, error, refresh };
}

export function useMarket(marketId: number) {
  const { connection } = useConnection();
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const onChain = await fetchMarket(connection, marketId);
      if (onChain) {
        setMarket(mapOnChainMarket(onChain));
      } else {
        setMarket(null);
        setError("Market not found on-chain");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch market");
    } finally {
      setLoading(false);
    }
  }, [connection, marketId]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [refresh]);

  return { market, loading, error, refresh };
}
