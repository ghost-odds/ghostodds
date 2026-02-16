"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

interface UsdcContextType {
  balance: number;
  addBalance: (amount: number) => void;
  spendBalance: (amount: number) => boolean;
}

const UsdcContext = createContext<UsdcContextType>({ balance: 0, addBalance: () => {}, spendBalance: () => false });

export const useUsdc = () => useContext(UsdcContext);

function getKey(pubkey: string) {
  return `ghostodds_usdc_${pubkey}`;
}

export function UsdcProvider({ children }: { children: ReactNode }) {
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (!publicKey) { setBalance(0); return; }
    const stored = localStorage.getItem(getKey(publicKey.toBase58()));
    setBalance(stored ? parseFloat(stored) : 0);
  }, [publicKey]);

  const addBalance = useCallback((amount: number) => {
    if (!publicKey) return;
    setBalance((prev) => {
      const next = prev + amount;
      localStorage.setItem(getKey(publicKey.toBase58()), next.toString());
      return next;
    });
  }, [publicKey]);

  const spendBalance = useCallback((amount: number): boolean => {
    if (!publicKey) return false;
    const key = getKey(publicKey.toBase58());
    const current = parseFloat(localStorage.getItem(key) || "0");
    if (current < amount) return false;
    const next = current - amount;
    localStorage.setItem(key, next.toString());
    setBalance(next);
    return true;
  }, [publicKey]);

  return (
    <UsdcContext.Provider value={{ balance, addBalance, spendBalance }}>
      {children}
    </UsdcContext.Provider>
  );
}
