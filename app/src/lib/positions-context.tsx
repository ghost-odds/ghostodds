"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

export interface Position {
  marketId: string;
  marketQuestion: string;
  side: "YES" | "NO";
  shares: number;
  avgPrice: number;
  timestamp: number;
}

interface PositionsContextType {
  positions: Position[];
  addPosition: (pos: Omit<Position, "timestamp">) => void;
  clearPositions: () => void;
}

const PositionsContext = createContext<PositionsContextType>({
  positions: [],
  addPosition: () => {},
  clearPositions: () => {},
});

export const usePositions = () => useContext(PositionsContext);

function getKey(pubkey: string) {
  return `ghostodds_positions_${pubkey}`;
}

export function PositionsProvider({ children }: { children: ReactNode }) {
  const { publicKey } = useWallet();
  const [positions, setPositions] = useState<Position[]>([]);

  useEffect(() => {
    if (!publicKey) { setPositions([]); return; }
    try {
      const stored = localStorage.getItem(getKey(publicKey.toBase58()));
      setPositions(stored ? JSON.parse(stored) : []);
    } catch {
      setPositions([]);
    }
  }, [publicKey]);

  const save = useCallback((pos: Position[]) => {
    if (!publicKey) return;
    localStorage.setItem(getKey(publicKey.toBase58()), JSON.stringify(pos));
  }, [publicKey]);

  const addPosition = useCallback((pos: Omit<Position, "timestamp">) => {
    if (!publicKey) return;
    setPositions((prev) => {
      // Merge with existing position for same market+side
      const existing = prev.find(p => p.marketId === pos.marketId && p.side === pos.side);
      let next: Position[];
      if (existing) {
        const totalShares = existing.shares + pos.shares;
        const totalCost = existing.shares * existing.avgPrice + pos.shares * pos.avgPrice;
        const newAvg = totalCost / totalShares;
        next = prev.map(p =>
          p.marketId === pos.marketId && p.side === pos.side
            ? { ...p, shares: totalShares, avgPrice: Math.round(newAvg * 100) / 100, timestamp: Date.now() }
            : p
        );
      } else {
        next = [...prev, { ...pos, timestamp: Date.now() }];
      }
      save(next);
      return next;
    });
  }, [publicKey, save]);

  const clearPositions = useCallback(() => {
    if (!publicKey) return;
    setPositions([]);
    localStorage.removeItem(getKey(publicKey.toBase58()));
  }, [publicKey]);

  return (
    <PositionsContext.Provider value={{ positions, addPosition, clearPositions }}>
      {children}
    </PositionsContext.Provider>
  );
}
