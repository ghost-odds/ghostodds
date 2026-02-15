import { Market, Position, PricePoint, Trade } from "./types";

function generatePriceHistory(basePrice: number, days: number = 7): PricePoint[] {
  const points: PricePoint[] = [];
  const now = Date.now();
  let price = basePrice - 0.15 + Math.random() * 0.1;

  for (let i = days * 24; i >= 0; i--) {
    price += (Math.random() - 0.48) * 0.03;
    price = Math.max(0.02, Math.min(0.98, price));
    points.push({
      time: new Date(now - i * 3600000).toISOString(),
      price: Math.round(price * 100) / 100,
    });
  }
  // Ensure last point matches current price
  points[points.length - 1].price = basePrice;
  return points;
}

function generateTrades(yesPrice: number): Trade[] {
  const wallets = [
    "7xKX...9mFq", "Dv4L...hT2p", "9aBc...xYz1", "FgH2...kLm3",
    "Qw5R...nP8s", "Jt6U...vW0d", "Bm3K...eA7f",
  ];
  const trades: Trade[] = [];
  const now = Date.now();

  for (let i = 0; i < 12; i++) {
    const side = Math.random() > 0.45 ? "YES" as const : "NO" as const;
    const amount = [10, 25, 50, 100, 250][Math.floor(Math.random() * 5)];
    const price = side === "YES"
      ? yesPrice + (Math.random() - 0.5) * 0.06
      : (1 - yesPrice) + (Math.random() - 0.5) * 0.06;

    trades.push({
      id: `trade-${i}`,
      side,
      amount,
      price: Math.round(Math.max(0.01, Math.min(0.99, price)) * 100) / 100,
      shares: Math.round(amount / price),
      timestamp: new Date(now - i * 600000 - Math.random() * 300000).toISOString(),
      wallet: wallets[Math.floor(Math.random() * wallets.length)],
    });
  }
  return trades;
}

export const MOCK_MARKETS: Market[] = [
  {
    id: 1,
    question: "Will SOL be above $250 on March 1, 2026?",
    description: "Resolves YES if SOL/USD price on Pyth oracle is above $250.00 at 00:00 UTC on March 1, 2026.",
    category: "Crypto",
    yesPrice: 0.67,
    noPrice: 0.33,
    volume: 125400,
    liquidity: 50000,
    expiresAt: "2026-03-01T00:00:00Z",
    createdAt: "2026-01-15T10:00:00Z",
    status: "active",
    resolutionSource: "Pyth: SOL/USD",
    priceHistory: generatePriceHistory(0.67),
    recentTrades: generateTrades(0.67),
  },
  {
    id: 2,
    question: "Will BTC reach $150K before April 2026?",
    description: "Resolves YES if BTC/USD exceeds $150,000 at any point before April 1, 2026.",
    category: "Crypto",
    yesPrice: 0.42,
    noPrice: 0.58,
    volume: 892000,
    liquidity: 200000,
    expiresAt: "2026-04-01T00:00:00Z",
    createdAt: "2026-01-10T08:00:00Z",
    status: "active",
    resolutionSource: "Pyth: BTC/USD",
    priceHistory: generatePriceHistory(0.42),
    recentTrades: generateTrades(0.42),
  },
  {
    id: 3,
    question: "Will ETH flip $5,000 by end of Q1 2026?",
    description: "Resolves YES if ETH/USD price exceeds $5,000 at any point before March 31, 2026 23:59 UTC.",
    category: "Crypto",
    yesPrice: 0.31,
    noPrice: 0.69,
    volume: 340000,
    liquidity: 85000,
    expiresAt: "2026-03-31T23:59:00Z",
    createdAt: "2026-01-20T14:00:00Z",
    status: "active",
    resolutionSource: "Pyth: ETH/USD",
    priceHistory: generatePriceHistory(0.31),
    recentTrades: generateTrades(0.31),
  },
  {
    id: 4,
    question: "Will a Solana NFT collection hit 100K SOL volume this month?",
    description: "Resolves YES if any single Solana NFT collection surpasses 100,000 SOL in total trading volume on Magic Eden during February 2026.",
    category: "NFTs",
    yesPrice: 0.18,
    noPrice: 0.82,
    volume: 67000,
    liquidity: 25000,
    expiresAt: "2026-02-28T23:59:00Z",
    createdAt: "2026-02-01T12:00:00Z",
    status: "active",
    resolutionSource: "Magic Eden API",
    priceHistory: generatePriceHistory(0.18),
    recentTrades: generateTrades(0.18),
  },
  {
    id: 5,
    question: "Will Solana DeFi TVL exceed $20B by March 2026?",
    description: "Resolves YES if total value locked in Solana DeFi protocols exceeds $20 billion USD as reported by DefiLlama.",
    category: "DeFi",
    yesPrice: 0.55,
    noPrice: 0.45,
    volume: 445000,
    liquidity: 120000,
    expiresAt: "2026-03-15T00:00:00Z",
    createdAt: "2026-01-25T09:00:00Z",
    status: "active",
    resolutionSource: "DefiLlama",
    priceHistory: generatePriceHistory(0.55),
    recentTrades: generateTrades(0.55),
  },
  {
    id: 6,
    question: "Will Jupiter surpass Uniswap in daily volume?",
    description: "Resolves YES if Jupiter DEX on Solana records higher 24h trading volume than Uniswap (all chains) on any day before expiry.",
    category: "DeFi",
    yesPrice: 0.73,
    noPrice: 0.27,
    volume: 1230000,
    liquidity: 300000,
    expiresAt: "2026-06-01T00:00:00Z",
    createdAt: "2026-02-05T16:00:00Z",
    status: "active",
    resolutionSource: "DefiLlama DEX",
    priceHistory: generatePriceHistory(0.73),
    recentTrades: generateTrades(0.73),
  },
  {
    id: 7,
    question: "Will SOL be below $200 on February 20, 2026?",
    description: "Resolves YES if SOL/USD on Pyth oracle is below $200.00 at 00:00 UTC on February 20, 2026.",
    category: "Crypto",
    yesPrice: 0.22,
    noPrice: 0.78,
    volume: 98000,
    liquidity: 30000,
    expiresAt: "2026-02-20T00:00:00Z",
    createdAt: "2026-02-10T11:00:00Z",
    status: "active",
    resolutionSource: "Pyth: SOL/USD",
    priceHistory: generatePriceHistory(0.22),
    recentTrades: generateTrades(0.22),
  },
  {
    id: 8,
    question: "Will a new Solana token reach $1B market cap this week?",
    description: "Resolves YES if any token launched on Solana after Feb 10, 2026 reaches $1B fully diluted market cap before Feb 22, 2026.",
    category: "Crypto",
    yesPrice: 0.38,
    noPrice: 0.62,
    volume: 567000,
    liquidity: 150000,
    expiresAt: "2026-02-22T00:00:00Z",
    createdAt: "2026-02-12T20:00:00Z",
    status: "active",
    resolutionSource: "CoinGecko / Birdeye",
    priceHistory: generatePriceHistory(0.38),
    recentTrades: generateTrades(0.38),
  },
  {
    id: 9,
    question: "Will Ethereum L2 total TVL exceed Solana TVL?",
    description: "Resolves YES if the combined TVL of all Ethereum Layer 2 networks exceeds Solana's total TVL at any point before expiry.",
    category: "DeFi",
    yesPrice: 0.61,
    noPrice: 0.39,
    volume: 230000,
    liquidity: 75000,
    expiresAt: "2026-04-15T00:00:00Z",
    createdAt: "2026-02-08T07:00:00Z",
    status: "active",
    resolutionSource: "DefiLlama",
    priceHistory: generatePriceHistory(0.61),
    recentTrades: generateTrades(0.61),
  },
  {
    id: 10,
    question: "Will Bitcoin dominance drop below 50% in Q1 2026?",
    description: "Resolves YES if Bitcoin market dominance (BTC.D) falls below 50% at any point during Q1 2026 as reported by CoinGecko.",
    category: "Crypto",
    yesPrice: 0.29,
    noPrice: 0.71,
    volume: 410000,
    liquidity: 95000,
    expiresAt: "2026-03-31T23:59:00Z",
    createdAt: "2026-01-18T13:00:00Z",
    status: "active",
    resolutionSource: "CoinGecko",
    priceHistory: generatePriceHistory(0.29),
    recentTrades: generateTrades(0.29),
  },
];

export const MOCK_POSITIONS: Position[] = [
  {
    marketId: 1,
    question: "Will SOL be above $250 on March 1, 2026?",
    side: "YES",
    shares: 150,
    avgPrice: 0.58,
    currentPrice: 0.67,
    pnl: 13.5,
    resolved: false,
    claimable: false,
  },
  {
    marketId: 2,
    question: "Will BTC reach $150K before April 2026?",
    side: "NO",
    shares: 200,
    avgPrice: 0.52,
    currentPrice: 0.58,
    pnl: 12.0,
    resolved: false,
    claimable: false,
  },
  {
    marketId: 6,
    question: "Will Jupiter surpass Uniswap in daily volume?",
    side: "YES",
    shares: 100,
    avgPrice: 0.65,
    currentPrice: 0.73,
    pnl: 8.0,
    resolved: false,
    claimable: false,
  },
];

export function getMarketById(id: number): Market | undefined {
  return MOCK_MARKETS.find((m) => m.id === id);
}

export function formatUSD(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toFixed(2)}`;
}

export function formatTimeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 30) return `${Math.floor(days / 30)}mo left`;
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}
