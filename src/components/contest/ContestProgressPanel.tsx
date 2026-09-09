import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Gauge } from "lucide-react";
import { ContestRules, ContestStats, computeScore, evaluateGates, deriveStatus } from "@/lib/contest-scoring";

interface Props {
  rules: ContestRules;
  stats: ContestStats;
  ended: boolean;
  rank?: number | null;
}

export function ContestProgressPanel({ rules, stats, ended, rank }: Props) {
  const score = computeScore(stats, rules);
  const gates = evaluateGates(stats, rules);
  const status = deriveStatus(stats, rules, ended);
  const failing = gates.filter((g) => !g.passed);

  return (
    <Card className="p-3 space-y-3 border-primary/25 neon-border ascend-reveal">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Gauge className="w-4 h-4 text-primary orbit-3d" />
          <span className="text-xs font-bold neon-text">Your run</span>
        </div>
        <div className="flex items-center gap-1.5">
          {rank != null && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
              rank #{rank}
            </Badge>
          )}
          <Badge
            variant={status === "passed" ? "default" : status === "failed" ? "destructive" : "secondary"}
            className="text-[9px] px-1.5 py-0"
          >
            {status === "in_progress" ? "in progress" : status}
          </Badge>
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[10px] text-muted-foreground">Gauntlet score</span>
          <span className="text-lg font-bold tabular-nums text-primary neon-text-accent">{score.toFixed(1)}</span>
        </div>
        <Progress value={score} className="h-1.5" />
      </div>

      <div className="space-y-2">
        {gates.map((g) => (
          <div key={g.key} className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="flex items-center gap-1 font-medium">
                {g.passed ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                ) : (
                  <XCircle className="w-3 h-3 text-destructive" />
                )}
                {g.label}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {g.current} / {g.required}
              </span>
            </div>
            <Progress value={g.progress} className="h-1" />
          </div>
        ))}
      </div>

      <div className="rounded-md bg-muted/40 p-2">
        <p className="text-[10px] font-semibold mb-0.5">What you need to pass</p>
        {failing.length === 0 ? (
          <p className="text-[10px] text-emerald-500">
            All gates cleared. Hold your drawdown and the record is yours.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {failing.map((g) => (
              <li key={g.key} className="text-[10px] text-muted-foreground">
                • {g.advice}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
