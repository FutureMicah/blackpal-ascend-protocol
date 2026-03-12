import { useState, useEffect, useRef, useCallback } from "react";

interface PriceData {
  symbol: string;
  bid: number;
  ask: number;
  change: number;
  changePercent: number;
  prevBid?: number;
}

// Client-side price simulation for smooth real-time ticks
// Uses deterministic random walk matching the edge function algorithm
const instruments: Record<string, { basePrice: number; pipSize: number; volatility: number; spread: number }> = {
  "EUR/USD": { basePrice: 1.0856, pipSize: 0.0001, volatility: 8, spread: 1.2 },
  "GBP/USD": { basePrice: 1.2634, pipSize: 0.0001, volatility: 10, spread: 1.5 },
  "USD/JPY": { basePrice: 149.85, pipSize: 0.01, volatility: 12, spread: 1.3 },
  "AUD/USD": { basePrice: 0.6542, pipSize: 0.0001, volatility: 9, spread: 1.4 },
  "USD/CAD": { basePrice: 1.3621, pipSize: 0.0001, volatility: 8, spread: 1.6 },
  "NZD/USD": { basePrice: 0.6123, pipSize: 0.0001, volatility: 9, spread: 1.8 },
  "EUR/GBP": { basePrice: 0.8592, pipSize: 0.0001, volatility: 7, spread: 1.3 },
  "XAU/USD": { basePrice: 2345.78, pipSize: 0.01, volatility: 25, spread: 30 },
  "BTC/USD": { basePrice: 67543.21, pipSize: 0.01, volatility: 150, spread: 50 },
  "ETH/USD": { basePrice: 3521.45, pipSize: 0.01, volatility: 80, spread: 20 },
  "US30":    { basePrice: 39245.00, pipSize: 1, volatility: 50, spread: 3 },
  "NAS100":  { basePrice: 17856.00, pipSize: 1, volatility: 40, spread: 2 },
};

function getDecimals(symbol: string): number {
  if (symbol.includes("JPY") || symbol === "US30" || symbol === "NAS100") return 2;
  if (["BTC/USD", "ETH/USD", "XAU/USD"].includes(symbol)) return 2;
  return 5;
}

function simulatePrice(symbol: string, timestamp: number): PriceData {
  const inst = instruments[symbol];
  if (!inst) return { symbol, bid: 0, ask: 0, change: 0, changePercent: 0 };

  const minutesSinceEpoch = Math.floor(timestamp / 60000);
  let price = inst.basePrice;
  
  const seed = minutesSinceEpoch % 1440;
  let drift = 0;
  for (let i = 0; i < seed; i++) {
    const hash = Math.sin(i * 12.9898 + symbol.length * 78.233) * 43758.5453;
    const rand = hash - Math.floor(hash);
    drift += (rand - 0.5) * inst.volatility * inst.pipSize * 0.1;
  }
  price += drift;
  
  // Sub-minute jitter for smooth ticks
  const seconds = Math.floor(timestamp / 1000) % 60;
  const jitterHash = Math.sin(seconds * 12.9898 + minutesSinceEpoch * 78.233 + symbol.length) * 43758.5453;
  const jitter = (jitterHash - Math.floor(jitterHash) - 0.5) * inst.volatility * inst.pipSize * 0.02;
  price += jitter;

  // Additional sub-second micro-jitter for ultra-smooth movement
  const ms = timestamp % 1000;
  const microHash = Math.sin(ms * 0.001 * 12.9898 + seconds * 78.233 + symbol.charCodeAt(0)) * 43758.5453;
  const microJitter = (microHash - Math.floor(microHash) - 0.5) * inst.volatility * inst.pipSize * 0.005;
  price += microJitter;

  const dec = getDecimals(symbol);
  const spreadHalf = inst.spread * inst.pipSize / 2;
  const bid = parseFloat(price.toFixed(dec));
  const ask = parseFloat((price + spreadHalf * 2).toFixed(dec));
  const change = parseFloat((price - inst.basePrice).toFixed(5));
  const changePercent = parseFloat(((change / inst.basePrice) * 100).toFixed(3));

  return { symbol, bid, ask, change, changePercent };
}

export function useLivePrices(symbols: string[], intervalMs = 1000) {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const prevPrices = useRef<Record<string, number>>({});

  const tick = useCallback(() => {
    const now = Date.now();
    const newPrices: Record<string, PriceData> = {};
    
    for (const sym of symbols) {
      const data = simulatePrice(sym, now);
      data.prevBid = prevPrices.current[sym] || data.bid;
      prevPrices.current[sym] = data.bid;
      newPrices[sym] = data;
    }
    
    setPrices(newPrices);
  }, [symbols]);

  useEffect(() => {
    tick(); // Initial tick
    const interval = setInterval(tick, intervalMs);
    return () => clearInterval(interval);
  }, [tick, intervalMs]);

  return prices;
}

export function getSymbolList(): string[] {
  return Object.keys(instruments);
}

export function getInstrumentInfo(symbol: string) {
  return instruments[symbol] || null;
}

export { type PriceData };
