// Trader Atlas — redesigned.
// 3D view: photoreal earth in deep space (image 1 weather aesthetic) with glass rail overlays.
// 2D view: Snap-Map / Apple-Maps hybrid with avatar bubble markers and floating cards (images 2 & 3).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Globe2,
  Map as MapIcon,
  MapPin,
  Users,
  Loader2,
  Crosshair,
  Search,
  Layers,
  Thermometer,
  Droplets,
  Wind,
  Sparkles,
} from "lucide-react";
import { FloatingNav } from "@/components/FloatingNav";
import { TraderGlobe } from "@/components/TraderGlobe";
import { supabase } from "@/integrations/supabase/client";
import { captureUserLocation } from "@/lib/location-tracker";
import { useToast } from "@/hooks/use-toast";

interface Trader {
  user_id: string;
  country: string | null;
  country_code: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  is_online: boolean | null;
  last_seen_at: string;
  display_name?: string | null;
  avatar_url?: string | null;
  xp?: number | null;
}

function FlyTo({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  const lastFlown = useRef<[number, number] | null>(null);
  useEffect(() => {
    if (!pos) return;
    // Skip near-duplicate updates (< ~50m) to avoid jitter from GPS noise
    const prev = lastFlown.current;
    if (prev) {
      const dLat = Math.abs(prev[0] - pos[0]);
      const dLng = Math.abs(prev[1] - pos[1]);
      if (dLat < 0.0005 && dLng < 0.0005) return;
    }
    lastFlown.current = pos;
    map.flyTo(pos, 6, { duration: 1.5 });
  }, [pos, map]);
  return null;
}

function avatarIcon(t: Trader) {
  const initials = (t.display_name || "?").slice(0, 1).toUpperCase();
  const ring = t.is_online ? "#22c55e" : "#a855f7";
  const img = t.avatar_url
    ? `<img src="${t.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:9999px;" onerror="this.style.display='none'"/>`
    : `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:linear-gradient(135deg,#7c3aed,#3b82f6);color:#fff;font-weight:700;font-size:14px;border-radius:9999px;">${initials}</div>`;
  const label = t.display_name
    ? `<div style="position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);background:rgba(15,15,20,0.85);color:#fff;padding:2px 8px;border-radius:9999px;font-size:9px;font-weight:600;white-space:nowrap;backdrop-filter:blur(8px);">${t.display_name.split(" ")[0]}</div>`
    : "";
  return L.divIcon({
    className: "trader-avatar-marker",
    html: `<div style="position:relative;width:42px;height:42px;border-radius:9999px;border:3px solid ${ring};box-shadow:0 6px 16px rgba(0,0,0,0.35);overflow:visible;background:#0f0f14;"><div style="width:100%;height:100%;border-radius:9999px;overflow:hidden;">${img}</div>${label}</div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
}

function youIcon() {
  return L.divIcon({
    className: "you-marker",
    html: `<div style="position:relative;"><div style="width:18px;height:18px;border-radius:9999px;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 0 6px rgba(59,130,246,0.25);"></div></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

const WorldMap = () => {
  const { toast } = useToast();
  const [view, setView] = useState<"globe" | "map">("globe");
  const [traders, setTraders] = useState<Trader[]>([]);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [myPos, setMyPos] = useState<[number, number] | null>(null);
  const [topCountries, setTopCountries] = useState<{ country: string; count: number }[]>([]);
  const [search, setSearch] = useState("");

  // Debounced GPS setter — coalesces rapid location updates so the globe/map
  // doesn't re-render on every GPS sample.
  const gpsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setMyPosDebounced = useCallback((next: [number, number]) => {
    if (gpsTimer.current) clearTimeout(gpsTimer.current);
    gpsTimer.current = setTimeout(() => {
      setMyPos((prev) => {
        if (prev) {
          const dLat = Math.abs(prev[0] - next[0]);
          const dLng = Math.abs(prev[1] - next[1]);
          if (dLat < 0.0005 && dLng < 0.0005) return prev;
        }
        return next;
      });
    }, 350);
  }, []);

  const enrichProfiles = useCallback(async (list: Trader[]) => {
    if (!list.length) return;
    setEnrichError(null);
    setEnriching(true);
    try {
      const ids = list.map((t) => t.user_id);
      const { data: profs, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, xp")
        .in("id", ids);
      if (error) throw error;
      const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      setTraders((curr) =>
        curr.map((t) => {
          const p = profMap.get(t.user_id) as any;
          return p
            ? { ...t, display_name: p.display_name, avatar_url: p.avatar_url, xp: p.xp }
            : t;
        })
      );
    } catch (e: any) {
      setEnrichError("Couldn't load trader profiles. Names and avatars may be missing.");
    } finally {
      setEnriching(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const loc = await captureUserLocation({ askGPS: false });
      if (loc?.latitude && loc?.longitude) setMyPosDebounced([loc.latitude, loc.longitude]);

      const { data } = await supabase
        .from("user_locations")
        .select("user_id, country, country_code, city, latitude, longitude, is_online, last_seen_at")
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      const list = (data ?? []) as Trader[];
      setTraders(list);
      setLoading(false);

      const counts: Record<string, number> = {};
      list.forEach((t) => {
        if (t.country) counts[t.country] = (counts[t.country] || 0) + 1;
      });
      setTopCountries(
        Object.entries(counts)
          .map(([country, count]) => ({ country, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      );

      enrichProfiles(list);
    };
    init();

    const ch = supabase
      .channel("locations-stream")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_locations" }, () => init())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
      if (gpsTimer.current) clearTimeout(gpsTimer.current);
    };
  }, [enrichProfiles, setMyPosDebounced]);

  const requestPreciseLocation = async () => {
    toast({ title: "Requesting precise location", description: "Allow access in your browser." });
    const loc = await captureUserLocation({ askGPS: true });
    if (loc?.latitude && loc?.longitude) {
      setMyPosDebounced([loc.latitude, loc.longitude]);
      toast({ title: "Pinned!", description: "Your precise location is now on the map." });
    } else {
      toast({ variant: "destructive", title: "Location denied", description: "Using IP-based location instead." });
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return traders;
    return traders.filter(
      (t) =>
        t.display_name?.toLowerCase().includes(q) ||
        t.country?.toLowerCase().includes(q) ||
        t.city?.toLowerCase().includes(q)
    );
  }, [search, traders]);

  const nearbyTop = useMemo(
    () =>
      [...traders]
        .filter((t) => t.is_online)
        .sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0))
        .slice(0, 8),
    [traders]
  );

  return (
    <div className="min-h-screen bg-background">
      <FloatingNav />
      <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-16 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Trader Atlas
            </h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Live world map of every BlackPal trader
            </p>
          </div>
          <div className="flex gap-1 bg-muted/30 p-1 rounded-full">
            <Button
              size="sm"
              variant={view === "globe" ? "default" : "ghost"}
              className="h-7 text-[10px] px-3 rounded-full"
              onClick={() => setView("globe")}
            >
              <Globe2 className="w-3 h-3 mr-1" />
              3D
            </Button>
            <Button
              size="sm"
              variant={view === "map" ? "default" : "ghost"}
              className="h-7 text-[10px] px-3 rounded-full"
              onClick={() => setView("map")}
            >
              <MapIcon className="w-3 h-3 mr-1" />
              2D
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Card className="p-2 text-center">
            <Users className="w-3 h-3 mx-auto text-primary mb-0.5" />
            <p className="text-base font-bold">{traders.length}</p>
            <p className="text-[9px] text-muted-foreground">Traders</p>
          </Card>
          <Card className="p-2 text-center">
            <MapPin className="w-3 h-3 mx-auto text-amber-500 mb-0.5" />
            <p className="text-base font-bold">{topCountries.length}</p>
            <p className="text-[9px] text-muted-foreground">Countries</p>
          </Card>
          <Card className="p-2 text-center">
            <div className="w-2 h-2 mx-auto rounded-full bg-green-500 animate-pulse mb-1" />
            <p className="text-base font-bold">{traders.filter((t) => t.is_online).length}</p>
            <p className="text-[9px] text-muted-foreground">Online now</p>
          </Card>
        </div>

        {/* Map area */}
        <Card className="relative overflow-hidden h-[60vh] sm:h-[68vh] mb-3 rounded-3xl border-white/10 shadow-2xl">
          {loading ? (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-[#1a1530] to-[#05060c]"
              role="status"
              aria-live="polite"
              aria-busy="true"
              aria-label="Locating traders"
            >
              <Loader2 className="w-7 h-7 animate-spin text-primary" aria-hidden="true" />
              <p className="text-[10px] text-white/60 uppercase tracking-widest">
                Locating traders…
              </p>
              {/* Skeleton "pins" */}
              <div className="flex gap-2 mt-2" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-9 h-9 rounded-full bg-white/10 animate-pulse"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>
            </div>
          ) : view === "globe" ? (
            <div className="relative w-full h-full" style={{ background: "radial-gradient(ellipse at center, #1a1530 0%, #05060c 70%)" }}>
              <TraderGlobe traders={filtered} />

              {enriching && (
                <div
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                  className="absolute top-3 left-1/2 -translate-x-1/2 z-[1001] flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-xl border border-white/15 px-3 py-1.5 text-[10px] text-white/90"
                >
                  <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                  Loading trader profiles…
                </div>
              )}

              {enrichError && !enriching && (
                <div
                  role="alert"
                  className="absolute top-3 left-1/2 -translate-x-1/2 z-[1001] flex items-center gap-2 rounded-full bg-destructive/90 text-destructive-foreground backdrop-blur-xl border border-white/15 px-3 py-1.5 text-[10px]"
                >
                  <span>{enrichError}</span>
                  <button
                    type="button"
                    autoFocus
                    onClick={() => enrichProfiles(traders)}
                    className="px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-white/90"
                    aria-label="Retry loading trader profiles"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Left glass icon rail (image 1 aesthetic) */}
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-[1000]">
                {[Wind, Thermometer, Droplets, Layers].map((Icon, i) => (
                  <button
                    key={i}
                    className="w-10 h-10 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/80 hover:bg-black/60 transition"
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>

              {/* Top-left info chip */}
              <div className="absolute top-3 left-3 z-[1000] rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 px-3 py-2 text-white">
                <p className="text-[9px] uppercase tracking-widest text-white/60">Live</p>
                <p className="text-sm font-semibold">
                  {filtered.filter((t) => t.is_online).length} online
                </p>
              </div>

              {/* Top-right action buttons */}
              <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
                <button
                  onClick={requestPreciseLocation}
                  className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-black/70"
                  aria-label="Pin me"
                >
                  <Crosshair className="w-4 h-4" />
                </button>
                <button className="w-10 h-10 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-lg shadow-amber-400/30">
                  <Layers className="w-4 h-4" />
                </button>
              </div>

              {/* Bottom day-pill scroller (decorative filter) */}
              <div className="absolute left-0 right-0 bottom-3 z-[1000] flex justify-center">
                <div className="flex gap-1.5 px-2 py-1.5 rounded-full bg-black/45 backdrop-blur-xl border border-white/10">
                  {["Today", "Week", "Month", "Quarter", "Year", "All"].map((d, i) => (
                    <button
                      key={d}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-semibold transition ${
                        i === 0 ? "bg-white text-black" : "text-white/70 hover:text-white"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full">
              {enriching && (
                <div
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                  className="absolute top-16 left-1/2 -translate-x-1/2 z-[1001] flex items-center gap-2 rounded-full bg-white/95 backdrop-blur-xl border border-white/40 shadow px-3 py-1.5 text-[10px] text-foreground"
                >
                  <Loader2 className="w-3 h-3 animate-spin text-primary" aria-hidden="true" />
                  Loading trader profiles…
                </div>
              )}
              {enrichError && !enriching && (
                <div
                  role="alert"
                  className="absolute top-16 left-1/2 -translate-x-1/2 z-[1001] flex items-center gap-2 rounded-full bg-destructive text-destructive-foreground shadow px-3 py-1.5 text-[10px]"
                >
                  <span>{enrichError}</span>
                  <button
                    onClick={() => enrichProfiles(traders)}
                    className="px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 font-semibold"
                    aria-label="Retry loading trader profiles"
                  >
                    Retry
                  </button>
                </div>
              )}
              <MapContainer
                center={myPos ?? [20, 0]}
                zoom={3}
                minZoom={2}
                maxZoom={18}
                scrollWheelZoom
                style={{ height: "100%", width: "100%", background: "#dbeafe" }}
                worldCopyJump
                zoomControl={false}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  attribution="&copy; OpenStreetMap &copy; CARTO"
                />
                <FlyTo pos={myPos} />
                {filtered.map((t) => (
                  <Marker key={t.user_id} position={[t.latitude!, t.longitude!]} icon={avatarIcon(t)}>
                    <Popup>
                      <div className="text-xs">
                        <p className="font-bold">{t.display_name ?? "Trader"}</p>
                        <p className="text-muted-foreground">
                          {t.city ?? "—"}, {t.country ?? "—"}
                        </p>
                        {t.xp != null && <p className="text-amber-600 font-mono">{t.xp} XP</p>}
                      </div>
                    </Popup>
                    <Tooltip direction="top" offset={[0, -22]} opacity={0.9}>
                      {t.display_name ?? "Trader"}
                    </Tooltip>
                  </Marker>
                ))}
                {myPos && <Marker position={myPos} icon={youIcon()} />}
              </MapContainer>

              {/* Floating top search bar (image 3) */}
              <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center gap-2 bg-white/95 backdrop-blur-xl rounded-full shadow-lg px-3 py-2 border border-white/40">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search traders, cities, countries…"
                  className="border-0 h-7 px-0 text-xs bg-transparent focus-visible:ring-0 shadow-none"
                />
                <button
                  onClick={requestPreciseLocation}
                  className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0"
                  aria-label="Pin me"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Bottom sheet — Nearby Top Users (image 3) */}
              <div className="absolute bottom-3 left-3 right-3 z-[1000] rounded-2xl bg-white/95 backdrop-blur-xl border border-white/40 shadow-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Nearby Top Users</p>
                    <p className="text-xs font-bold text-foreground">
                      {filtered[0]?.city ?? filtered[0]?.country ?? "Worldwide"}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[9px]">
                    {nearbyTop.length} live
                  </Badge>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {nearbyTop.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground py-2">No traders online right now.</p>
                  ) : (
                    nearbyTop.map((t) => (
                      <div
                        key={t.user_id}
                        className="shrink-0 flex flex-col items-center gap-1 w-14"
                        title={t.display_name ?? "Trader"}
                      >
                        <div className="relative">
                          <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-primary bg-muted">
                            {t.avatar_url ? (
                              <img src={t.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                                {(t.display_name ?? "?").slice(0, 1).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
                        </div>
                        <p className="text-[9px] font-semibold truncate w-full text-center text-foreground">
                          {t.display_name?.split(" ")[0] ?? "—"}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Top countries */}
        <Card className="p-3">
          <h2 className="text-xs font-bold mb-2">Top Countries</h2>
          {topCountries.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">No traders pinned yet.</p>
          ) : (
            <div className="space-y-1.5">
              {topCountries.map((c, i) => (
                <div
                  key={c.country}
                  className="flex items-center gap-2 p-1.5 rounded-md bg-muted/20"
                >
                  <Badge variant="outline" className="h-5 w-5 p-0 flex items-center justify-center text-[9px]">
                    {i + 1}
                  </Badge>
                  <p className="flex-1 text-[11px] font-medium truncate">{c.country}</p>
                  <p className="text-[10px] text-primary font-mono">{c.count}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default WorldMap;
