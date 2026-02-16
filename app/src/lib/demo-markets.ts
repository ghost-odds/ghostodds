import { Market } from "./types";

const now = Date.now();
const day = 86400000;

function m(
  id: number,
  question: string,
  category: string,
  yesPrice: number,
  volume: number,
  liquidity: number,
  expiresInDays: number,
  createdDaysAgo: number,
  resolutionSource: string,
  resolutionValue: number | null = null
): Market {
  const noPrice = Math.round((1 - yesPrice) * 100) / 100;
  return {
    id,
    publicKey: `demo_${id}`,
    question,
    description: `Resolves based on ${resolutionSource}.`,
    category,
    yesPrice,
    noPrice,
    volume,
    liquidity,
    expiresAt: new Date(now + expiresInDays * day).toISOString(),
    createdAt: new Date(now - createdDaysAgo * day).toISOString(),
    status: "active",
    resolutionSource,
    resolutionValue,
    resolutionOperator: 0,
    outcome: null,
    feeBps: 200,
    yesAmount: Math.round(liquidity * yesPrice * 10),
    noAmount: Math.round(liquidity * noPrice * 10),
    yesMint: "demo",
    noMint: "demo",
    vault: "demo",
    collateralMint: "demo",
    authority: "demo",
  };
}

export const DEMO_MARKETS: Market[] = [
  m(0, "Will SOL reach $300 by March 2026?", "Crypto", 0.62, 48520, 12000, 30, 5, "Pyth: SOL/USD", 300),
  m(1, "Will BTC hit $150K by Q2 2026?", "Crypto", 0.45, 125000, 35000, 90, 3, "Pyth: BTC/USD", 150000),
  m(2, "ETH above $5,000 by April 2026?", "Crypto", 0.38, 67800, 18000, 45, 7, "Pyth: ETH/USD", 5000),
  m(3, "Will Jupiter flip Uniswap in TVL?", "DeFi", 0.22, 31200, 8500, 60, 2, "DefiLlama TVL"),
  m(4, "SOL above $200 end of February?", "Crypto", 0.73, 89400, 22000, 12, 10, "Pyth: SOL/USD", 200),
  m(5, "Will Solana process 100K TPS this month?", "Crypto", 0.15, 18900, 5000, 14, 4, "Solana Explorer"),
  // New markets
  m(6, "BTC above $120K by end of Feb?", "Crypto", 0.81, 198000, 45000, 12, 6, "Pyth: BTC/USD", 120000),
  m(7, "Will ETH flip SOL in daily volume?", "DeFi", 0.34, 42300, 11000, 21, 3, "CoinGecko Volume"),
  m(8, "Solana TVL above $20B by March?", "DeFi", 0.55, 56700, 14000, 30, 8, "DefiLlama TVL"),
  m(9, "Will DOGE hit $1 in 2026?", "Crypto", 0.08, 87600, 20000, 180, 12, "Pyth: DOGE/USD", 1),
  m(10, "SOL above $150 next week?", "Crypto", 0.92, 134000, 32000, 7, 1, "Pyth: SOL/USD", 150),
  m(11, "Will Bitcoin dominance drop below 50%?", "Crypto", 0.29, 76500, 19000, 60, 5, "CoinGecko BTC.D"),
  m(12, "Ethereum gas below 5 gwei average this month?", "Crypto", 0.41, 23400, 6000, 14, 3, "Etherscan Gas Tracker"),
  m(13, "Will Fartcoin market cap exceed $5B?", "Crypto", 0.12, 165000, 38000, 45, 2, "CoinGecko Market Cap"),
  m(14, "Jupiter DEX daily volume > $2B?", "DeFi", 0.67, 51800, 13000, 7, 4, "DefiLlama DEX Volume"),
];
