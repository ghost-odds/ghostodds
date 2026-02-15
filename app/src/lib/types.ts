export type MarketStatus = "active" | "resolved" | "expired";
export type MarketCategory = "Crypto" | "DeFi" | "NFTs" | "Other";
export type Side = "YES" | "NO";

export interface Market {
  id: number;
  question: string;
  description: string;
  category: MarketCategory;
  yesPrice: number;
  noPrice: number;
  volume: number;
  liquidity: number;
  expiresAt: string;
  createdAt: string;
  status: MarketStatus;
  resolutionSource: string;
  priceHistory: PricePoint[];
  recentTrades: Trade[];
}

export interface PricePoint {
  time: string;
  price: number;
}

export interface Trade {
  id: string;
  side: Side;
  amount: number;
  price: number;
  shares: number;
  timestamp: string;
  wallet: string;
}

export interface Position {
  marketId: number;
  question: string;
  side: Side;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  resolved: boolean;
  claimable: boolean;
  payout?: number;
}
