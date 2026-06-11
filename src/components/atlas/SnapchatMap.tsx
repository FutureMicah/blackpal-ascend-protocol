// Snapchat-style Trader Atlas map.
// Dark Carto basemap, circular avatar markers with online/trading rings,
// clustering on zoom-out, click → mini profile drawer.
// Streams updates via Supabase Realtime on `user_locations`.
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

export interface AtlasUser {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  country: string | null;
  country_code: string | null;
  latitude: number | null;
  longitude: number | null;
  is_online: boolean;
  is_trading: boolean;
  last_seen_at: string | null;
  last_trade_at?: string | null;
  email?: string | null;
  city?: string | null;
  total_payments?: number;
  open_positions?: number;
}

function avatarDivIcon(u: AtlasUser, size = 44) {
  const ring = u.is_trading ? "#fbbf24" : u.is_online ? "#22c55e" : "rgba(255,255,255,0.35)";
  const glow = u.is_trading ? "0 0 14px rgba(251,191,36,0.85)" : u.is_online ? "0 0 10px rgba(34,197,94,0.7)" : "none";
  const initial = (u.display_name ?? "?").slice(0, 1).toUpperCase();
  const img = u.avatar_url
    ? `<img src="${u.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />`
    : `<div style="display:grid;place-items:center;width:100%;height:100%;font-weight:700;color:#fff">${initial}</div>`;
  const pulse = u.is_trading
    ? `<span style="position:absolute;inset:-6px;border-radius:50%;border:2px solid #fbbf24;opacity:.55;animation:atlas-ping 1.6s ease-out infinite"></span>`
    : "";
  return L.divIcon({
    className: "atlas-avatar-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="position:relative;width:${size}px;height:${size}px">
      ${pulse}
      <div style="width:100%;height:100%;border-radius:50%;padding:2px;background:${ring};box-shadow:${glow}">
        <div style="width:100%;height:100%;border-radius:50%;overflow:hidden;background:#0a0a0a;border:2px solid #000">
          ${img}
        </div>
      </div>
    </div>`,
  });
}

function FitOnce({ users }: { users: AtlasUser[] }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !users.length) return;
    const pts = users.filter(u => u.latitude && u.longitude).map(u => [u.latitude!, u.longitude!] as [number, number]);
    if (pts.length) {
      map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 4 });
      done.current = true;
    }
  }, [users, map]);
  return null;
}

interface Props {
  /** If true, the map will use atlas_admin_users (precise) and show admin actions. */
  admin?: boolean;
  /** Optional initial filters. */
  filters?: { online: boolean; trading: boolean; inTrade: boolean };
  /** Notify parent of stats changes for header counts. */
  onCountsChange?: (counts: { total: number; online: number; trading: number; inTrade: number }) => void;
  className?: string;
}

export function SnapchatMap({ admin = false, filters, onCountsChange, className }: Props) {
  const [users, setUsers] = useState<AtlasUser[]>([]);
  const [selected, setSelected] = useState<AtlasUser | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    if (admin) {
      const { data } = await supabase.rpc("atlas_admin_users", {
        p_filter: filters?.inTrade ? "in_trade" : filters?.trading ? "trading" : filters?.online ? "online" : "all",
        p_limit: 1000,
      });
      setUsers((data as any) ?? []);
    } else {
      const { data } = await supabase.rpc("atlas_public_users", {
        p_only_online: !!filters?.online,
        p_only_trading: !!filters?.trading || !!filters?.inTrade,
        p_limit: 800,
      });
      setUsers((data as any) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [admin, filters?.online, filters?.trading, filters?.inTrade]);

  // Realtime: any change to user_locations triggers a debounced reload
  useEffect(() => {
    let t: any = null;
    const ch = supabase
      .channel("atlas-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_locations" }, () => {
        clearTimeout(t); t = setTimeout(() => void load(), 600);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin]);

  useEffect(() => {
    onCountsChange?.({
      total: users.length,
      online: users.filter(u => u.is_online).length,
      trading: users.filter(u => u.last_trade_at && new Date(u.last_trade_at).getTime() > Date.now() - 86400_000).length,
      inTrade: users.filter(u => u.is_trading).length,
    });
  }, [users, onCountsChange]);

  const markers = useMemo(() => users.filter(u => u.latitude != null && u.longitude != null), [users]);

  return (
    <div className={"relative w-full h-full rounded-xl overflow-hidden border border-white/10 " + (className ?? "")}>
      <style>{`@keyframes atlas-ping{0%{transform:scale(1);opacity:.6}80%{transform:scale(1.8);opacity:0}100%{transform:scale(1.8);opacity:0}}
        .leaflet-container{background:#05060a}
        .marker-cluster div{background:rgba(251,191,36,0.85)!important;color:#000!important;font-weight:800}
        .marker-cluster{background:rgba(251,191,36,0.25)!important}`}</style>
      <MapContainer
        center={[15, 10]}
        zoom={2}
        minZoom={2}
        worldCopyJump
        scrollWheelZoom
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains={["a", "b", "c", "d"]}
        />
        <FitOnce users={markers} />
        <MarkerClusterGroup chunkedLoading maxClusterRadius={45} showCoverageOnHover={false}>
          {markers.map((u) => (
            <Marker
              key={u.user_id}
              position={[u.latitude!, u.longitude!]}
              icon={avatarDivIcon(u)}
              eventHandlers={{ click: () => setSelected(u) }}
            />
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      {loading && (
        <div className="absolute top-2 right-2 z-[1000] rounded-full bg-black/70 border border-white/15 px-2.5 py-1 text-[10px] text-white/80 backdrop-blur">
          Syncing…
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-[92vw] sm:w-[420px] bg-black/90 border-white/10 text-white">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="text-white flex items-center gap-3">
                  <span className="w-12 h-12 rounded-full overflow-hidden border border-white/15 bg-black grid place-items-center">
                    {selected.avatar_url ? (
                      <img src={selected.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold">{(selected.display_name ?? "?").slice(0, 1).toUpperCase()}</span>
                    )}
                  </span>
                  <span className="flex-1 min-w-0">
                    <div className="truncate text-base">{selected.display_name ?? "Trader"}</div>
                    <div className="text-[11px] text-white/60 truncate">
                      {selected.city ? `${selected.city}, ` : ""}{selected.country ?? "—"}
                    </div>
                  </span>
                </SheetTitle>
              </SheetHeader>

              <div className="mt-4 flex flex-wrap gap-2">
                {selected.is_online && <Badge className="bg-green-500/20 text-green-300 border-green-500/30">Online</Badge>}
                {selected.is_trading && <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">In a trade</Badge>}
                {selected.last_trade_at && new Date(selected.last_trade_at).getTime() > Date.now() - 86400_000 && (
                  <Badge variant="outline" className="border-white/20 text-white/70">Traded today</Badge>
                )}
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-3 text-[12px]">
                <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                  <dt className="text-white/50">Last seen</dt>
                  <dd className="font-semibold mt-0.5">
                    {selected.last_seen_at ? formatDistanceToNow(new Date(selected.last_seen_at), { addSuffix: true }) : "—"}
                  </dd>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                  <dt className="text-white/50">Last trade</dt>
                  <dd className="font-semibold mt-0.5">
                    {selected.last_trade_at ? formatDistanceToNow(new Date(selected.last_trade_at), { addSuffix: true }) : "—"}
                  </dd>
                </div>
                {admin && (
                  <>
                    <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                      <dt className="text-white/50">Open positions</dt>
                      <dd className="font-semibold mt-0.5">{selected.open_positions ?? 0}</dd>
                    </div>
                    <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                      <dt className="text-white/50">Total paid</dt>
                      <dd className="font-semibold mt-0.5">₦{Math.round(selected.total_payments ?? 0).toLocaleString()}</dd>
                    </div>
                    <div className="col-span-2 rounded-lg bg-white/5 border border-white/10 p-3">
                      <dt className="text-white/50">Email</dt>
                      <dd className="font-semibold mt-0.5 break-all">{selected.email ?? "—"}</dd>
                    </div>
                  </>
                )}
              </dl>

              <div className="mt-5 flex gap-2">
                <Button asChild className="flex-1" variant="secondary">
                  <Link to={`/profile/${selected.user_id}`}>View profile</Link>
                </Button>
                {admin && <AdminQuickActions userId={selected.user_id} />}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function AdminQuickActions({ userId }: { userId: string }) {
  const [busy, setBusy] = useState(false);
  const ping = async () => {
    setBusy(true);
    try {
      await supabase.from("in_app_notifications").insert({
        user_id: userId,
        title: "Admin ping",
        message: "An admin pinged you from the Trader Atlas.",
        type: "info",
        icon: "📡",
      });
    } finally { setBusy(false); }
  };
  return (
    <Button onClick={ping} disabled={busy} className="flex-1 bg-amber-500 text-black hover:bg-amber-400">
      {busy ? "Sending…" : "Ping user"}
    </Button>
  );
}
