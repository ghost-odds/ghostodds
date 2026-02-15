"use client";

import { useState } from "react";
import { Wallet, Copy, LogOut, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Mock wallet state until Solana wallet adapter is integrated
export function WalletButton() {
  const [connected, setConnected] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const mockAddress = "7xKXr...9mFq";

  if (!connected) {
    return (
      <button
        onClick={() => setConnected(true)}
        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg transition-all duration-150 active:scale-[0.98] cursor-pointer"
      >
        <Wallet className="w-4 h-4" />
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg hover:border-primary/50 transition-colors cursor-pointer"
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-success" />
        <span className="text-sm font-mono text-text-primary">{mockAddress}</span>
        <ChevronDown className={cn("w-4 h-4 text-text-muted transition-transform", showDropdown && "rotate-180")} />
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-surface-elevated border border-border rounded-lg shadow-xl overflow-hidden">
          <button
            onClick={() => {
              navigator.clipboard.writeText("7xKXrABCDEFGHIJKLMNOPQRSTUV9mFq");
              setShowDropdown(false);
            }}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
          >
            <Copy className="w-4 h-4" />
            Copy Address
          </button>
          <button
            onClick={() => {
              setConnected(false);
              setShowDropdown(false);
            }}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-danger hover:bg-surface transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
