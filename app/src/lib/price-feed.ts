// CoinGecko price feed for real asset price data overlay

const SOURCE_TO_COIN: Record<string, string> = {
  "SOL/USD": "solana",
  "BTC/USD": "bitcoin",
  "ETH/USD": "ethereum",
};

export interface PriceDataPoint {
  time: number;
  price: number;
}

export interface PriceInfo {
  currentPrice: number;
  change24h: number; // percentage
  history: PriceDataPoint[];
}

// In-memory cache: key = `${coinId}-${days}`
const cache = new Map<string, { data: PriceInfo; ts: number }>();
const CACHE_TTL = 60_000; // 1 minute

// Normalize resolution source: "Pyth: SOL/USD" -> "SOL/USD"
function normalizeSource(resolutionSource: string): string {
  return resolutionSource.replace(/^Pyth:\s*/i, "").trim();
}

export function getCoinIdFromSource(resolutionSource: string): string | null {
  return SOURCE_TO_COIN[normalizeSource(resolutionSource)] ?? null;
}

export function isPriceMarket(resolutionSource: string): boolean {
  return getCoinIdFromSource(resolutionSource) !== null;
}

export async function fetchPriceHistory(coinId: string, days: number): Promise<PriceInfo> {
  const key = `${coinId}-${days}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko API error: ${res.status}`);

  const json = await res.json();
  const history: PriceDataPoint[] = (json.prices as [number, number][]).map(([t, p]) => ({
    time: t,
    price: p,
  }));

  // Current price = last point
  const currentPrice = history.length > 0 ? history[history.length - 1].price : 0;

  // 24h change: compare first and last if days<=1, else find point ~24h ago
  let change24h = 0;
  if (history.length >= 2) {
    const targetTime = Date.now() - 24 * 60 * 60 * 1000;
    let oldPrice = history[0].price;
    for (const pt of history) {
      if (pt.time <= targetTime) oldPrice = pt.price;
      else break;
    }
    change24h = oldPrice > 0 ? ((currentPrice - oldPrice) / oldPrice) * 100 : 0;
  }

  const info: PriceInfo = { currentPrice, change24h, history };
  cache.set(key, { data: info, ts: Date.now() });
  return info;
}
