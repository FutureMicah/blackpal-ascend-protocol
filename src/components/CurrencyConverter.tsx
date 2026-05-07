// Naira ↔ BTAX live converter. Reads rate from academy_settings, defaults to ₦100/BTAX.
import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_BTAX_TO_NAIRA,
  btaxToNaira,
  formatBtax,
  formatNaira,
  getBtaxToNairaRate,
  nairaToBtax,
} from "@/lib/btax";

type Direction = "naira_to_btax" | "btax_to_naira";

interface CurrencyConverterProps {
  defaultDirection?: Direction;
  className?: string;
  compact?: boolean;
}

export const CurrencyConverter = ({
  defaultDirection = "naira_to_btax",
  className = "",
  compact = false,
}: CurrencyConverterProps) => {
  const [rate, setRate] = useState<number>(DEFAULT_BTAX_TO_NAIRA);
  const [loadingRate, setLoadingRate] = useState(true);
  const [direction, setDirection] = useState<Direction>(defaultDirection);
  const [input, setInput] = useState<string>("");

  useEffect(() => {
    let alive = true;
    getBtaxToNairaRate().then((r) => {
      if (alive) {
        setRate(r);
        setLoadingRate(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const numeric = Number(input) || 0;
  const result = useMemo(() => {
    if (direction === "naira_to_btax") return nairaToBtax(numeric, rate);
    return btaxToNaira(numeric, rate);
  }, [numeric, rate, direction]);

  const inLabel = direction === "naira_to_btax" ? "Naira (₦)" : "BTAX";
  const outLabel = direction === "naira_to_btax" ? "BTAX" : "Naira (₦)";
  const outDisplay =
    direction === "naira_to_btax" ? formatBtax(result) : formatNaira(result);

  const flip = () =>
    setDirection((d) =>
      d === "naira_to_btax" ? "btax_to_naira" : "naira_to_btax"
    );

  return (
    <Card className={`p-4 space-y-3 ${className}`}>
      {!compact && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Currency Converter</h3>
          <span className="text-[10px] text-muted-foreground">
            {loadingRate ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>1 BTAX = ₦{rate.toLocaleString()}</>
            )}
          </span>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {inLabel}
        </Label>
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          placeholder="0"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="h-10 text-base font-semibold"
        />
      </div>

      <div className="flex justify-center">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={flip}
          aria-label="Flip direction"
        >
          <ArrowDownUp className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {outLabel}
        </Label>
        <div className="h-10 px-3 rounded-md bg-muted/40 border border-border flex items-center font-mono text-base font-semibold">
          {outDisplay}
        </div>
      </div>

      {!compact && (
        <p className="text-[10px] text-muted-foreground text-center pt-1">
          Live rate from academy settings · 1 BTAX = ₦{rate.toLocaleString()}
        </p>
      )}
    </Card>
  );
};
