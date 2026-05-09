import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";

interface PaymentRow {
  id: string;
  payment_method: string;
  amount_usd: number;
  amount_local: number | null;
  local_currency: string | null;
  payment_status: string | null;
  transaction_id: string | null;
  created_at: string;
  completed_at: string | null;
}

const statusMeta: Record<string, { icon: any; label: string; cls: string }> = {
  completed: { icon: CheckCircle2, label: "Completed", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  pending:   { icon: Clock,        label: "Pending",   cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  failed:    { icon: XCircle,      label: "Failed",    cls: "bg-rose-500/15 text-rose-400 border-rose-500/30" },
};

export const PaymentHistoryPanel = ({ userId }: { userId: string | null }) => {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("payments")
        .select("id, payment_method, amount_usd, amount_local, local_currency, payment_status, transaction_id, created_at, completed_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!cancelled) {
        setRows((data || []) as PaymentRow[]);
        setLoading(false);
      }
    };
    load();
    const channel = supabase
      .channel(`payments-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments", filter: `user_id=eq.${userId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <Card className="border-border bg-card/60">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Receipt className="w-4 h-4 text-primary" /> Payment History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
            <Loader2 className="w-3 h-3 animate-spin" /> Loading transactions…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No transactions yet.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => {
              const meta = statusMeta[r.payment_status || "pending"] || statusMeta.pending;
              const Icon = meta.icon;
              const ts = r.completed_at || r.created_at;
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold capitalize text-foreground">
                        {r.payment_method.replace(/_/g, " ")}
                      </span>
                      <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${meta.cls}`}>
                        <Icon className="w-2.5 h-2.5 mr-0.5" />
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      {new Date(ts).toLocaleString()}
                      {r.transaction_id ? ` • ${r.transaction_id}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {r.amount_local && r.local_currency ? (
                      <p className="text-xs font-semibold text-foreground">
                        {r.local_currency === "NGN" ? "₦" : ""}
                        {Number(r.amount_local).toLocaleString()}
                      </p>
                    ) : (
                      <p className="text-xs font-semibold text-foreground">
                        ${Number(r.amount_usd).toFixed(2)}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
