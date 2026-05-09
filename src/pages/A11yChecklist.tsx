// End-to-end keyboard navigation checklist for the converter and Trader Atlas.
// Demonstrates focus order, visible focus rings, and aria-live announcements.
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CurrencyConverter } from "@/components/CurrencyConverter";
import { Link } from "react-router-dom";
import { CheckCircle2, Keyboard, Volume2, Eye } from "lucide-react";

const focusOrder = [
  { area: "Converter", step: "Refresh rate button", note: "Tab → focus ring visible (ring-primary)" },
  { area: "Converter", step: "Amount input", note: "Tab → underline + ring; type number" },
  { area: "Converter", step: "Flip direction button", note: "Tab → ring; Enter/Space flips" },
  { area: "Converter", step: "Retry (when error)", note: "Auto-focus inside aria-alert" },
  { area: "Atlas", step: "3D / 2D tablist", note: "Tab once; ArrowLeft/Right to switch" },
  { area: "Atlas", step: "Pin-me button", note: "Tab to circular button; Enter requests GPS" },
  { area: "Atlas", step: "Search input (2D)", note: "Tab; type filters traders live" },
  { area: "Atlas", step: "Retry profile load", note: "Auto-focus when enrich error appears" },
];

const ariaLive = [
  { area: "Converter", region: "sr-only polite", announces: "Loading rate / current rate / error message" },
  { area: "Converter", region: "Output value (polite)", announces: "Recomputed conversion" },
  { area: "Atlas", region: "Loader status (polite + busy)", announces: "Locating traders…" },
  { area: "Atlas", region: "Enrich loader (polite + busy)", announces: "Loading trader profiles…" },
  { area: "Atlas", region: "Enrich error (alert)", announces: "Couldn't load trader profiles…" },
];

export default function A11yChecklist() {
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Keyboard className="w-6 h-6 text-primary" />
            Keyboard Navigation Checklist
          </h1>
          <p className="text-sm text-muted-foreground">
            End-to-end audit of focus order, focus rings, and aria-live announcements
            for the Naira↔BTAX converter and Trader Atlas loaders.
          </p>
          <div className="flex gap-2 pt-2">
            <Link to="/world-map" className="text-xs text-primary underline focus-visible:ring-2 focus-visible:ring-primary rounded">Open Trader Atlas →</Link>
            <Link to="/wallet/topup" className="text-xs text-primary underline focus-visible:ring-2 focus-visible:ring-primary rounded">Open Naira Top-up →</Link>
          </div>
        </header>

        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            Focus Order
          </h2>
          <ol className="space-y-2 list-decimal list-inside text-sm">
            {focusOrder.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <Badge variant="outline" className="text-[9px]">{f.area}</Badge>
                <div className="flex-1">
                  <span className="font-semibold">{f.step}</span>
                  <span className="text-xs text-muted-foreground"> — {f.note}</span>
                </div>
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              </li>
            ))}
          </ol>
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-primary" />
            Aria-Live Announcements
          </h2>
          <ul className="space-y-2 text-sm">
            {ariaLive.map((a, i) => (
              <li key={i} className="flex items-start gap-2 border-b border-border/50 pb-2 last:border-0">
                <Badge variant="outline" className="text-[9px]">{a.area}</Badge>
                <div className="flex-1">
                  <p className="font-semibold">{a.region}</p>
                  <p className="text-xs text-muted-foreground">Announces: “{a.announces}”</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-bold">Live Sample — Tab through this converter</h2>
          <p className="text-xs text-muted-foreground">
            Use Tab/Shift+Tab to walk the focus order. Visible focus rings should appear on every interactive element.
          </p>
          <div className="max-w-sm">
            <CurrencyConverter showRateHistory showDataSourcePanel />
          </div>
        </Card>
      </div>
    </div>
  );
}
