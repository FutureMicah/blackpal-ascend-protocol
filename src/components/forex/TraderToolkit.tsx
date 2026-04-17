// Trader Toolkit — 4 calculators in tabs: position size, pip value, profit, margin.
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, TrendingUp, DollarSign, Scale } from "lucide-react";
import { FOREX_PAIRS, positionSize, pipValuePerLot, tradePnL, requiredMargin, kellyFraction, riskOfRuin } from "@/lib/forex-math";

export const TraderToolkit = () => {
  const [symbol, setSymbol] = useState("EURUSD");

  // Position size
  const [balance, setBalance] = useState("10000");
  const [riskPct, setRiskPct] = useState("1");
  const [slPips, setSlPips] = useState("20");
  const lots = positionSize(+balance * (+riskPct / 100), +slPips, symbol);

  // Pip value
  const [pvLots, setPvLots] = useState("1");
  const pipV = pipValuePerLot(symbol) * +pvLots;

  // Profit
  const [side, setSide] = useState<"long" | "short">("long");
  const [entry, setEntry] = useState("1.1000");
  const [exit, setExit] = useState("1.1050");
  const [pLots, setPLots] = useState("0.10");
  const pnl = tradePnL(symbol, +pLots, +entry, +exit, side);

  // Margin
  const [mLots, setMLots] = useState("1");
  const [mEntry, setMEntry] = useState("1.1000");
  const [leverage, setLeverage] = useState("100");
  const margin = requiredMargin(+mLots, +mEntry, +leverage);

  // Kelly / RoR
  const [winRate, setWinRate] = useState("55");
  const [rr, setRR] = useState("2");
  const [riskTrade, setRiskTrade] = useState("1");
  const kelly = kellyFraction(+winRate / 100, +rr) * 100;
  const ror = riskOfRuin(+winRate / 100, +rr, +riskTrade);

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Calculator className="w-3.5 h-3.5 text-primary" />
          <h3 className="text-xs font-bold">Trader Toolkit</h3>
        </div>
        <Select value={symbol} onValueChange={setSymbol}>
          <SelectTrigger className="h-6 w-24 text-[10px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FOREX_PAIRS.map((p) => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="position">
        <TabsList className="grid grid-cols-5 h-7 mb-2">
          <TabsTrigger value="position" className="text-[9px] px-1"><Scale className="w-3 h-3" /></TabsTrigger>
          <TabsTrigger value="pip" className="text-[9px] px-1">Pip</TabsTrigger>
          <TabsTrigger value="profit" className="text-[9px] px-1"><TrendingUp className="w-3 h-3" /></TabsTrigger>
          <TabsTrigger value="margin" className="text-[9px] px-1"><DollarSign className="w-3 h-3" /></TabsTrigger>
          <TabsTrigger value="kelly" className="text-[9px] px-1">Kelly</TabsTrigger>
        </TabsList>

        <TabsContent value="position" className="space-y-1.5">
          <Row label="Balance ($)" value={balance} onChange={setBalance} />
          <Row label="Risk %" value={riskPct} onChange={setRiskPct} />
          <Row label="Stop-Loss (pips)" value={slPips} onChange={setSlPips} />
          <ResultRow label="Position size" value={`${lots.toFixed(2)} lots`} />
        </TabsContent>

        <TabsContent value="pip" className="space-y-1.5">
          <Row label="Lot size" value={pvLots} onChange={setPvLots} />
          <ResultRow label="Pip value" value={`$${pipV.toFixed(2)}`} />
          <p className="text-[8px] text-muted-foreground">Per 1 pip on {symbol}</p>
        </TabsContent>

        <TabsContent value="profit" className="space-y-1.5">
          <div className="grid grid-cols-2 gap-1">
            <Button size="sm" variant={side === "long" ? "default" : "outline"} className="h-6 text-[10px]" onClick={() => setSide("long")}>Long</Button>
            <Button size="sm" variant={side === "short" ? "default" : "outline"} className="h-6 text-[10px]" onClick={() => setSide("short")}>Short</Button>
          </div>
          <Row label="Entry" value={entry} onChange={setEntry} />
          <Row label="Exit" value={exit} onChange={setExit} />
          <Row label="Lots" value={pLots} onChange={setPLots} />
          <ResultRow label="P&L" value={`$${pnl.toFixed(2)}`} positive={pnl >= 0} />
        </TabsContent>

        <TabsContent value="margin" className="space-y-1.5">
          <Row label="Lots" value={mLots} onChange={setMLots} />
          <Row label="Entry" value={mEntry} onChange={setMEntry} />
          <Row label="Leverage 1:" value={leverage} onChange={setLeverage} />
          <ResultRow label="Required margin" value={`$${margin.toFixed(2)}`} />
        </TabsContent>

        <TabsContent value="kelly" className="space-y-1.5">
          <Row label="Win rate %" value={winRate} onChange={setWinRate} />
          <Row label="Reward:Risk" value={rr} onChange={setRR} />
          <Row label="Risk per trade %" value={riskTrade} onChange={setRiskTrade} />
          <ResultRow label="Kelly optimal %" value={`${kelly.toFixed(1)}%`} />
          <ResultRow label="Risk of ruin" value={`${ror.toFixed(0)}%`} positive={ror < 25} />
        </TabsContent>
      </Tabs>
    </Card>
  );
};

const Row = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="flex items-center gap-2">
    <Label className="text-[9px] flex-1">{label}</Label>
    <Input value={value} onChange={(e) => onChange(e.target.value)} type="number" className="h-7 text-[10px] w-24 text-right font-mono" />
  </div>
);

const ResultRow = ({ label, value, positive }: { label: string; value: string; positive?: boolean }) => (
  <div className="flex items-center justify-between p-1.5 rounded bg-primary/10 border border-primary/20">
    <span className="text-[10px] font-semibold">{label}</span>
    <span className={`text-xs font-bold font-mono ${positive === undefined ? "text-primary" : positive ? "text-emerald-500" : "text-rose-500"}`}>
      {value}
    </span>
  </div>
);
