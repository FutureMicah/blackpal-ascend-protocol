// Horizontal rail of currently-online traders, Kick.com style.
// Bright green LIVE ring around the avatar, name underneath, scrollable row.
// Fully data-driven from `user_locations` + `profiles` with realtime updates.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LiveTrader {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export const LiveTraderRail = () => {
  const [live, setLive] = useState<LiveTrader[]>([]);

  const load = async () => {
    const since = new Date(Date.now() - 5 * 60_000).toISOString();
    const { data: locs } = await supabase
      .from("user_locations")
      .select("user_id, last_seen_at, is_online")
      .gte("last_seen_at", since)
      .order("last_seen_at", { ascending: false })
      .limit(24);
    const ids = (locs ?? []).map((l: any) => l.user_id);
    if (!ids.length) { setLive([]); return; }
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", ids);
    const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
    setLive(
      ids
        .map((id) => map.get(id))
        .filter(Boolean)
        .map((p: any) => ({ user_id: p.id, display_name: p.display_name, avatar_url: p.avatar_url }))
    );
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("live-rail")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_locations" }, () => load())
      .subscribe();
    const id = setInterval(load, 30_000);
    return () => { supabase.removeChannel(ch); clearInterval(id); };
  }, []);

  if (!live.length) {
    return (
      <div className="mb-3 text-[10px] text-white/50 px-1">No traders online right now — be the first.</div>
    );
  }

  return (
    <div className="-mx-3 sm:mx-0 mb-3">
      <div className="flex gap-3 overflow-x-auto px-3 pb-2 scrollbar-none snap-x">
        {live.map((t) => (
          <button
            key={t.user_id}
            className="group flex flex-col items-center gap-1 shrink-0 snap-start"
            title={t.display_name ?? "Trader"}
          >
            <div className="relative">
              {/* LIVE badge */}
              <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-10
                bg-[#53fc18] text-black text-[7px] font-extrabold tracking-wider px-1.5 py-[1px] rounded-md uppercase
                shadow-[0_0_8px_rgba(83,252,24,0.6)]">
                LIVE
              </span>
              <span className="block p-[2px] rounded-full bg-[#53fc18] shadow-[0_0_14px_rgba(83,252,24,0.55)]">
                <span className="block w-14 h-14 rounded-full overflow-hidden bg-black ring-2 ring-black">
                  {t.avatar_url ? (
                    <img src={t.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-full h-full grid place-items-center text-white text-sm font-bold">
                      {(t.display_name ?? "?").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </span>
              </span>
            </div>
            <span className="text-[10px] text-white/90 max-w-[64px] truncate">
              {(t.display_name ?? "Trader").split(" ")[0]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
