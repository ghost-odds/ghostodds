"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

interface UsdcContextType {
  balance: number;
  addBalance: (amount: number) => void;
}

const UsdcContext = createContext<UsdcContextType>({ balance: 0, addBalance: () => {} });

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

  return (
    <UsdcContext.Provider value={{ balance, addBalance }}>
      {children}
    </UsdcContext.Provider>
  );
}
