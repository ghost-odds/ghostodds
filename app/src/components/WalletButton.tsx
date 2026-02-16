"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Wallet, Copy, LogOut, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "./Toast";

export function WalletButton() {
  const { publicKey, connected, connect, disconnect, select, wallets } = useWallet();
  const { connection } = useConnection();
  const { toast } = useToast();
  const [showDropdown, setShowDropdown] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);

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

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const available = wallets.find((w) => w.readyState === "Installed");
      const walletName = available?.adapter.name || wallets[0]?.adapter.name;
      if (walletName) {
        select(walletName);
        // Wait a tick for select to take effect, then connect
        await new Promise((r) => setTimeout(r, 100));
      }
      await connect();
      toast("Wallet connected", "success");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Connection failed";
      if (!msg.includes("rejected")) {
        toast("Failed to connect wallet", "error", msg);
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    setShowDropdown(false);
    toast("Wallet disconnected", "info");
  };

  const truncatedAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : "";

  if (!connected) {
    return (
      <button
        onClick={handleConnect}
        disabled={connecting}
        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg transition-all duration-150 active:scale-[0.98] cursor-pointer disabled:opacity-50"
      >
        <Wallet className="w-4 h-4" />
        {connecting ? "Connecting..." : "Connect Wallet"}
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
        <div className="flex flex-col items-start">
          <span className="text-sm font-mono text-text-primary">{truncatedAddress}</span>
          {balance !== null && (
            <span className="text-[10px] text-text-muted font-mono">{balance.toFixed(2)} SOL</span>
          )}
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
