import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Loader2 } from "lucide-react";

export const GatePassSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rowId, setRowId] = useState<string | null>(null);
  const [usd, setUsd] = useState("2.00");
  const [rate, setRate] = useState("1500.00");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("academy_settings")
        .select("id, gate_pass_usd, usd_to_ngn_rate")
        .limit(1)
        .single();
      if (!error && data) {
        setRowId(data.id);
        setUsd(String(data.gate_pass_usd ?? "2.00"));
        setRate(String(data.usd_to_ngn_rate ?? "1500.00"));
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    if (!rowId) return;
    const usdNum = Number(usd);
    const rateNum = Number(rate);
    if (!isFinite(usdNum) || usdNum <= 0 || !isFinite(rateNum) || rateNum <= 0) {
      toast({ title: "Invalid values", description: "Both fields must be positive numbers.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("academy_settings")
      .update({ gate_pass_usd: usdNum, usd_to_ngn_rate: rateNum })
      .eq("id", rowId);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Settings saved",
      description: `Gate pass is now $${usdNum.toFixed(2)} ≈ ₦${(usdNum * rateNum).toLocaleString()}.`,
    });
  };

  const naira = Number(usd || 0) * Number(rate || 0);

  return (
    <Card className="border-border bg-card/80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <DollarSign className="w-4 h-4 text-primary" /> Gate Pass & FX Rate
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <Label className="text-[11px]">Gate Pass (USD)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={usd}
                onChange={(e) => setUsd(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">USD → NGN rate</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-2 text-[11px]">
              Charge per Paystack transaction:{" "}
              <span className="font-semibold text-foreground">
                ₦{isFinite(naira) ? Math.round(naira).toLocaleString() : "—"}
              </span>
            </div>
            <Button size="sm" onClick={save} disabled={saving} className="w-full h-8 text-xs">
              {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} Save
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
