import Link from "next/link";
import { Clock, BarChart2 } from "lucide-react";
import { Market } from "@/lib/types";
import { formatUSD, formatTimeRemaining } from "@/lib/format";

const categoryColors: Record<string, string> = {
  Crypto: "bg-primary/20 text-primary",
  DeFi: "bg-success/20 text-success",
  NFTs: "bg-warning/20 text-warning",
  Other: "bg-text-muted/20 text-text-muted",
};

export function MarketCard({ market }: { market: Market }) {
  return (
    <Link href={`/market/${market.id}`}>
      <div className="group bg-surface border border-border rounded-xl p-5 hover:border-primary/50 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 cursor-pointer h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColors[market.category] || categoryColors.Other}`}>
            {market.category}
          </span>
          <span className="text-xs text-text-muted flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTimeRemaining(market.expiresAt)}
          </span>
        </div>

        <h3 className="text-[15px] font-semibold text-text-primary mb-4 leading-snug flex-1">
          {market.question}
        </h3>

        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs text-text-muted mb-0.5">YES Price</div>
            <div className="text-2xl font-mono font-bold text-success">
              {Math.round(market.yesPrice * 100)}¢
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-xs text-text-muted">
              <BarChart2 className="w-3 h-3" />
              {formatUSD(market.volume)} vol
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
