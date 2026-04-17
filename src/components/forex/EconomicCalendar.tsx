// Economic calendar — curated upcoming high-impact events.
// Users can subscribe to alerts (stored in news_alerts table).
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Bell, BellOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EconEvent {
  id: string;
  event_name: string;
  currency: string;
  impact: "low" | "medium" | "high";
  event_time: string;
}

// Generate this week's typical events (rotating). In prod, replace with API.
function generateThisWeek(): EconEvent[] {
  const now = new Date();
  const events: EconEvent[] = [];
  const templates: Omit<EconEvent, "id" | "event_time">[] = [
    { event_name: "Non-Farm Payrolls", currency: "USD", impact: "high" },
    { event_name: "FOMC Meeting Minutes", currency: "USD", impact: "high" },
    { event_name: "CPI YoY", currency: "USD", impact: "high" },
    { event_name: "ECB Interest Rate", currency: "EUR", impact: "high" },
    { event_name: "BoE Rate Decision", currency: "GBP", impact: "high" },
    { event_name: "Retail Sales m/m", currency: "USD", impact: "medium" },
    { event_name: "Unemployment Rate", currency: "EUR", impact: "medium" },
    { event_name: "GDP q/q", currency: "GBP", impact: "high" },
    { event_name: "PMI Manufacturing", currency: "USD", impact: "medium" },
    { event_name: "BoJ Statement", currency: "JPY", impact: "high" },
  ];
  templates.forEach((t, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() + (i % 7));
    d.setHours(8 + (i % 12), (i * 15) % 60, 0, 0);
    events.push({ ...t, id: `evt-${i}`, event_time: d.toISOString() });
  });
  return events.sort((a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime());
}

export const EconomicCalendar = () => {
  const { toast } = useToast();
  const [events] = useState<EconEvent[]>(() => generateThisWeek());
  const [subscribed, setSubscribed] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "high" | "medium">("all");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase.from("news_alerts").select("event_name, event_time").eq("user_id", user.id);
      const keys = new Set((data ?? []).map((d) => `${d.event_name}-${d.event_time}`));
      setSubscribed(keys);
    };
    init();
  }, []);

  const toggle = async (e: EconEvent) => {
    if (!userId) return toast({ variant: "destructive", title: "Sign in" });
    const key = `${e.event_name}-${e.event_time}`;
    if (subscribed.has(key)) {
      await supabase.from("news_alerts").delete().eq("user_id", userId).eq("event_name", e.event_name).eq("event_time", e.event_time);
      subscribed.delete(key);
      toast({ title: "Alert removed" });
    } else {
      const { error } = await supabase.from("news_alerts").insert({
        user_id: userId,
        event_name: e.event_name,
        currency: e.currency,
        impact: e.impact,
        event_time: e.event_time,
      });
      if (error) return toast({ variant: "destructive", title: "Error", description: error.message });
      subscribed.add(key);
      toast({ title: `Alerted 15min before ${e.event_name}` });
    }
    setSubscribed(new Set(subscribed));
  };

  const filtered = events.filter((e) => filter === "all" || e.impact === filter);
  const impactColor = (i: string) =>
    i === "high" ? "bg-rose-500" : i === "medium" ? "bg-amber-500" : "bg-emerald-500";

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 text-primary" />
          <h3 className="text-xs font-bold">Economic Calendar</h3>
        </div>
        <div className="flex gap-0.5 bg-muted/30 p-0.5 rounded">
          {(["all", "high", "medium"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[8px] px-1.5 py-0.5 rounded ${filter === f ? "bg-primary text-primary-foreground" : ""}`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1 max-h-72 overflow-y-auto">
        {filtered.map((e) => {
          const key = `${e.event_name}-${e.event_time}`;
          const sub = subscribed.has(key);
          const dt = new Date(e.event_time);
          return (
            <div key={e.id} className="flex items-center gap-2 p-1.5 rounded bg-muted/20">
              <div className={`w-1 h-8 rounded ${impactColor(e.impact)}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold truncate">{e.event_name}</p>
                <p className="text-[8px] text-muted-foreground font-mono">
                  {dt.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} · {dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <Badge variant="outline" className="text-[8px] h-4 px-1">{e.currency}</Badge>
              <Button
                size="icon"
                variant={sub ? "default" : "ghost"}
                className="h-6 w-6"
                onClick={() => toggle(e)}
              >
                {sub ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
