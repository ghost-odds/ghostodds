"use client";

import { useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { BN } from "@coral-xyz/anchor";
import { fetchUserPositions, fetchMarket, computePrices, toHuman, OnChainMarket } from "./anchor";
import { Position } from "./types";

export function usePositions() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!publicKey || !connected) {
      setPositions([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const onChainPositions = await fetchUserPositions(connection, publicKey);
      const results: Position[] = [];

      for (const pos of onChainPositions) {
        const mId = new BN((pos.marketId as any).toString()).toNumber();
        const market = await fetchMarket(connection, mId);
        if (!market) continue;

        const yesAmount = new BN(market.yesAmount.toString());
        const noAmount = new BN(market.noAmount.toString());
        const { yesPrice, noPrice } = computePrices(yesAmount, noAmount);

        const yesTokens = toHuman(new BN(pos.yesTokens.toString()));
        const noTokens = toHuman(new BN(pos.noTokens.toString()));
        const totalDeposited = toHuman(new BN(pos.totalDeposited.toString()));

        const isResolved = market.status === 2;
        const isCancelled = market.status === 3;

        // Build positions for yes and no separately
        if (yesTokens > 0.001) {
          const currentValue = yesTokens * yesPrice;
          const costBasis = totalDeposited > 0 ? (yesTokens / (yesTokens + noTokens)) * totalDeposited : 0;
          results.push({
            marketId: mId,
            question: market.question,
            side: "YES",
            shares: yesTokens,
            avgPrice: costBasis > 0 ? costBasis / yesTokens : yesPrice,
            currentPrice: yesPrice,
            pnl: currentValue - (costBasis || currentValue),
            resolved: isResolved || isCancelled,
            claimable: isResolved ? (market.outcome === true) : isCancelled,
            yesTokens,
            noTokens: 0,
            totalDeposited,
          });
        }
        if (noTokens > 0.001) {
          const currentValue = noTokens * noPrice;
          const costBasis = totalDeposited > 0 ? (noTokens / (yesTokens + noTokens)) * totalDeposited : 0;
          results.push({
            marketId: mId,
            question: market.question,
            side: "NO",
            shares: noTokens,
            avgPrice: costBasis > 0 ? costBasis / noTokens : noPrice,
            currentPrice: noPrice,
            pnl: currentValue - (costBasis || currentValue),
            resolved: isResolved || isCancelled,
            claimable: isResolved ? (market.outcome === false) : isCancelled,
            noTokens,
            yesTokens: 0,
            totalDeposited,
          });
        }
      }

      setPositions(results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch positions");
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey, connected]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { positions, loading, error, refresh };
}
