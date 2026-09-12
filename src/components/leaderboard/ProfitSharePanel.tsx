import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Coins, HandCoins, Crown, Clock, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PropAccountLadder } from "@/components/PropAccountLadder";

interface ShareRow {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  tier_name: string | null;
  badge_icon: string | null;
  total_pnl: number;
  account_balance: number;
  profit_split_percent: number;
  trader_share: number;
  platform_share: number;
}

interface PayoutRow {
  id: string;
  requested_balance: number;
  student_payout: number;
  company_share: number;
  status: string;
  admin_note: string | null;
  created_at: string;
}

const money = (n: number) =>
  `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const statusIcon = (s: string) =>
  s === "approved" ? (
    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
  ) : s === "rejected" ? (
    <XCircle className="w-3 h-3 text-destructive" />
  ) : (
    <Clock className="w-3 h-3 text-amber-500" />
  );

export const ProfitSharePanel = ({ userId }: { userId: string }) => {
  const [rows, setRows] = useState<ShareRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: lb }, { data: pr }] = await Promise.all([
        (supabase.rpc as any)("profit_share_leaderboard", { p_limit: 50 }),
        supabase
          .from("prop_payout_requests")
          .select("id,requested_balance,student_payout,company_share,status,admin_note,created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      if (!alive) return;
      setRows(((lb ?? []) as ShareRow[]).map((r) => ({ ...r, total_pnl: Number(r.total_pnl) })));
      setPayouts((pr ?? []) as PayoutRow[]);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PropAccountLadder userId={userId} />

      <Card className="p-3 neon-border">
        <h2 className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground flex items-center gap-1.5 mb-2">
          <Coins className="w-3.5 h-3.5 text-primary" /> Profit share ranking
        </h2>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No realized profit yet. Close winning trades to appear here.
          </p>
        ) : (
          <ol className="space-y-2">
            {rows.map((r, i) => {
              const traderPct = Number(r.profit_split_percent) || 80;
              return (
                <li
                  key={r.user_id + i}
                  className={`rounded-xl border border-border/60 bg-card/40 p-2.5 ${
                    r.user_id === userId ? "ring-1 ring-primary" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 flex justify-center shrink-0">
                      {i === 0 ? (
                        <Crown className="h-4 w-4 text-amber-500" />
                      ) : (
                        <span className="text-[10px] font-bold text-muted-foreground">#{i + 1}</span>
                      )}
                    </div>
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={r.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {r.display_name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold truncate">{r.display_name}</span>
                        {r.user_id === userId && (
                          <Badge variant="secondary" className="text-[7px] px-1 py-0 h-3.5">
                            You
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {r.badge_icon ?? "🏆"} {r.tier_name ?? "Account"} · {traderPct}% yours
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div
                        className={`text-sm font-bold ${
                          r.total_pnl >= 0 ? "text-emerald-500" : "text-destructive"
                        }`}
                      >
                        {money(r.total_pnl)}
                      </div>
                      <div className="text-[8px] text-muted-foreground">realized</div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Progress value={traderPct} className="h-1.5" />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>You keep {money(r.trader_share)}</span>
                      <span>Platform {money(r.platform_share)}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      <Card className="p-3">
        <h2 className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground flex items-center gap-1.5 mb-2">
          <HandCoins className="w-3.5 h-3.5 text-primary" /> Your payout requests
        </h2>
        {payouts.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">
            No requests yet. Reach an account goal above, then request your cash-out.
          </p>
        ) : (
          <ul className="space-y-2">
            {payouts.map((p) => (
              <li
                key={p.id}
                className="rounded-xl border border-border/60 bg-card/40 p-2.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold flex items-center gap-1.5">
                    {statusIcon(p.status)}
                    <span className="capitalize">{p.status}</span>
                    <span className="text-muted-foreground font-normal">
                      · {new Date(p.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                    Balance {money(p.requested_balance)} · platform {money(p.company_share)}
                    {p.admin_note ? ` · ${p.admin_note}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-primary">{money(p.student_payout)}</div>
                  <div className="text-[8px] text-muted-foreground">your share</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};
