import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, Target, HandCoins, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Tier {
  id: string;
  tier_name: string;
  account_size: number;
  payout_target_balance: number;
  student_payout: number;
  activation_naira: number;
  ladder_order: number | null;
  badge_icon: string | null;
  description: string | null;
}

interface AcctRow {
  id: string;
  tier_id: string;
  account_balance: number;
  status: string;
}

interface Props {
  userId: string;
}

export const PropAccountLadder = ({ userId }: Props) => {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [accounts, setAccounts] = useState<AcctRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: t }, { data: a }] = await Promise.all([
        supabase.from("prop_tiers").select("*").eq("is_active", true).order("ladder_order"),
        supabase.from("user_prop_accounts").select("id,tier_id,account_balance,status").eq("user_id", userId),
      ]);
      if (!alive) return;
      setTiers((t ?? []) as Tier[]);
      setAccounts((a ?? []) as AcctRow[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [userId]);

  const requestPayout = async (acctId: string) => {
    setRequesting(acctId);
    const { error } = await supabase.rpc("request_prop_payout", { p_account_id: acctId });
    setRequesting(null);
    if (error) {
      toast({ variant: "destructive", title: "Cannot request cash-out", description: error.message });
    } else {
      toast({ title: "Cash-out requested", description: "An admin will review your request shortly." });
    }
  };

  if (loading) {
    return <div className="frost-card p-6 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>;
  }

  return (
    <div className="frost-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[11px] font-semibold tracking-[0.18em] uppercase text-ink-soft">
            Practice-account ladder
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Grow each account to its goal, then request a cash-out. Admin approval required.
          </p>
        </div>
        <Link to="/terms" className="text-[10px] uppercase tracking-wider text-primary hover:underline">
          Rules
        </Link>
      </div>

      <ol className="space-y-2">
        {tiers.map((tier) => {
          const acct = accounts.find((a) => a.tier_id === tier.id);
          const balance = Number(acct?.account_balance ?? 0);
          const goal = Number(tier.payout_target_balance);
          const start = Number(tier.account_size);
          const span = Math.max(goal - start, 1);
          const pct = Math.min(100, Math.max(0, ((balance - start) / span) * 100));
          const goalReached = acct && balance >= goal;
          return (
            <li
              key={tier.id}
              className="rounded-xl border border-border/60 bg-card/40 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{tier.badge_icon ?? "🏆"}</span>
                    <span className="text-sm font-semibold truncate">{tier.tier_name}</span>
                    {tier.activation_naira > 0 && (
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                        ${tier.activation_naira} top-up
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Start ${start.toLocaleString()} · Goal ${goal.toLocaleString()} · You keep ${tier.student_payout.toLocaleString()}
                  </p>
                </div>
                {acct ? (
                  <Button
                    size="sm"
                    variant={goalReached ? "default" : "outline"}
                    disabled={!goalReached || requesting === acct.id}
                    onClick={() => requestPayout(acct.id)}
                    className="h-8 text-[11px] gap-1"
                  >
                    {requesting === acct.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : goalReached ? (
                      <HandCoins className="w-3 h-3" />
                    ) : (
                      <Target className="w-3 h-3" />
                    )}
                    {goalReached ? "Request cash-out" : "Keep going"}
                  </Button>
                ) : (
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Locked
                  </span>
                )}
              </div>
              {acct && (
                <div className="mt-2">
                  <Progress value={pct} className="h-1.5" />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>${balance.toLocaleString()}</span>
                    <span>{Math.round(pct)}% to goal</span>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1">
        <Trophy className="w-3 h-3" /> XP rules were reset — every member starts from 0 and builds up gradually.
      </div>
    </div>
  );
};
