import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Save, Plus, Trophy } from "lucide-react";
import { toast } from "sonner";

interface Contest {
  id: string;
  title: string;
  description: string | null;
  rules: string | null;
  prize_btax: number;
  entry_price_usd: number;
  target_profit_pct: number;
  max_drawdown_pct: number;
  min_trades: number;
  min_active_days: number;
  fail_rate_pct: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

/** Local datetime value for <input type="datetime-local">. */
const toLocal = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);

export function AdminContestPanel() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [recomputing, setRecomputing] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("contests")
      .select(
        "id,title,description,rules,prize_btax,entry_price_usd,target_profit_pct,max_drawdown_pct,min_trades,min_active_days,fail_rate_pct,starts_at,ends_at,is_active",
      )
      .order("entry_price_usd", { ascending: true });
    if (error) toast.error("Could not load contests");
    setContests((data as Contest[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patch = (id: string, field: keyof Contest, value: unknown) =>
    setContests((cs) => cs.map((c) => (c.id === id ? { ...c, [field]: value } : c)));

  const save = async (c: Contest) => {
    setSavingId(c.id);
    const { id, ...fields } = c;
    const { error } = await supabase.from("contests").update(fields).eq("id", id);
    setSavingId(null);
    if (error) toast.error("Save failed — check your admin permissions");
    else toast.success(`Saved "${c.title}"`);
  };

  const create = async () => {
    const { error } = await supabase.from("contests").insert({
      title: "New contest",
      entry_price_usd: 10,
      prize_btax: 1000,
      target_profit_pct: 10,
      max_drawdown_pct: 5,
      min_trades: 5,
      min_active_days: 3,
      fail_rate_pct: 78,
      is_active: false,
    });
    if (error) toast.error("Could not create contest");
    else {
      toast.success("Contest created — it stays hidden until you switch it live");
      load();
    }
  };

  const recompute = async (contestId?: string) => {
    setRecomputing(contestId ?? "all");
    const { data, error } = await supabase.functions.invoke("contest-recompute", {
      body: contestId ? { contest_id: contestId } : {},
    });
    setRecomputing(null);
    if (error) toast.error("Recompute failed");
    else toast.success(contestId ? "Scores and ranks refreshed" : `Recomputed ${data?.entries ?? 0} entries`);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading contests…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          Edit prizes, targets and dates. Scoring always runs on the server.
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => recompute()}>
            {recomputing === "all" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Recompute all
              </>
            )}
          </Button>
          <Button size="sm" className="h-8 text-[11px]" onClick={create}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New
          </Button>
        </div>
      </div>

      {contests.length === 0 && (
        <Card className="p-6 text-center text-xs text-muted-foreground">No contests yet.</Card>
      )}

      {contests.map((c) => (
        <Card key={c.id} className="p-3 space-y-3 neon-border">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Trophy className="w-4 h-4 text-primary shrink-0" />
              <Input
                className="h-8 text-xs font-bold"
                value={c.title}
                onChange={(e) => patch(c.id, "title", e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={c.is_active ? "default" : "secondary"} className="text-[9px]">
                {c.is_active ? "live" : "hidden"}
              </Badge>
              <Switch checked={c.is_active} onCheckedChange={(v) => patch(c.id, "is_active", v)} />
            </div>
          </div>

          <Textarea
            className="text-[11px] min-h-[52px]"
            placeholder="Short description shown on the card"
            value={c.description ?? ""}
            onChange={(e) => patch(c.id, "description", e.target.value)}
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(
              [
                ["Entry ($)", "entry_price_usd"],
                ["Prize (BTAX)", "prize_btax"],
                ["Target profit %", "target_profit_pct"],
                ["Max drawdown %", "max_drawdown_pct"],
                ["Min trades", "min_trades"],
                ["Min active days", "min_active_days"],
                ["Fail rate %", "fail_rate_pct"],
              ] as [string, keyof Contest][]
            ).map(([label, field]) => (
              <div key={field} className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">{label}</Label>
                <Input
                  type="number"
                  className="h-8 text-[11px]"
                  value={String(c[field] ?? 0)}
                  onChange={(e) => patch(c.id, field, Number(e.target.value))}
                />
              </div>
            ))}
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Starts</Label>
              <Input
                type="datetime-local"
                className="h-8 text-[11px]"
                value={toLocal(c.starts_at)}
                onChange={(e) => patch(c.id, "starts_at", fromLocal(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Ends</Label>
              <Input
                type="datetime-local"
                className="h-8 text-[11px]"
                value={toLocal(c.ends_at)}
                onChange={(e) => patch(c.id, "ends_at", fromLocal(e.target.value))}
              />
            </div>
          </div>

          <Textarea
            className="text-[11px] min-h-[52px]"
            placeholder="House rules (shown under the card)"
            value={c.rules ?? ""}
            onChange={(e) => patch(c.id, "rules", e.target.value)}
          />

          <div className="flex gap-2">
            <Button size="sm" className="h-8 flex-1 text-[11px]" onClick={() => save(c)} disabled={savingId === c.id}>
              {savingId === c.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-1" /> Save
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-[11px]"
              onClick={() => recompute(c.id)}
              disabled={recomputing === c.id}
            >
              {recomputing === c.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Recompute
                </>
              )}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
