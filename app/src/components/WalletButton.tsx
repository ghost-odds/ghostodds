"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Wallet, Copy, LogOut, ChevronDown, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "./Toast";
import { useUsdc } from "@/lib/usdc-context";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function WalletButton() {
  const { publicKey, connected, disconnect } = useWallet();
  const { connection } = useConnection();
  const { toast } = useToast();
  const { balance: usdcBalance, addBalance } = useUsdc();
  const [showDropdown, setShowDropdown] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!publicKey) { setBalance(null); return; }
    let cancelled = false;
    const fetchBalance = () => {
      connection.getBalance(publicKey).then((b) => {
        if (!cancelled) setBalance(b / LAMPORTS_PER_SOL);
      }).catch(() => {});
    };
    fetchBalance();
    const id = setInterval(fetchBalance, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, [publicKey, connection]);

  const handleDisconnect = async () => {
    await disconnect();
    setShowDropdown(false);
    toast("Wallet disconnected", "info");
  };

  const truncatedAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : "";

  if (!mounted) {
    // SSR placeholder — same dimensions as the connect button
    return (
      <div className="h-9 w-[140px] bg-surface border border-border rounded-lg animate-pulse" />
    );
  }

  if (!connected) {
    return <WalletMultiButton className="!bg-primary hover:!bg-primary-hover !text-white !text-sm !font-medium !rounded-lg !transition-all !duration-150 active:!scale-[0.98] !h-auto !py-2 !px-4" />;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg hover:border-primary/50 transition-colors cursor-pointer"
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-success" />
        <div className="flex flex-col items-start">
          <span className="text-sm font-mono text-text-primary">{truncatedAddress}</span>
          <div className="flex items-center gap-2">
            {balance !== null && (
              <span className="text-[10px] text-text-muted font-mono">{balance.toFixed(2)} SOL</span>
            )}
            <span className="text-[10px] text-success font-mono font-semibold">${usdcBalance.toLocaleString()} USDC</span>
          </div>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-text-muted transition-transform", showDropdown && "rotate-180")} />
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
          <div className="absolute right-0 top-full mt-2 w-48 bg-surface-elevated border border-border rounded-lg shadow-xl overflow-hidden z-50">
            <button
              onClick={() => {
                if (publicKey) {
                  navigator.clipboard.writeText(publicKey.toBase58());
                  toast("Address copied", "success");
                }
                setShowDropdown(false);
              }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              Copy Address
            </button>
            <button
              onClick={() => {
                addBalance(1000);
                toast("Received 1,000 USDC", "success");
                setShowDropdown(false);
              }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-success hover:text-success hover:bg-surface transition-colors cursor-pointer"
            >
              <DollarSign className="w-4 h-4" />
              Get Test USDC
            </button>
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-danger hover:bg-surface transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
}
