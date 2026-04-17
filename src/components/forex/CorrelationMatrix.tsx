// Pair correlation matrix — helps avoid duplicate exposure.
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { GitBranch } from "lucide-react";

const PAIRS = ["EURUSD","GBPUSD","USDJPY","AUDUSD","USDCAD","NZDUSD","USDCHF"];

// Static representative correlations (rolling 30d typical values)
const CORRELATIONS: Record<string, Record<string, number>> = {
  EURUSD: { EURUSD: 1, GBPUSD: 0.78, USDJPY: -0.45, AUDUSD: 0.65, USDCAD: -0.62, NZDUSD: 0.58, USDCHF: -0.92 },
  GBPUSD: { EURUSD: 0.78, GBPUSD: 1, USDJPY: -0.32, AUDUSD: 0.60, USDCAD: -0.55, NZDUSD: 0.52, USDCHF: -0.70 },
  USDJPY: { EURUSD: -0.45, GBPUSD: -0.32, USDJPY: 1, AUDUSD: -0.30, USDCAD: 0.40, NZDUSD: -0.28, USDCHF: 0.55 },
  AUDUSD: { EURUSD: 0.65, GBPUSD: 0.60, USDJPY: -0.30, AUDUSD: 1, USDCAD: -0.50, NZDUSD: 0.88, USDCHF: -0.62 },
  USDCAD: { EURUSD: -0.62, GBPUSD: -0.55, USDJPY: 0.40, AUDUSD: -0.50, USDCAD: 1, NZDUSD: -0.48, USDCHF: 0.58 },
  NZDUSD: { EURUSD: 0.58, GBPUSD: 0.52, USDJPY: -0.28, AUDUSD: 0.88, USDCAD: -0.48, NZDUSD: 1, USDCHF: -0.55 },
  USDCHF: { EURUSD: -0.92, GBPUSD: -0.70, USDJPY: 0.55, AUDUSD: -0.62, USDCAD: 0.58, NZDUSD: -0.55, USDCHF: 1 },
};

function color(v: number): string {
  if (v >= 0.7) return "bg-emerald-500/80 text-white";
  if (v >= 0.3) return "bg-emerald-500/40";
  if (v >= -0.3) return "bg-muted";
  if (v >= -0.7) return "bg-rose-500/40";
  return "bg-rose-500/80 text-white";
}

export const CorrelationMatrix = () => {
  const cells = useMemo(() => PAIRS, []);
  return (
    <Card className="p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <GitBranch className="w-3.5 h-3.5 text-primary" />
        <h3 className="text-xs font-bold">Pair Correlation</h3>
      </div>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-[8px] font-mono">
          <thead>
            <tr>
              <th className="p-0.5"></th>
              {cells.map((p) => (
                <th key={p} className="p-0.5 font-bold">{p.slice(0, 3)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cells.map((row) => (
              <tr key={row}>
                <td className="p-0.5 font-bold">{row.slice(0, 3)}</td>
                {cells.map((col) => {
                  const v = CORRELATIONS[row]?.[col] ?? 0;
                  return (
                    <td key={col} className={`p-0.5 text-center rounded ${color(v)}`}>
                      {v.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 mt-2 text-[8px]">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-emerald-500/80" /> +Strong</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-muted" /> Neutral</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-rose-500/80" /> -Strong</div>
      </div>
    </Card>
  );
};
