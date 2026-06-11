// Admin Atlas — full command center. Per-country breakdown, full map with
// precise pins, live activity feed, user drill-down (handled in SnapchatMap).
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SnapchatMap } from "@/components/atlas/SnapchatMap";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Activity, Users, Wifi, Flame, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Country { country: string; country_code: string; total_users: number; online_now: number; trading_now: number; revenue: number }

export function AdminAtlasPanel() {
  const [stats, setStats] = useState<any>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [feed, setFeed] = useState<any[]>([]);
  const [filters, setFilters] = useState({ online: false, trading: false, inTrade: false });
  const [search, setSearch] = useState("");

  const load = async () => {
    const [{ data: s }, { data: c }] = await Promise.all([
      supabase.rpc("atlas_stats"),
      supabase.rpc("atlas_country_breakdown"),
    ]);
    setStats(s); setCountries((c as any) ?? []);
  };

  useEffect(() => {
    void load();
    const i = setInterval(load, 20_000);

    // Live feed: signups, prop trades, payments
    const ch = supabase.channel("admin-atlas-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, (p) =>
        setFeed(f => [{ id: crypto.randomUUID(), at: new Date().toISOString(), kind: "signup", text: `New signup: ${p.new.display_name ?? "User"}` }, ...f].slice(0, 40)))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "prop_trades" }, (p) =>
        setFeed(f => [{ id: crypto.randomUUID(), at: new Date().toISOString(), kind: "trade", text: `Trade opened: ${p.new.symbol} ${p.new.trade_type} (${p.new.lot_size} lots)` }, ...f].slice(0, 40)))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "payments" }, (p) =>
        setFeed(f => [{ id: crypto.randomUUID(), at: new Date().toISOString(), kind: "payment", text: `Payment ₦${Math.round(Number(p.new.amount)).toLocaleString()} · ${p.new.status}` }, ...f].slice(0, 40)))
      .subscribe();

    return () => { clearInterval(i); supabase.removeChannel(ch); };
  }, []);

  const exportCsv = () => {
    const header = "country,country_code,total_users,online_now,trading_now,revenue\n";
    const rows = countries.map(c => `"${c.country}",${c.country_code},${c.total_users},${c.online_now},${c.trading_now},${c.revenue}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `atlas-countries-${Date.now()}.csv`; a.click();
  };

  const filtered = countries.filter(c => !search || c.country?.toLowerCase().includes(search.toLowerCase()) || c.country_code?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Kpi icon={<Users className="w-3.5 h-3.5" />} label="Total users" value={stats?.total_users ?? 0} />
        <Kpi icon={<Wifi className="w-3.5 h-3.5" />} label="Online now" value={stats?.online_5m ?? 0} accent="text-green-300" />
        <Kpi icon={<Activity className="w-3.5 h-3.5" />} label="Trading 24h" value={stats?.trading_today ?? 0} accent="text-amber-300" />
        <Kpi icon={<Flame className="w-3.5 h-3.5" />} label="In a trade" value={stats?.in_trade_now ?? 0} accent="text-violet-300" />
        <Kpi icon={<Sparkles className="w-3.5 h-3.5" />} label="New today" value={stats?.new_today ?? 0} accent="text-sky-300" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map */}
        <Card className="lg:col-span-2 p-3 bg-card/60 border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex gap-1.5">
              <Chip active={!filters.online && !filters.trading && !filters.inTrade} onClick={() => setFilters({ online: false, trading: false, inTrade: false })}>All</Chip>
              <Chip active={filters.online} onClick={() => setFilters(f => ({ ...f, online: !f.online, trading: false, inTrade: false }))} dot="#22c55e">Online</Chip>
              <Chip active={filters.trading} onClick={() => setFilters(f => ({ online: false, trading: !f.trading, inTrade: false }))} dot="#fbbf24">Trading 24h</Chip>
              <Chip active={filters.inTrade} onClick={() => setFilters(f => ({ online: false, trading: false, inTrade: !f.inTrade }))} dot="#a78bfa">In trade</Chip>
            </div>
          </div>
          <div className="h-[480px]">
            <SnapchatMap admin filters={filters} />
          </div>
        </Card>

        {/* Live feed */}
        <Card className="p-3 bg-card/60 border-white/10">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Live activity</h3>
            <Badge variant="outline" className="text-[10px]">streaming</Badge>
          </div>
          <div className="h-[480px] overflow-y-auto space-y-1.5 pr-1">
            {feed.length === 0 && <div className="text-xs text-muted-foreground">Waiting for live events…</div>}
            {feed.map(e => (
              <div key={e.id} className="text-[11px] rounded-md border border-white/10 bg-white/5 px-2 py-1.5 flex items-start gap-2">
                <span className={"shrink-0 mt-1 w-1.5 h-1.5 rounded-full " + (e.kind === "signup" ? "bg-sky-400" : e.kind === "trade" ? "bg-amber-400" : "bg-green-400")} />
                <div className="flex-1 min-w-0">
                  <div className="truncate">{e.text}</div>
                  <div className="text-white/40 text-[10px]">{formatDistanceToNow(new Date(e.at), { addSuffix: true })}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Country breakdown */}
      <Card className="p-3 bg-card/60 border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold">Per-country breakdown</h3>
          <div className="flex gap-2">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search country" className="h-8 text-xs w-40" />
            <Button onClick={exportCsv} size="sm" variant="outline" className="h-8 text-xs"><Download className="w-3.5 h-3.5 mr-1" />CSV</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-white/55">
              <tr className="text-left border-b border-white/10">
                <th className="py-1.5 px-2">Country</th>
                <th className="py-1.5 px-2 text-right">Users</th>
                <th className="py-1.5 px-2 text-right">Online</th>
                <th className="py-1.5 px-2 text-right">In trade</th>
                <th className="py-1.5 px-2 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.country_code} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-1.5 px-2"><span className="mr-1">{flagEmoji(c.country_code)}</span>{c.country ?? c.country_code}</td>
                  <td className="py-1.5 px-2 text-right font-semibold">{c.total_users}</td>
                  <td className="py-1.5 px-2 text-right text-green-300">{c.online_now}</td>
                  <td className="py-1.5 px-2 text-right text-amber-300">{c.trading_now}</td>
                  <td className="py-1.5 px-2 text-right">₦{Math.round(c.revenue).toLocaleString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-white/50">No data yet</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Kpi({ icon, label, value, accent }: any) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-2.5">
      <div className="text-[10px] text-white/55 uppercase tracking-wider flex items-center gap-1">{icon}{label}</div>
      <div className={"mt-1 text-lg font-extrabold " + (accent ?? "text-white")}>{value}</div>
    </div>
  );
}

function Chip({ active, onClick, dot, children }: any) {
  return (
    <button onClick={onClick}
      className={"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border " +
        (active ? "bg-white text-black border-white" : "bg-white/5 text-white/80 border-white/15 hover:bg-white/10")}>
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />}{children}
    </button>
  );
}

function flagEmoji(cc?: string | null) {
  if (!cc || cc.length !== 2) return "🌍";
  return String.fromCodePoint(...cc.toUpperCase().split("").map(c => 0x1f1a5 + c.charCodeAt(0)));
}
