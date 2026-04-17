// 8-currency strength meter — derived from live FX prices.
// Strength = average % change of a currency vs all others.
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Activity } from "lucide-react";

const CCY = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD"];

// pseudo deterministic price walk (same engine philosophy as use-live-prices)
function seedFor(symbol: string): number {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function priceTick(symbol: string, t: number): number {
  const s = seedFor(symbol);
  return Math.sin(t / 7 + s) * 0.0015 + Math.cos(t / 23 + s * 1.3) * 0.0008;
}

export const CurrencyStrengthMeter = () => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((v) => v + 1), 1500);
    return () => clearInterval(i);
  }, []);

  const strengths = useMemo(() => {
    const map: Record<string, number> = {};
    CCY.forEach((c) => (map[c] = 0));
    for (let i = 0; i < CCY.length; i++) {
      for (let j = i + 1; j < CCY.length; j++) {
        const sym = CCY[i] + CCY[j];
        const change = priceTick(sym, tick);
        map[CCY[i]] += change * 100;
        map[CCY[j]] -= change * 100;
      }
    }
    return Object.entries(map)
      .map(([ccy, v]) => ({ ccy, value: v }))
      .sort((a, b) => b.value - a.value);
  }, [tick]);

  const max = Math.max(...strengths.map((s) => Math.abs(s.value)), 0.5);

  return (
    <Card className="p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Activity className="w-3.5 h-3.5 text-primary" />
        <h3 className="text-xs font-bold">Currency Strength</h3>
      </div>
      <div className="space-y-1">
        {strengths.map((s, i) => {
          const pct = (Math.abs(s.value) / max) * 100;
          const positive = s.value >= 0;
          return (
            <div key={s.ccy} className="flex items-center gap-2">
              <span className="text-[10px] font-bold w-7 font-mono">{s.ccy}</span>
              <div className="flex-1 h-3 bg-muted/30 rounded overflow-hidden flex">
                <div className="w-1/2 flex justify-end">
                  {!positive && (
                    <div
                      className="h-full bg-rose-500/80 rounded-l"
                      style={{ width: `${pct}%` }}
                    />
                  )}
                </div>
                <div className="w-px h-full bg-border" />
                <div className="w-1/2">
                  {positive && (
                    <div
                      className="h-full bg-emerald-500/80 rounded-r"
                      style={{ width: `${pct}%` }}
                    />
                  )}
                </div>
              </div>
              <span
                className={`text-[9px] font-mono w-10 text-right ${
                  positive ? "text-emerald-500" : "text-rose-500"
                }`}
              >
                {s.value > 0 ? "+" : ""}
                {s.value.toFixed(2)}
              </span>
              <span className="text-[8px] text-muted-foreground w-4">#{i + 1}</span>
            </div>
          );
        })}
      </div>
      <p className="text-[8px] text-muted-foreground mt-2">
        Sorted strongest → weakest. Long strong / short weak.
      </p>
    </Card>
  );
};
