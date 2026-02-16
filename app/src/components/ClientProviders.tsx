"use client";

import { ReactNode } from "react";
import "@solana/wallet-adapter-react-ui/styles.css";
import { UsdcProvider } from "@/lib/usdc-context";
import { PositionsProvider } from "@/lib/positions-context";
import { WalletProviderWrapper } from "./WalletProvider";

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <WalletProviderWrapper>
      <UsdcProvider>
        <PositionsProvider>
          {children}
        </PositionsProvider>
      </UsdcProvider>
    </WalletProviderWrapper>
  );
}
