// Public Trader Atlas — Snapchat-map experience for every signed-in user.
// Header counts (Online / Trading today / In trade now), filter chips,
// privacy quick-toggle, and a fit-to-screen live map.
import { useEffect, useState } from "react";
import { SnapchatMap } from "@/components/atlas/SnapchatMap";
import { LiveTraderRail } from "@/components/atlas/LiveTraderRail";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, MapPin, Crosshair, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Precision = "country" | "precise" | "ghost";

export default function Atlas() {
  const [online, setOnline] = useState(false);
  const [trading, setTrading] = useState(false);
  const [inTrade, setInTrade] = useState(false);
  const [counts, setCounts] = useState({ total: 0, online: 0, trading: 0, inTrade: 0 });
  const [stats, setStats] = useState<any>(null);
  const [precision, setPrecision] = useState<Precision>("country");
  const [savingPriv, setSavingPriv] = useState(false);

  const loadStats = async () => {
    const { data } = await supabase.rpc("atlas_stats");
    setStats(data);
  };

  const loadPrivacy = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase
      .from("user_locations")
      .select("share_precision")
      .eq("user_id", u.user.id)
      .maybeSingle();
    if (data?.share_precision) setPrecision(data.share_precision as Precision);
  };

  useEffect(() => {
    void loadStats();
    void loadPrivacy();
    const t = setInterval(loadStats, 30_000);
    return () => clearInterval(t);
  }, []);

  const updatePrivacy = async (p: Precision) => {
    setSavingPriv(true);
    const prev = precision;
    setPrecision(p);
    const { error } = await supabase.rpc("set_my_location_privacy", { p_precision: p });
    setSavingPriv(false);
    if (error) {
      setPrecision(prev);
      toast.error("Could not update privacy");
    } else {
      toast.success(p === "ghost" ? "Ghost mode on — you're invisible on the atlas" : p === "precise" ? "Sharing precise location" : "Showing country only");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#05060a] text-white">
      <div className="px-3 sm:px-5 pt-3 pb-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight">Trader Atlas</h1>
            <p className="text-[10px] sm:text-xs text-white/55">Live map of every BLACKPAL trader.</p>
          </div>
          <div className="flex items-center gap-2">
            <EnergyModeToggle compact />
            <PrivacyDropdown value={precision} saving={savingPriv} onChange={updatePrivacy} />
          </div>
        </div>

        {/* KPI strip */}
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          <Kpi label="Users" value={stats?.total_users ?? counts.total} />
          <Kpi label="Online" value={stats?.online_5m ?? counts.online} accent="green" />
          <Kpi label="Trading 24h" value={stats?.trading_today ?? counts.trading} accent="amber" />
          <Kpi label="In trade" value={stats?.in_trade_now ?? counts.inTrade} accent="violet" />
        </div>

        {/* Filter chips */}
        <div className="mt-2 flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1">
          <Chip active={!online && !trading && !inTrade} onClick={() => { setOnline(false); setTrading(false); setInTrade(false); }}>All</Chip>
          <Chip active={online} onClick={() => setOnline(v => !v)} dot="#22c55e">Online</Chip>
          <Chip active={trading} onClick={() => setTrading(v => !v)} dot="#fbbf24">Trading today</Chip>
          <Chip active={inTrade} onClick={() => setInTrade(v => !v)} dot="#a78bfa">In a trade</Chip>
        </div>

        <div className="mt-2"><LiveTraderRail /></div>
      </div>

      {/* Map fills viewport */}
      <div className="px-3 sm:px-5 pb-3">
        <div className="h-[calc(100dvh-260px)] min-h-[380px]">
          <SnapchatMap
            filters={{ online, trading, inTrade }}
            onCountsChange={setCounts}
          />
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: number | string; accent?: "green" | "amber" | "violet" }) {
  const color =
    accent === "green" ? "text-green-300" :
    accent === "amber" ? "text-amber-300" :
    accent === "violet" ? "text-violet-300" : "text-white";
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-2">
      <div className={"text-base font-extrabold leading-none " + color}>{value ?? 0}</div>
      <div className="text-[9px] text-white/55 uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}

function Chip({ active, onClick, dot, children }: any) {
  return (
    <button onClick={onClick}
      className={"shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border transition " +
        (active ? "bg-white text-black border-white" : "bg-white/5 text-white/80 border-white/15 hover:bg-white/10")}>
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />}
      {children}
    </button>
  );
}

function PrivacyDropdown({ value, saving, onChange }: { value: Precision; saving: boolean; onChange: (p: Precision) => void }) {
  const cycle: Precision = value === "country" ? "precise" : value === "precise" ? "ghost" : "country";
  const icon = value === "ghost" ? <EyeOff className="w-3.5 h-3.5" /> : value === "precise" ? <Crosshair className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />;
  const label = value === "ghost" ? "Ghost" : value === "precise" ? "Precise" : "Country";
  return (
    <Button onClick={() => onChange(cycle)} disabled={saving} variant="outline" size="sm"
      className="h-8 text-[11px] bg-white/5 border-white/15 text-white hover:bg-white/10">
      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
      <span className="ml-1">{label}</span>
    </Button>
  );
}
