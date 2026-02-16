"use client";

import { ReactNode } from "react";
import dynamic from "next/dynamic";
import "@solana/wallet-adapter-react-ui/styles.css";

// Dynamically import wallet provider to avoid SSR hydration issues
const WalletProviderWrapper = dynamic(
  () => import("./WalletProvider").then((m) => m.WalletProviderWrapper),
  { ssr: false }
);

export function ClientProviders({ children }: { children: ReactNode }) {
  return <WalletProviderWrapper>{children}</WalletProviderWrapper>;
}
