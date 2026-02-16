"use client";

// Buffer polyfill MUST be first — Anchor/web3.js need it in browser
import { Buffer } from "buffer/";
(globalThis as any).Buffer = Buffer;
(typeof window !== "undefined" ? window : globalThis).Buffer = Buffer as any;

import { ReactNode } from "react";
import { WalletProviderWrapper } from "./WalletProvider";

export function ClientProviders({ children }: { children: ReactNode }) {
  return <WalletProviderWrapper>{children}</WalletProviderWrapper>;
}
