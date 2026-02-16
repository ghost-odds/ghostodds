export type MarketStatus = "active" | "resolved" | "cancelled" | "expired";
export type MarketCategory = "Crypto" | "DeFi" | "NFTs" | "Other";
export type Side = "YES" | "NO";

export interface Market {
  id: number;
  publicKey?: string;
  question: string;
  description: string;
  category: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  liquidity: number;
  expiresAt: string;
  createdAt: string;
  status: MarketStatus;
  resolutionSource: string;
  resolutionValue?: number | null;
  resolutionOperator?: number;
  outcome?: boolean | null;
  feeBps?: number;
  yesAmount?: number;
  noAmount?: number;
  yesMint?: string;
  noMint?: string;
  vault?: string;
  collateralMint?: string;
  authority?: string;
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
  yesTokens?: number;
  noTokens?: number;
  totalDeposited?: number;
  totalWithdrawn?: number;
}
