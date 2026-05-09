// Naira ↔ BTAX live converter. Reads rate from academy_settings, defaults to ₦100/BTAX.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownUp, Loader2, RefreshCw, AlertTriangle, Database, History, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_BTAX_TO_NAIRA,
  btaxToNaira,
  clearBtaxRateCache,
  formatBtax,
  formatNaira,
  getBtaxToNairaRate,
  nairaToBtax,
} from "@/lib/btax";

type Direction = "naira_to_btax" | "btax_to_naira";

interface RateHistoryEntry {
  rate: number;
  at: Date;
  source: "academy_settings" | "default-fallback";
}

interface CurrencyConverterProps {
  defaultDirection?: Direction;
  className?: string;
  compact?: boolean;
  showDataSourcePanel?: boolean;
  showRateHistory?: boolean;
}

export const CurrencyConverter = ({
  defaultDirection = "naira_to_btax",
  className = "",
  compact = false,
  showDataSourcePanel = false,
  showRateHistory = false,
}: CurrencyConverterProps) => {
  const [rate, setRate] = useState<number>(DEFAULT_BTAX_TO_NAIRA);
  const [loadingRate, setLoadingRate] = useState(true);
  const [rateError, setRateError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [, forceTick] = useState(0);
  const [direction, setDirection] = useState<Direction>(defaultDirection);
  const [input, setInput] = useState<string>("");
  const [history, setHistory] = useState<RateHistoryEntry[]>([]);
  const [source, setSource] = useState<"academy_settings" | "default-fallback" | "loading">("loading");

  const loadRate = useCallback(async (force = false) => {
    setLoadingRate(true);
    setRateError(null);
    try {
      if (force) clearBtaxRateCache();
      const r = await getBtaxToNairaRate(force);
      const now = new Date();
      setRate(r);
      setHistory((h) => [{ rate: r, at: now, source: "academy_settings" as const }, ...h].slice(0, 5));
      setLastUpdated(now);
      setSource("academy_settings");
    } catch (e: any) {
      setRateError("Couldn't load live rate. Using default ₦100/BTAX.");
      setRate(DEFAULT_BTAX_TO_NAIRA);
      setSource("default-fallback");
      setHistory((h) => [{ rate: DEFAULT_BTAX_TO_NAIRA, at: new Date(), source: "default-fallback" as const }, ...h].slice(0, 5));
    } finally {
      setLoadingRate(false);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const formatAgo = (d: Date) => {
    const diff = Math.max(0, Date.now() - d.getTime());
    const s = Math.round(diff / 1000);
    if (s < 60) return "just now";
    const m = Math.round(s / 60);
    if (m < 60) return `${m} min${m === 1 ? "" : "s"} ago`;
    const h = Math.round(m / 60);
    return `${h} hr${h === 1 ? "" : "s"} ago`;
  };

  const lastUpdatedLabel = useMemo(
    () => (lastUpdated ? formatAgo(lastUpdated) : null),
    [lastUpdated, rate]
  );

  useEffect(() => {
    loadRate(false);
  }, [loadRate]);

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

  const previous = history[1];

  return (
    <Card className={`p-4 space-y-3 ${className}`}>
      {!compact && (
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Currency Converter</h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">
              {loadingRate ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>1 BTAX = ₦{rate.toLocaleString()}</>
              )}
            </span>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-6 w-6 focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => loadRate(true)}
              disabled={loadingRate}
              aria-label="Refresh rate"
              title="Refresh rate"
            >
              <RefreshCw className={`w-3 h-3 ${loadingRate ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      )}

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {loadingRate
          ? "Loading current rate"
          : rateError
          ? rateError
          : `Current rate: 1 BTAX equals ${rate} Naira${
              lastUpdatedLabel ? `, updated ${lastUpdatedLabel}` : ""
            }`}
      </div>

      {rateError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-[10px] text-destructive"
        >
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <p>{rateError}</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-2 focus-visible:ring-2 focus-visible:ring-destructive"
            onClick={() => loadRate(true)}
            aria-label="Retry loading rate"
            autoFocus
          >
            Retry
          </Button>
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
          className="h-10 text-base font-semibold focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>

      <div className="flex justify-center">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full focus-visible:ring-2 focus-visible:ring-primary"
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
        <div
          className="h-10 px-3 rounded-md bg-muted/40 border border-border flex items-center font-mono text-base font-semibold"
          aria-live="polite"
          aria-atomic="true"
        >
          {outDisplay}
        </div>
      </div>

      {!compact && (
        <div className="space-y-1 pt-1">
          <p className="text-[10px] text-muted-foreground text-center">
            Live rate from academy settings · 1 BTAX = ₦{rate.toLocaleString()}
            {lastUpdated && (
              <span
                className="ml-1 text-muted-foreground/70"
                title={lastUpdated.toLocaleString()}
              >
                · updated {lastUpdatedLabel}
              </span>
            )}
          </p>
          <p
            data-testid="naira-context-note"
            className="text-[9px] text-muted-foreground/80 text-center leading-snug px-1"
          >
            Naira (₦) only appears here and on the ₦1,000 activation fee receipt.
            Wallet balances, rewards, and admin stats are denominated in BTAX.
          </p>
        </div>
      )}

      {showRateHistory && (
        <div
          data-testid="rate-refresh-history"
          className="rounded-md border border-border/60 bg-muted/20 p-2 space-y-1"
          aria-label="Rate refresh history"
        >
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
            <History className="w-3 h-3" aria-hidden="true" />
            Rate refresh history
          </div>
          {lastUpdated ? (
            <p className="text-[10px]">
              <span className="font-mono">1 BTAX = ₦{rate.toLocaleString()}</span>
              <span className="text-muted-foreground"> · {lastUpdatedLabel}</span>
              <span className="ml-1 text-[9px] text-muted-foreground/70" title={lastUpdated.toLocaleString()}>
                ({lastUpdated.toLocaleTimeString()})
              </span>
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground">No refresh recorded yet.</p>
          )}
          {previous && (
            <p className="text-[9px] text-muted-foreground/80">
              Previous: <span className="font-mono">1 BTAX = ₦{previous.rate.toLocaleString()}</span>
              <span> · {formatAgo(previous.at)} </span>
              <span className="text-muted-foreground/60" title={previous.at.toLocaleString()}>
                ({previous.at.toLocaleTimeString()})
              </span>
            </p>
          )}
        </div>
      )}

      {showDataSourcePanel && (
        <div
          data-testid="data-source-panel"
          className="rounded-md border border-border/60 bg-muted/10 p-2 space-y-1.5"
          aria-label="Data source status"
        >
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
            <Database className="w-3 h-3" aria-hidden="true" />
            Data Source Status
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Conversion rate</span>
            <span className="flex items-center gap-1 font-mono">
              {source === "academy_settings" ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-green-500" aria-hidden="true" />
                  <span className="text-green-600 dark:text-green-400">academy_settings (live)</span>
                </>
              ) : source === "default-fallback" ? (
                <>
                  <AlertTriangle className="w-3 h-3 text-amber-500" aria-hidden="true" />
                  <span className="text-amber-600 dark:text-amber-400">default fallback</span>
                </>
              ) : (
                <span className="text-muted-foreground">loading…</span>
              )}
            </span>
          </div>
          <p className="text-[9px] text-muted-foreground/70 leading-snug">
            Real-time rate from <code className="font-mono">academy_settings.btax_to_naira_rate</code>.
            Trader Atlas profile fields (display_name, avatar_url, xp_points) are read live from
            the <code className="font-mono">profiles</code> table and{" "}
            <code className="font-mono">user_locations</code> realtime channel.
          </p>
        </div>
      )}
    </Card>
  );
};
