/**
 * Contest scoring model — single source of truth for the Record Holder gauntlets.
 *
 * A pass requires ALL four gates:
 *   1. profit_pct  >= target_profit_pct
 *   2. drawdown_pct <= max_drawdown_pct
 *   3. trades_count >= min_trades
 *   4. active_days  >= min_active_days
 *
 * Score is a 0–100 blend so partial progress is visible on the leaderboard.
 */

export interface ContestRules {
  entry_price_usd: number;
  target_profit_pct: number;
  max_drawdown_pct: number;
  min_trades: number;
  min_active_days: number;
  fail_rate_pct: number;
}

export interface ContestStats {
  profit_pct: number;
  drawdown_pct: number;
  trades_count: number;
  active_days: number;
}

export const SCORE_WEIGHTS = {
  profit: 0.5,
  drawdown: 0.2,
  trades: 0.15,
  days: 0.15,
} as const;

const clamp01 = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));

export function computeScore(stats: ContestStats, rules: ContestRules): number {
  const profit = clamp01(stats.profit_pct / Math.max(rules.target_profit_pct, 0.0001));
  const drawdown = clamp01(
    rules.max_drawdown_pct <= 0 ? 1 : 1 - stats.drawdown_pct / rules.max_drawdown_pct,
  );
  const trades = clamp01(stats.trades_count / Math.max(rules.min_trades, 1));
  const days = clamp01(stats.active_days / Math.max(rules.min_active_days, 1));

  const score =
    profit * SCORE_WEIGHTS.profit +
    drawdown * SCORE_WEIGHTS.drawdown +
    trades * SCORE_WEIGHTS.trades +
    days * SCORE_WEIGHTS.days;

  return Math.round(score * 1000) / 10; // 0–100, one decimal
}

export interface GateResult {
  key: "profit" | "drawdown" | "trades" | "days";
  label: string;
  current: string;
  required: string;
  passed: boolean;
  progress: number; // 0–100
  advice: string;
}

export function evaluateGates(stats: ContestStats, rules: ContestRules): GateResult[] {
  const dd = rules.max_drawdown_pct;
  return [
    {
      key: "profit",
      label: "Profit target",
      current: `${stats.profit_pct.toFixed(2)}%`,
      required: `≥ ${rules.target_profit_pct}%`,
      passed: stats.profit_pct >= rules.target_profit_pct,
      progress: clamp01(stats.profit_pct / Math.max(rules.target_profit_pct, 0.0001)) * 100,
      advice: `Add ${Math.max(0, rules.target_profit_pct - stats.profit_pct).toFixed(2)}% more net profit.`,
    },
    {
      key: "drawdown",
      label: "Max drawdown",
      current: `${stats.drawdown_pct.toFixed(2)}%`,
      required: `≤ ${dd}%`,
      passed: stats.drawdown_pct <= dd,
      progress: clamp01(dd <= 0 ? 1 : 1 - stats.drawdown_pct / dd) * 100,
      advice:
        stats.drawdown_pct <= dd
          ? `You have ${(dd - stats.drawdown_pct).toFixed(2)}% of drawdown room left — protect it.`
          : "Drawdown breached. Cut size and rebuild — this gate fails the run.",
    },
    {
      key: "trades",
      label: "Minimum trades",
      current: `${stats.trades_count}`,
      required: `≥ ${rules.min_trades}`,
      passed: stats.trades_count >= rules.min_trades,
      progress: clamp01(stats.trades_count / Math.max(rules.min_trades, 1)) * 100,
      advice: `Take ${Math.max(0, rules.min_trades - stats.trades_count)} more qualifying trades.`,
    },
    {
      key: "days",
      label: "Active days",
      current: `${stats.active_days}`,
      required: `≥ ${rules.min_active_days}`,
      passed: stats.active_days >= rules.min_active_days,
      progress: clamp01(stats.active_days / Math.max(rules.min_active_days, 1)) * 100,
      advice: `Trade on ${Math.max(0, rules.min_active_days - stats.active_days)} more separate days.`,
    },
  ];
}

export function deriveStatus(
  stats: ContestStats,
  rules: ContestRules,
  ended: boolean,
): "in_progress" | "passed" | "failed" {
  if (stats.drawdown_pct > rules.max_drawdown_pct) return "failed";
  const gates = evaluateGates(stats, rules);
  if (gates.every((g) => g.passed)) return "passed";
  return ended ? "failed" : "in_progress";
}

export const DEFAULT_RULES: ContestRules = {
  entry_price_usd: 10,
  target_profit_pct: 8,
  max_drawdown_pct: 5,
  min_trades: 10,
  min_active_days: 3,
  fail_rate_pct: 78,
};
