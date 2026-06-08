import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Package, Loader2 } from "lucide-react";

interface Pkg {
  id?: string;
  tier_level: number;
  tier_name: string;
  account_size_naira: number;
  max_accounts: number;
  xp_required: number;
  profit_target_percent: number;
  max_drawdown_percent: number;
  daily_loss_limit_percent: number;
  profit_split_percent: number;
  payout_naira: number;
  rules_description: string | null;
  badge_icon: string | null;
  is_active: boolean;
}

const empty: Pkg = {
  tier_level: 1, tier_name: "", account_size_naira: 0, max_accounts: 1, xp_required: 0,
  profit_target_percent: 10, max_drawdown_percent: 5, daily_loss_limit_percent: 3,
  profit_split_percent: 80, payout_naira: 0, rules_description: "", badge_icon: "🏆", is_active: true,
};

export function AdminPackageManager() {
  const [rows, setRows] = useState<Pkg[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Pkg>(empty);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("xp_tier_config").select("*").order("tier_level");
    setRows((data || []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const startNew = () => {
    const nextLevel = (rows[rows.length - 1]?.tier_level ?? 0) + 1;
    setForm({ ...empty, tier_level: nextLevel });
    setOpen(true);
  };
  const startEdit = (r: Pkg) => { setForm({ ...r }); setOpen(true); };

  const save = async () => {
    if (!form.tier_name.trim() || form.account_size_naira <= 0) {
      toast.error("Name and size are required");
      return;
    }
    setSaving(true);
    const payload = { ...form, rules_description: form.rules_description || null };
    const res = form.id
      ? await supabase.from("xp_tier_config").update(payload).eq("id", form.id)
      : await supabase.from("xp_tier_config").insert(payload);
    setSaving(false);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(form.id ? "Package updated" : "Package uploaded");
    setOpen(false);
    load();
  };

  const remove = async (id?: string) => {
    if (!id) return;
    if (!confirm("Delete this package? Users won't be able to request it anymore.")) return;
    const { error } = await supabase.from("xp_tier_config").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <TabsContent value="packages" className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" /> Trading Packages
        </h3>
        <Button size="sm" onClick={startNew}><Plus className="w-4 h-4 mr-1" /> Upload package</Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Build the catalogue students see in their Portfolio. Each package's rules and payouts are shown
        to the user before they can request the account.
      </p>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : rows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <Package className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No packages yet. Upload your first one above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rows.map(r => (
            <Card key={r.id} className={`border-border ${!r.is_active && "opacity-60"}`}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg">{r.badge_icon || "🏆"}</span>
                      <p className="font-semibold text-sm">{r.tier_name}</p>
                      {!r.is_active && <span className="text-[9px] uppercase text-muted-foreground">hidden</span>}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      ₦{r.account_size_naira.toLocaleString()} • payout ₦{r.payout_naira.toLocaleString()} • split {r.profit_split_percent}%
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      target {r.profit_target_percent}% · max DD {r.max_drawdown_percent}% · daily {r.daily_loss_limit_percent}% · xp {r.xp_required}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => startEdit(r)}><Pencil className="w-3 h-3" /></Button>
                    <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => remove(r.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Edit package" : "Upload package"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Name</Label><Input value={form.tier_name} onChange={e => setForm({ ...form, tier_name: e.target.value })} /></div>
              <div><Label className="text-xs">Badge emoji</Label><Input value={form.badge_icon ?? ""} onChange={e => setForm({ ...form, badge_icon: e.target.value })} /></div>
              <div><Label className="text-xs">Tier level</Label><Input type="number" value={form.tier_level} onChange={e => setForm({ ...form, tier_level: +e.target.value })} /></div>
              <div><Label className="text-xs">Max accounts</Label><Input type="number" value={form.max_accounts} onChange={e => setForm({ ...form, max_accounts: +e.target.value })} /></div>
              <div><Label className="text-xs">Size (₦)</Label><Input type="number" value={form.account_size_naira} onChange={e => setForm({ ...form, account_size_naira: +e.target.value })} /></div>
              <div><Label className="text-xs">Payout (₦)</Label><Input type="number" value={form.payout_naira} onChange={e => setForm({ ...form, payout_naira: +e.target.value })} /></div>
              <div><Label className="text-xs">Profit split %</Label><Input type="number" value={form.profit_split_percent} onChange={e => setForm({ ...form, profit_split_percent: +e.target.value })} /></div>
              <div><Label className="text-xs">Profit target %</Label><Input type="number" value={form.profit_target_percent} onChange={e => setForm({ ...form, profit_target_percent: +e.target.value })} /></div>
              <div><Label className="text-xs">Max drawdown %</Label><Input type="number" value={form.max_drawdown_percent} onChange={e => setForm({ ...form, max_drawdown_percent: +e.target.value })} /></div>
              <div><Label className="text-xs">Daily loss %</Label><Input type="number" value={form.daily_loss_limit_percent} onChange={e => setForm({ ...form, daily_loss_limit_percent: +e.target.value })} /></div>
              <div><Label className="text-xs">XP required</Label><Input type="number" value={form.xp_required} onChange={e => setForm({ ...form, xp_required: +e.target.value })} /></div>
            </div>
            <div>
              <Label className="text-xs">Rules shown to user</Label>
              <Textarea rows={4} value={form.rules_description ?? ""} onChange={e => setForm({ ...form, rules_description: e.target.value })}
                placeholder="e.g. No weekend trades. Max 3 open positions. Hit profit target in 30 days." />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label className="text-xs">Visible to users</Label>
            </div>
            <Button className="w-full" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {form.id ? "Save changes" : "Upload package"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TabsContent>
  );
}
