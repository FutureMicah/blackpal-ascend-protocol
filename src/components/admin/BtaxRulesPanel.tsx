import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Coins, Package, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { clearBtaxRateCache } from "@/lib/btax";

interface Settings {
  id?: string;
  btax_to_naira_rate: number;
  btax_transfer_fee_percent: number;
  btax_daily_transfer_cap: number;
  p2p_min_transfer: number;
}
interface Item {
  id: string;
  name: string;
  category: string;
  btax_price: number;
  stock: number | null;
  is_active: boolean;
}

export function BtaxRulesPanel() {
  const [s, setS] = useState<Settings | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Item>>({});

  const load = async () => {
    setLoading(true);
    const [sRes, iRes] = await Promise.all([
      supabase.from("academy_settings").select("*").limit(1).maybeSingle(),
      (supabase as any).from("marketplace_items").select("id,name,category,btax_price,stock,is_active").order("category").order("sort_order"),
    ]);
    if (sRes.data) {
      const d = sRes.data as any;
      setS({
        id: d.id,
        btax_to_naira_rate: Number(d.btax_to_naira_rate ?? 100),
        btax_transfer_fee_percent: Number(d.btax_transfer_fee_percent ?? 1),
        btax_daily_transfer_cap: Number(d.btax_daily_transfer_cap ?? 50000),
        p2p_min_transfer: Number(d.p2p_min_transfer ?? 1),
      });
    }
    setItems((iRes.data || []) as Item[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveSettings = async () => {
    if (!s?.id) return;
    setSaving(true);
    const { error } = await (supabase as any).from("academy_settings").update({
      btax_to_naira_rate: s.btax_to_naira_rate,
      btax_transfer_fee_percent: s.btax_transfer_fee_percent,
      btax_daily_transfer_cap: s.btax_daily_transfer_cap,
      p2p_min_transfer: s.p2p_min_transfer,
    }).eq("id", s.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    clearBtaxRateCache();
    toast.success("BTAX rules updated");
  };

  const startEdit = (it: Item) => { setEditing(it.id); setDraft({ btax_price: it.btax_price, stock: it.stock, is_active: it.is_active }); };
  const saveItem = async (id: string) => {
    const { error } = await (supabase as any).from("marketplace_items").update(draft).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Item updated");
    setEditing(null);
    load();
  };

  if (loading || !s) {
    return <div className="flex items-center gap-2 text-xs text-muted-foreground p-3"><Loader2 className="w-3 h-3 animate-spin" /> Loading BTAX rules…</div>;
  }

  return (
    <div className="space-y-4">
      <Card className="p-3 border-primary/20">
        <p className="text-[11px] font-semibold flex items-center gap-1.5 mb-3"><Coins className="w-3 h-3 text-primary" /> Token rules</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="₦ per BTAX">
            <Input type="number" step="0.01" value={s.btax_to_naira_rate}
              onChange={e => setS({ ...s, btax_to_naira_rate: Number(e.target.value) })} className="h-8 text-xs" />
          </Field>
          <Field label="Transfer fee %">
            <Input type="number" step="0.1" value={s.btax_transfer_fee_percent}
              onChange={e => setS({ ...s, btax_transfer_fee_percent: Number(e.target.value) })} className="h-8 text-xs" />
          </Field>
          <Field label="Daily transfer cap">
            <Input type="number" value={s.btax_daily_transfer_cap}
              onChange={e => setS({ ...s, btax_daily_transfer_cap: Number(e.target.value) })} className="h-8 text-xs" />
          </Field>
          <Field label="Min transfer">
            <Input type="number" value={s.p2p_min_transfer}
              onChange={e => setS({ ...s, p2p_min_transfer: Number(e.target.value) })} className="h-8 text-xs" />
          </Field>
        </div>
        <Button size="sm" className="mt-3 h-8 text-xs w-full" disabled={saving} onClick={saveSettings}>
          {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />} Save rules
        </Button>
      </Card>

      <Card className="p-3">
        <p className="text-[11px] font-semibold flex items-center gap-1.5 mb-3"><Package className="w-3 h-3 text-emerald-400" /> Marketplace items ({items.length})</p>
        <div className="space-y-1.5 max-h-72 overflow-auto">
          {items.map(it => {
            const isEdit = editing === it.id;
            return (
              <div key={it.id} className="flex items-center gap-2 p-2 rounded-md border border-border bg-card/40">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold truncate">{it.name}</p>
                  <Badge variant="outline" className="text-[8px] capitalize px-1 py-0 h-3.5">{it.category}</Badge>
                </div>
                {isEdit ? (
                  <>
                    <Input type="number" value={draft.btax_price ?? 0} onChange={e => setDraft({ ...draft, btax_price: Number(e.target.value) })} className="h-7 text-[10px] w-20" placeholder="BTAX" />
                    <Input type="number" value={draft.stock ?? ""} onChange={e => setDraft({ ...draft, stock: e.target.value === "" ? null : Number(e.target.value) })} className="h-7 text-[10px] w-16" placeholder="Stock" />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveItem(it.id)}><Check className="w-3 h-3 text-emerald-500" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(null)}><X className="w-3 h-3" /></Button>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] font-mono w-16 text-right">{it.btax_price} BTAX</span>
                    <span className="text-[9px] text-muted-foreground w-12 text-right">{it.stock ?? "∞"}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(it)}><Pencil className="w-3 h-3" /></Button>
                  </>
                )}
              </div>
            );
          })}
          {items.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-4">No marketplace items.</p>}
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
