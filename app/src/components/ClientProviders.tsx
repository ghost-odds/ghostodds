"use client";

import { ReactNode } from "react";
import dynamic from "next/dynamic";
import "@solana/wallet-adapter-react-ui/styles.css";
import { UsdcProvider } from "@/lib/usdc-context";

// Dynamically import wallet provider to avoid SSR hydration issues
const WalletProviderWrapper = dynamic(
  () => import("./WalletProvider").then((m) => m.WalletProviderWrapper),
  { ssr: false }
);

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <WalletProviderWrapper>
      <UsdcProvider>{children}</UsdcProvider>
    </WalletProviderWrapper>
  );
}
