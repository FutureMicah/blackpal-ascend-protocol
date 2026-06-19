import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Loader2, ArrowRight, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Row {
  id: string;
  scope: string;
  entity_id: string | null;
  entity_label: string | null;
  field: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_at: string;
}

const FIELD_LABELS: Record<string, string> = {
  btax_to_naira_rate: "₦/BTAX rate",
  btax_transfer_fee_percent: "Transfer fee %",
  btax_daily_transfer_cap: "Daily cap",
  p2p_min_transfer: "Min transfer",
  btax_price: "Price",
  stock: "Stock",
  is_active: "Active",
  created: "Created",
  deleted: "Deleted",
};

export function BtaxRulesHistory() {
  const [rows, setRows] = useState<Row[]>([]);
  const [users, setUsers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "settings" | "marketplace_item">("all");

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("btax_rules_audit").select("*")
      .order("changed_at", { ascending: false }).limit(100);
    const list = (data || []) as Row[];
    setRows(list);
    const ids = Array.from(new Set(list.map(r => r.changed_by).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,display_name,email").in("id", ids);
      const map: Record<string, string> = {};
      for (const p of (profs || []) as any[]) map[p.id] = p.display_name || p.email || p.id.slice(0, 8);
      setUsers(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("btax-rules-audit")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "btax_rules_audit" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = filter === "all" ? rows : rows.filter(r => r.scope === filter);

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold flex items-center gap-1.5"><History className="w-3 h-3 text-primary" /> Change history</p>
        <div className="flex items-center gap-1">
          {(["all","settings","marketplace_item"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-[9px] px-2 py-0.5 rounded-full border ${filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-card/60 border-border text-muted-foreground"}`}>
              {f === "all" ? "All" : f === "settings" ? "Rules" : "Items"}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground py-4 justify-center">
          <Loader2 className="w-3 h-3 animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-[10px] text-muted-foreground text-center py-4">No changes recorded yet.</p>
      ) : (
        <div className="space-y-1.5 max-h-80 overflow-auto">
          {filtered.map(r => (
            <div key={r.id} className="p-2 rounded-md border border-border bg-card/40">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 capitalize">
                  {r.scope === "settings" ? "Rule" : "Item"}
                </Badge>
                <p className="text-[10px] font-semibold truncate flex-1">
                  {r.entity_label || FIELD_LABELS[r.field] || r.field}
                  {r.entity_label && r.scope === "marketplace_item" && (
                    <span className="text-muted-foreground font-normal"> · {FIELD_LABELS[r.field] || r.field}</span>
                  )}
                </p>
                <span className="text-[9px] text-muted-foreground font-mono shrink-0">
                  {formatDistanceToNow(new Date(r.changed_at), { addSuffix: true })}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono">
                <span className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive line-through max-w-[80px] truncate">
                  {r.old_value ?? "—"}
                </span>
                <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 max-w-[80px] truncate">
                  {r.new_value ?? "—"}
                </span>
                <span className="ml-auto flex items-center gap-1 text-[9px] text-muted-foreground">
                  <User className="w-2.5 h-2.5" />
                  {r.changed_by ? (users[r.changed_by] || r.changed_by.slice(0, 8)) : "system"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
