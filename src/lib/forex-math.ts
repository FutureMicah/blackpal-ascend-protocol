// Forex calculation utilities. All math runs client-side; no server calls.

export const PIP_DECIMAL: Record<string, number> = {
  // JPY pairs use 2 decimals
  JPY: 0.01,
  // metals
  XAU: 0.01,
  XAG: 0.001,
  default: 0.0001,
};

export function pipSize(symbol: string): number {
  const s = symbol.toUpperCase();
  if (s.includes("JPY")) return PIP_DECIMAL.JPY;
  if (s.startsWith("XAU")) return PIP_DECIMAL.XAU;
  if (s.startsWith("XAG")) return PIP_DECIMAL.XAG;
  return PIP_DECIMAL.default;
}

/** Pip value per 1 standard lot (100,000 units) in account currency.
 *  Assumes account currency = quote currency for simplicity (can be extended). */
export function pipValuePerLot(symbol: string, lotUnits = 100_000, exchangeRate = 1): number {
  return pipSize(symbol) * lotUnits * exchangeRate;
}

/** Lot size from risk in account currency, stop loss in pips. */
export function positionSize(
  riskAmount: number,
  stopLossPips: number,
  symbol: string,
  lotUnits = 100_000
): number {
  if (stopLossPips <= 0 || riskAmount <= 0) return 0;
  const pv = pipValuePerLot(symbol, lotUnits);
  if (pv === 0) return 0;
  return riskAmount / (stopLossPips * pv);
}

/** Profit/loss for a closed trade. */
export function tradePnL(
  symbol: string,
  lots: number,
  entry: number,
  exit: number,
  side: "long" | "short",
  lotUnits = 100_000
): number {
  const direction = side === "long" ? 1 : -1;
  const priceDiff = (exit - entry) * direction;
  return priceDiff * lots * lotUnits;
}

/** Required margin = (lots * lotUnits * entry) / leverage. */
export function requiredMargin(
  lots: number,
  entry: number,
  leverage: number,
  lotUnits = 100_000
): number {
  if (leverage <= 0) return 0;
  return (lots * lotUnits * entry) / leverage;
}

/** Risk-of-ruin (simplified Kelly-ish). */
export function riskOfRuin(winRate: number, riskRewardRatio: number, riskPerTradePct: number): number {
  // crude approximation: 1 - kelly edge
  const edge = winRate - (1 - winRate) / Math.max(riskRewardRatio, 0.01);
  if (edge <= 0) return 100;
  const kelly = edge;
  const ratio = riskPerTradePct / (kelly * 100);
  return Math.min(100, Math.max(0, ratio * 100));
}

/** Kelly Criterion optimal fraction. */
export function kellyFraction(winRate: number, riskRewardRatio: number): number {
  if (riskRewardRatio <= 0) return 0;
  const f = winRate - (1 - winRate) / riskRewardRatio;
  return Math.max(0, f);
}

export const FOREX_PAIRS = [
  "EURUSD","GBPUSD","USDJPY","USDCHF","AUDUSD","NZDUSD","USDCAD",
  "EURJPY","GBPJPY","EURGBP","EURAUD","AUDJPY","CHFJPY","CADJPY",
  "XAUUSD","XAGUSD","BTCUSD","ETHUSD","NAS100","SPX500","US30","GER40",
];
