import { PricePoint, Trade } from "./types";

// Seeded PRNG based on market ID for consistent data across refreshes
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const BASE58_CHARS = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function randomWallet(rng: () => number): string {
  let w = "";
  for (let i = 0; i < 44; i++) w += BASE58_CHARS[Math.floor(rng() * BASE58_CHARS.length)];
  return w;
}

export function generatePriceHistory(
  basePrice: number,
  volatility: number,
  points: number,
  seed: number
): PricePoint[] {
  const rng = seededRandom(seed);
  const result: PricePoint[] = [];
  let price = basePrice;
  const now = Date.now();
  const interval = (7 * 24 * 60 * 60 * 1000) / points; // spread over 7 days

  for (let i = 0; i < points; i++) {
    const change = (rng() - 0.5) * 2 * volatility;
    price = Math.max(0.02, Math.min(0.98, price + change));
    result.push({
      time: new Date(now - (points - i) * interval).toISOString(),
      price: Math.round(price * 1000) / 1000,
    });
  }
  return result;
}

export function generateRecentTrades(marketId: number, yesPrice: number): Trade[] {
  const rng = seededRandom(marketId * 1000 + 7);
  const trades: Trade[] = [];
  const now = Date.now();

  for (let i = 0; i < 10; i++) {
    const isYes = rng() > 0.45;
    const side = isYes ? "YES" as const : "NO" as const;
    const price = isYes
      ? yesPrice + (rng() - 0.5) * 0.06
      : (1 - yesPrice) + (rng() - 0.5) * 0.06;
    const clampedPrice = Math.max(0.02, Math.min(0.98, price));
    const amount = Math.round((10 + rng() * 490) * 100) / 100;

    trades.push({
      id: `${marketId}-${i}`,
      side,
      amount,
      price: Math.round(clampedPrice * 100) / 100,
      shares: Math.round((amount / clampedPrice) * 100) / 100,
      timestamp: new Date(now - i * (rng() * 1800000 + 300000)).toISOString(),
      wallet: randomWallet(rng),
    });
  }
  return trades;
}

export function getMarketStats(marketId: number, volume: number) {
  const rng = seededRandom(marketId * 500 + 3);
  return {
    totalTraders: Math.floor(50 + rng() * 450),
    volume24h: Math.round(volume * (0.08 + rng() * 0.15)),
  };
}

// Generate a realistic-looking PDA for demo markets
export function getDemoPDA(marketId: number): string {
  const rng = seededRandom(marketId * 999 + 42);
  return randomWallet(rng);
}
