// Daily loss limit + max drawdown lockout, prop-firm style.
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Shield, ShieldAlert, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const RiskLockout = () => {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    starting_balance: 0,
    daily_loss_limit_pct: 5,
    max_drawdown_pct: 10,
    max_open_positions: 5,
    is_locked: false,
    daily_pnl: 0,
    lockout_reason: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase.from("risk_settings").select("*").eq("user_id", user.id).maybeSingle();
      if (data) setSettings(data as any);
      setLoading(false);
    };
    init();
  }, []);

  const save = async () => {
    if (!userId) return;
    const { error } = await supabase.from("risk_settings").upsert(
      { user_id: userId, ...settings },
      { onConflict: "user_id" }
    );
    if (error) return toast({ variant: "destructive", title: "Error", description: error.message });
    toast({ title: "Risk settings saved" });
  };

  const dailyLossLimit = (settings.starting_balance * settings.daily_loss_limit_pct) / 100;
  const lossUsed = Math.max(0, -settings.daily_pnl);
  const lossPct = dailyLossLimit > 0 ? Math.min(100, (lossUsed / dailyLossLimit) * 100) : 0;

  return (
    <Card className={`p-3 ${settings.is_locked ? "border-rose-500/50" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {settings.is_locked ? (
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
          ) : (
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
          )}
          <h3 className="text-xs font-bold">Risk Lockout</h3>
        </div>
        {settings.is_locked && (
          <span className="text-[9px] text-rose-500 flex items-center gap-1">
            <Lock className="w-3 h-3" /> LOCKED
          </span>
        )}
      </div>

      {/* Daily loss progress */}
      <div className="mb-2">
        <div className="flex justify-between text-[9px] mb-1">
          <span>Daily loss used</span>
          <span className="font-mono">${lossUsed.toFixed(2)} / ${dailyLossLimit.toFixed(2)}</span>
        </div>
        <Progress value={lossPct} className="h-1.5" />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <Label className="text-[9px]">Balance ($)</Label>
          <Input
            type="number"
            value={settings.starting_balance}
            onChange={(e) => setSettings({ ...settings, starting_balance: +e.target.value })}
            className="h-7 text-[10px]"
          />
        </div>
        <div>
          <Label className="text-[9px]">Daily loss %</Label>
          <Input
            type="number"
            value={settings.daily_loss_limit_pct}
            onChange={(e) => setSettings({ ...settings, daily_loss_limit_pct: +e.target.value })}
            className="h-7 text-[10px]"
          />
        </div>
        <div>
          <Label className="text-[9px]">Max DD %</Label>
          <Input
            type="number"
            value={settings.max_drawdown_pct}
            onChange={(e) => setSettings({ ...settings, max_drawdown_pct: +e.target.value })}
            className="h-7 text-[10px]"
          />
        </div>
        <div>
          <Label className="text-[9px]">Max positions</Label>
          <Input
            type="number"
            value={settings.max_open_positions}
            onChange={(e) => setSettings({ ...settings, max_open_positions: +e.target.value })}
            className="h-7 text-[10px]"
          />
        </div>
      </div>

      <div className="flex items-center justify-between mb-2 p-1.5 rounded bg-muted/20">
        <Label className="text-[10px]">Manual lock</Label>
        <Switch
          checked={settings.is_locked}
          onCheckedChange={(v) => setSettings({ ...settings, is_locked: v, lockout_reason: v ? "Manual" : "" })}
        />
      </div>

      <Button size="sm" className="w-full h-7 text-[10px]" onClick={save} disabled={loading}>
        Save Risk Rules
      </Button>
    </Card>
  );
};
