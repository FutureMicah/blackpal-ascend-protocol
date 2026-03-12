import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Realistic base prices and volatility profiles for each instrument
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

// Use time-seeded random walk so prices are consistent within a short window
function getPrice(symbol: string, timestamp: number): { bid: number; ask: number; change: number; changePercent: number } {
  const inst = instruments[symbol];
  if (!inst) throw new Error(`Unknown symbol: ${symbol}`);

  // Generate a deterministic-ish random walk based on time
  const minutesSinceEpoch = Math.floor(timestamp / 60000);
  let price = inst.basePrice;
  
  // Walk from a fixed seed
  const seed = minutesSinceEpoch % 1440; // 24 hours of minutes
  let drift = 0;
  for (let i = 0; i < seed; i++) {
    const hash = Math.sin(i * 12.9898 + symbol.length * 78.233) * 43758.5453;
    const rand = hash - Math.floor(hash); // 0-1
    drift += (rand - 0.5) * inst.volatility * inst.pipSize * 0.1;
  }
  
  price += drift;
  
  // Add sub-minute jitter based on seconds
  const seconds = Math.floor(timestamp / 1000) % 60;
  const jitterHash = Math.sin(seconds * 12.9898 + minutesSinceEpoch * 78.233 + symbol.length) * 43758.5453;
  const jitter = (jitterHash - Math.floor(jitterHash) - 0.5) * inst.volatility * inst.pipSize * 0.02;
  price += jitter;

  const spreadHalf = inst.spread * inst.pipSize / 2;
  const bid = parseFloat(price.toFixed(symbol.includes("JPY") || symbol === "US30" || symbol === "NAS100" ? 2 : symbol === "BTC/USD" || symbol === "ETH/USD" || symbol === "XAU/USD" ? 2 : 5));
  const ask = parseFloat((price + spreadHalf * 2).toFixed(symbol.includes("JPY") || symbol === "US30" || symbol === "NAS100" ? 2 : symbol === "BTC/USD" || symbol === "ETH/USD" || symbol === "XAU/USD" ? 2 : 5));
  
  const change = parseFloat((price - inst.basePrice).toFixed(5));
  const changePercent = parseFloat(((change / inst.basePrice) * 100).toFixed(3));

  return { bid, ask, change, changePercent };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbols } = await req.json();
    const now = Date.now();
    
    const requestedSymbols = symbols && symbols.length > 0 ? symbols : Object.keys(instruments);
    
    const prices: Record<string, any> = {};
    for (const sym of requestedSymbols) {
      if (instruments[sym]) {
        prices[sym] = { ...getPrice(sym, now), symbol: sym };
      }
    }

    return new Response(JSON.stringify({ prices, timestamp: now }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
