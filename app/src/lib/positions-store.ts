import { Position } from "./types";

const STORAGE_KEY = "ghostodds_positions";

export function getPositions(): Position[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePositions(positions: Position[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
}

export function addPosition(pos: Position) {
  const positions = getPositions();
  const existing = positions.findIndex((p) => p.marketId === pos.marketId && p.side === pos.side);
  if (existing >= 0) {
    const old = positions[existing];
    const totalShares = old.shares + pos.shares;
    const totalCost = old.shares * old.avgPrice + pos.shares * pos.avgPrice;
    positions[existing] = {
      ...old,
      shares: totalShares,
      avgPrice: totalCost / totalShares,
      currentPrice: pos.currentPrice,
      pnl: totalShares * (pos.currentPrice - totalCost / totalShares),
    };
  } else {
    positions.push(pos);
  }
  savePositions(positions);
  return positions;
}

export function claimPosition(marketId: number) {
  const positions = getPositions().filter((p) => p.marketId !== marketId);
  savePositions(positions);
  return positions;
}

export function generateTxSignature(): string {
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let sig = "";
  for (let i = 0; i < 88; i++) sig += chars[Math.floor(Math.random() * chars.length)];
  return sig;
}
