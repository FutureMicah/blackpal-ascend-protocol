import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { BellRing } from "lucide-react";
import { toast } from "sonner";

interface Prefs {
  in_app_enabled: boolean;
  email_enabled: boolean;
  score_updates: boolean;
  ending_soon_minutes: number;
}

const DEFAULTS: Prefs = {
  in_app_enabled: true,
  email_enabled: false,
  score_updates: true,
  ending_soon_minutes: 60,
};

export function ContestReminderPrefs({ userId }: { userId: string }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("contest_reminder_prefs")
        .select("in_app_enabled,email_enabled,score_updates,ending_soon_minutes")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) setPrefs(data as Prefs);
      setReady(true);
    })();
  }, [userId]);

  const save = async (next: Prefs) => {
    setPrefs(next);
    const { error } = await supabase
      .from("contest_reminder_prefs")
      .upsert({ user_id: userId, ...next }, { onConflict: "user_id" });
    if (error) toast.error("Could not save reminder settings");
  };

  if (!ready) return null;

  return (
    <Card className="p-3 space-y-2.5 neon-border ascend-reveal">
      <div className="flex items-center gap-1.5">
        <BellRing className="w-4 h-4 text-primary orbit-3d" />
        <span className="text-xs font-bold neon-text">Contest reminders</span>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="ct-inapp" className="text-[11px]">In-app alerts</Label>
        <Switch
          id="ct-inapp"
          checked={prefs.in_app_enabled}
          onCheckedChange={(v) => save({ ...prefs, in_app_enabled: v })}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="ct-email" className="text-[11px]">Email alerts</Label>
        <Switch
          id="ct-email"
          checked={prefs.email_enabled}
          onCheckedChange={(v) => save({ ...prefs, email_enabled: v })}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="ct-score" className="text-[11px]">Notify on score change</Label>
        <Switch
          id="ct-score"
          checked={prefs.score_updates}
          onCheckedChange={(v) => save({ ...prefs, score_updates: v })}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="ct-mins" className="text-[11px]">Warn me before a contest ends (min)</Label>
        <Input
          id="ct-mins"
          type="number"
          min={5}
          max={1440}
          className="h-7 w-20 text-[11px]"
          value={prefs.ending_soon_minutes}
          onChange={(e) =>
            setPrefs({ ...prefs, ending_soon_minutes: Number(e.target.value) })
          }
          onBlur={() =>
            save({
              ...prefs,
              ending_soon_minutes: Math.min(1440, Math.max(5, prefs.ending_soon_minutes || 60)),
            })
          }
        />
      </div>
    </Card>
  );
}
