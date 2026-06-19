import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { History, Loader2, ArrowRight, User, RotateCcw, MessageSquare, Undo2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { clearBtaxRateCache } from "@/lib/btax";

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
  reason: string | null;
  rolled_back_from: string | null;
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

const ROLLBACKABLE = new Set(["btax_to_naira_rate","btax_transfer_fee_percent","btax_daily_transfer_cap","p2p_min_transfer","btax_price","stock","is_active"]);

export function BtaxRulesHistory() {
  const [rows, setRows] = useState<Row[]>([]);
  const [users, setUsers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<"all" | "settings" | "marketplace_item">("all");
  const [field, setField] = useState<string>("all");
  const [itemId, setItemId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [rollback, setRollback] = useState<Row | null>(null);
  const [rollbackReason, setRollbackReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("btax_rules_audit").select("*")
      .order("changed_at", { ascending: false }).limit(200);
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

  const itemOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of rows) if (r.scope === "marketplace_item" && r.entity_id) seen.set(r.entity_id, r.entity_label || r.entity_id.slice(0, 8));
    return Array.from(seen.entries());
  }, [rows]);

  const fieldOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (scope === "all" || r.scope === scope) set.add(r.field);
    return Array.from(set);
  }, [rows, scope]);

  const filtered = rows.filter(r => {
    if (scope !== "all" && r.scope !== scope) return false;
    if (field !== "all" && r.field !== field) return false;
    if (itemId !== "all" && r.entity_id !== itemId) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${r.entity_label || ""} ${r.field} ${r.reason || ""} ${users[r.changed_by || ""] || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const doRollback = async () => {
    if (!rollback) return;
    setBusy(true);
    const { error } = await (supabase as any).rpc("rollback_btax_audit", {
      p_audit_id: rollback.id,
      p_reason: rollbackReason || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    clearBtaxRateCache();
    toast.success("Restored previous value");
    setRollback(null);
    setRollbackReason("");
    load();
  };

  return (
    <>
      <Card className="p-3">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <p className="text-[11px] font-semibold flex items-center gap-1.5"><History className="w-3 h-3 text-primary" /> Change history</p>
          <span className="text-[9px] text-muted-foreground font-mono">{filtered.length} / {rows.length}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-3">
          <Select value={scope} onValueChange={(v: any) => { setScope(v); setField("all"); if (v !== "marketplace_item") setItemId("all"); }}>
            <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All scopes</SelectItem>
              <SelectItem value="settings">Token rules</SelectItem>
              <SelectItem value="marketplace_item">Items</SelectItem>
            </SelectContent>
          </Select>
          <Select value={field} onValueChange={setField}>
            <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All fields</SelectItem>
              {fieldOptions.map(f => <SelectItem key={f} value={f}>{FIELD_LABELS[f] || f}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={itemId} onValueChange={setItemId} disabled={scope === "settings"}>
            <SelectTrigger className="h-7 text-[10px]"><SelectValue placeholder="Item" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All items</SelectItem>
              {itemOptions.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="h-7 text-[10px]" />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground py-4 justify-center">
            <Loader2 className="w-3 h-3 animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-4">No changes match the filter.</p>
        ) : (
          <div className="space-y-1.5 max-h-96 overflow-auto">
            {filtered.map(r => {
              const canRollback = ROLLBACKABLE.has(r.field) && r.old_value !== null && !r.rolled_back_from;
              return (
                <div key={r.id} className="p-2 rounded-md border border-border bg-card/40">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 capitalize">
                      {r.scope === "settings" ? "Rule" : "Item"}
                    </Badge>
                    {r.rolled_back_from && <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5"><Undo2 className="w-2 h-2 mr-0.5" />Rollback</Badge>}
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
                  {r.reason && (
                    <p className="text-[9px] text-muted-foreground italic mt-1 flex items-start gap-1">
                      <MessageSquare className="w-2.5 h-2.5 mt-0.5 shrink-0" /> {r.reason}
                    </p>
                  )}
                  {canRollback && (
                    <div className="flex justify-end mt-1">
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-[9px]" onClick={() => { setRollback(r); setRollbackReason(""); }}>
                        <RotateCcw className="w-2.5 h-2.5 mr-1" /> Restore previous
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Dialog open={!!rollback} onOpenChange={(v) => !v && setRollback(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <RotateCcw className="w-4 h-4 text-amber-400" /> Confirm rollback
            </DialogTitle>
          </DialogHeader>
          {rollback && (
            <div className="space-y-3 text-xs">
              <div className="p-2 rounded bg-muted/40 border border-border">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  {rollback.entity_label || FIELD_LABELS[rollback.field] || rollback.field}
                  {rollback.scope === "marketplace_item" && <> · {FIELD_LABELS[rollback.field] || rollback.field}</>}
                </p>
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive line-through">{rollback.new_value ?? "—"}</span>
                  <ArrowRight className="w-3 h-3" />
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">{rollback.old_value ?? "—"}</span>
                </div>
              </div>
              <Input value={rollbackReason} onChange={e => setRollbackReason(e.target.value)}
                placeholder="Reason for rollback (optional)" className="h-8 text-xs" maxLength={200} />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setRollback(null)}>Cancel</Button>
            <Button size="sm" disabled={busy} onClick={doRollback}>
              {busy ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RotateCcw className="w-3 h-3 mr-1" />}
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
