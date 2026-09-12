import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Copy, Eye, EyeOff, KeyRound, Server, ShieldCheck, ScrollText, Building2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Load a specific account */
  accountId?: string;
  /** Or load the account this user was given for a contest */
  contestId?: string;
  userId?: string;
}

interface Row {
  id: string;
  access_code: string | null;
  status: string;
  phase: string;
  account_balance: number;
  starting_balance: number;
  account_rules: string | null;
  admin_message: string | null;
  credentials_sent_at: string | null;
  mt5_broker: string | null;
  mt5_server: string | null;
  mt5_login: string | null;
  mt5_password: string | null;
  mt5_investor_password: string | null;
  prop_tiers?: { tier_name: string; badge_icon: string | null } | null;
}

const SELECT =
  "id,access_code,status,phase,account_balance,starting_balance,account_rules,admin_message,credentials_sent_at,mt5_broker,mt5_server,mt5_login,mt5_password,mt5_investor_password,prop_tiers(tier_name,badge_icon)";

function Field({
  icon: Icon,
  label,
  value,
  secret = false,
}: {
  icon: any;
  label: string;
  value: string | null;
  secret?: boolean;
}) {
  const [shown, setShown] = useState(false);
  if (!value) return null;
  const display = secret && !shown ? "•".repeat(Math.min(12, value.length)) : value;
  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/30">
      <div className="min-w-0">
        <p className="text-[9px] text-muted-foreground flex items-center gap-1">
          <Icon className="w-3 h-3" /> {label}
        </p>
        <p className="text-xs font-mono font-semibold truncate">{display}</p>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        {secret && (
          <Button
            size="icon"
            variant="ghost"
            className="w-7 h-7"
            aria-label={shown ? "Hide" : "Show"}
            onClick={() => setShown((s) => !s)}
          >
            {shown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="w-7 h-7"
          aria-label={`Copy ${label}`}
          onClick={() => {
            navigator.clipboard.writeText(value);
            toast.success(`${label} copied`);
          }}
        >
          <Copy className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function AccountAccessDialog({ open, onOpenChange, accountId, contestId, userId }: Props) {
  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    (async () => {
      let q = supabase.from("user_prop_accounts").select(SELECT as any);
      if (accountId) q = q.eq("id", accountId);
      else if (contestId && userId) q = q.eq("contest_id", contestId).eq("user_id", userId);
      const { data } = await q.limit(1).maybeSingle();
      if (!alive) return;
      setRow((data as any) ?? null);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [open, accountId, contestId, userId]);

  const hasCreds = !!(row?.mt5_login || row?.mt5_server || row?.mt5_password);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[360px] sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <span className="text-xl">{row?.prop_tiers?.badge_icon || "🏆"}</span>
            {row?.prop_tiers?.tier_name || "Account details"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !row ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            No account has been issued to you here yet. Once an admin assigns one, the rules and login details appear
            in this window.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[9px] capitalize">
                {row.phase}
              </Badge>
              <Badge
                variant={row.status === "active" ? "default" : row.status === "passed" ? "secondary" : "destructive"}
                className="text-[9px] capitalize"
              >
                {row.status}
              </Badge>
              {row.credentials_sent_at && (
                <span className="text-[9px] text-muted-foreground">
                  Details sent {new Date(row.credentials_sent_at).toLocaleDateString()}
                </span>
              )}
            </div>

            {row.admin_message && (
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                <p className="text-[9px] uppercase tracking-wider text-primary mb-1">Message from admin</p>
                <p className="text-xs whitespace-pre-line">{row.admin_message}</p>
              </div>
            )}

            {hasCreds ? (
              <div className="space-y-2">
                <Field icon={Building2} label="Broker" value={row.mt5_broker} />
                <Field icon={Server} label="MT5 server" value={row.mt5_server} />
                <Field icon={KeyRound} label="Login" value={row.mt5_login} />
                <Field icon={ShieldCheck} label="Password" value={row.mt5_password} secret />
                <Field icon={Eye} label="Investor password" value={row.mt5_investor_password} secret />
                <Field icon={KeyRound} label="Access code" value={row.access_code} />
              </div>
            ) : (
              <div className="p-3 rounded-lg border border-dashed border-border text-[11px] text-muted-foreground text-center">
                Your login details haven't been sent yet. An admin will add the server, login and password here.
              </div>
            )}

            {row.account_rules && (
              <div className="p-3 rounded-lg border border-border bg-card/60">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                  <ScrollText className="w-3 h-3" /> Account rules
                </p>
                <p className="text-xs whitespace-pre-line">{row.account_rules}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
