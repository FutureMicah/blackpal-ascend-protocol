import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Target, ShieldAlert, Activity, CalendarDays, Percent, Trophy } from "lucide-react";
import { ContestRules, SCORE_WEIGHTS } from "@/lib/contest-scoring";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  rules: ContestRules;
}

export function ContestRulesModal({ open, onOpenChange, title, rules }: Props) {
  const gates = [
    {
      icon: Target,
      label: "Profit target",
      value: `≥ ${rules.target_profit_pct}%`,
      note: "Net closed P&L against your starting balance.",
    },
    {
      icon: ShieldAlert,
      label: "Max drawdown",
      value: `≤ ${rules.max_drawdown_pct}%`,
      note: "Peak-to-valley equity drop. Breach it once and the run is over.",
    },
    {
      icon: Activity,
      label: "Minimum trades",
      value: `≥ ${rules.min_trades}`,
      note: "Only closed trades count. Hedged scalps under 10 seconds do not.",
    },
    {
      icon: CalendarDays,
      label: "Active days",
      value: `≥ ${rules.min_active_days}`,
      note: "Separate calendar days with at least one closed trade.",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85dvh] p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Trophy className="w-4 h-4 text-primary" /> {title} — rules &amp; scoring
          </DialogTitle>
          <DialogDescription className="text-xs">
            Exactly how the gauntlet is judged, and where the “{rules.fail_rate_pct}% could not pass” number
            comes from.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65dvh] px-4 pb-4">
          <div className="space-y-4">
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                The four gates (all must pass)
              </h3>
              {gates.map((g) => (
                <div key={g.label} className="flex gap-3 rounded-lg border border-border bg-card/50 p-3">
                  <g.icon className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">
                      {g.label} <span className="text-primary">{g.value}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">{g.note}</p>
                  </div>
                </div>
              ))}
            </section>

            <Separator />

            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                How your score is calculated
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Each gate is scored 0–100% of its requirement (capped at 100), then weighted:
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-[10px]">Profit {SCORE_WEIGHTS.profit * 100}%</Badge>
                <Badge variant="outline" className="text-[10px]">Drawdown control {SCORE_WEIGHTS.drawdown * 100}%</Badge>
                <Badge variant="outline" className="text-[10px]">Trades {SCORE_WEIGHTS.trades * 100}%</Badge>
                <Badge variant="outline" className="text-[10px]">Active days {SCORE_WEIGHTS.days * 100}%</Badge>
              </div>
              <pre className="text-[10px] bg-muted/50 rounded-md p-2 overflow-x-auto">
{`score = 0.50 × min(profit / target, 1)
      + 0.20 × max(0, 1 − drawdown / maxDrawdown)
      + 0.15 × min(trades / minTrades, 1)
      + 0.15 × min(days / minDays, 1)`}
              </pre>
              <p className="text-[11px] text-muted-foreground">
                Score orders the Record Holder leaderboard. Ties break on lower drawdown first, then earlier
                pass timestamp.
              </p>
            </section>

            <Separator />

            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5" /> Where “{rules.fail_rate_pct}% could not pass” comes from
              </h3>
              <p className="text-[11px] text-muted-foreground">
                It is the failure rate for this entry tier: the share of finished entries that did{" "}
                <strong>not</strong> clear all four gates before the contest window closed — including runs
                ended early by a drawdown breach. Entries still in progress are excluded, so the number only
                moves when a run finishes.
              </p>
              <p className="text-[11px] text-muted-foreground">
                Failure rate = finished entries with status <em>failed</em> ÷ all finished entries × 100.
              </p>
            </section>

            <Separator />

            <section className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                What does not count
              </h3>
              <ul className="text-[11px] text-muted-foreground list-disc pl-4 space-y-1">
                <li>Open positions — only closed P&amp;L is scored.</li>
                <li>Trades placed on an account that is not linked and verified.</li>
                <li>Copy-traded positions mirrored from another participant.</li>
                <li>Anything after the contest end time, even if the position was opened earlier.</li>
              </ul>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
