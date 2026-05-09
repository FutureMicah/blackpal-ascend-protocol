// Trader Atlas — redesigned.
// 3D view: photoreal earth in deep space (image 1 weather aesthetic) with glass rail overlays.
// 2D view: Snap-Map / Apple-Maps hybrid with avatar bubble markers and floating cards (images 2 & 3).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Globe2,
  Map as MapIcon,
  MapPin,
  Users,
  Loader2,
  Crosshair,
  Search,
  Sparkles,
} from "lucide-react";
import { FloatingNav } from "@/components/FloatingNav";
import { AtlasGlobe, type AtlasStyleId, type AtlasProjection } from "@/components/atlas/AtlasGlobe";
import { RealtimeVerifier as RealtimeVerifierLazy } from "@/components/RealtimeVerifier";
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

// (Leaflet helpers removed — AtlasGlobe handles markers, fly-to, and sanitization internally.)

const WorldMap = () => {
  const { toast } = useToast();
  const [projection, setProjection] = useState<AtlasProjection>("globe");
  const [atlasStyle, setAtlasStyle] = useState<AtlasStyleId>("cinematic");
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [acceptedFriendIds, setAcceptedFriendIds] = useState<string[]>([]);
  const [traders, setTraders] = useState<Trader[]>([]);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [myPos, setMyPos] = useState<[number, number] | null>(null);
  const [topCountries, setTopCountries] = useState<{ country: string; count: number }[]>([]);
  const [search, setSearch] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [connStatus, setConnStatus] = useState<Record<string, "none" | "sent" | "accepted" | "pending">>({});
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [verifyRealtime, setVerifyRealtime] = useState(false);

  // Debounced GPS setter — coalesces rapid location updates so the globe/map
  // doesn't re-render on every GPS sample. Throttle ms is user-tunable.
  const [gpsThrottleMs, setGpsThrottleMs] = useState(350);
  const [lastGpsAt, setLastGpsAt] = useState<Date | null>(null);
  const [gpsTickCount, setGpsTickCount] = useState(0);
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
      setLastGpsAt(new Date());
      setGpsTickCount((n) => n + 1);
    }, gpsThrottleMs);
  }, [gpsThrottleMs]);

  // Live GPS update frequency (Hz, averaged over last 10s of ticks)
  const [gpsHz, setGpsHz] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      // Decay frequency display each second when no new ticks
      setGpsHz((prev) => Math.max(0, prev * 0.7));
    }, 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!lastGpsAt) return;
    setGpsHz(1000 / Math.max(gpsThrottleMs, 50));
  }, [gpsTickCount, lastGpsAt, gpsThrottleMs]);

  const enrichProfiles = useCallback(async (list: Trader[]) => {
    if (!list.length) return;
    setEnrichError(null);
    setEnriching(true);
    try {
      const ids = list.map((t) => t.user_id);
      const { data: profs, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, xp_points")
        .in("id", ids);
      if (error) throw error;
      const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      setTraders((curr) =>
        curr.map((t) => {
          const p = profMap.get(t.user_id) as any;
          return p
            ? { ...t, display_name: p.display_name, avatar_url: p.avatar_url, xp: p.xp_points }
            : t;
        })
      );
      if (verifyRealtime) {
        // eslint-disable-next-line no-console
        console.info(
          `[BlackPal][atlas-refresh] ${new Date().toISOString()} · enriched ${profs?.length ?? 0} profile(s)`
        );
        window.dispatchEvent(
          new CustomEvent("blackpal:atlas-refresh", {
            detail: { count: profs?.length ?? 0, at: new Date() },
          })
        );
      }
    } catch (e: any) {
      // Surface a precise diagnostic so we can see which step failed
      const step = e?.message?.toLowerCase().includes("avatar")
        ? "avatar lookup"
        : e?.message?.toLowerCase().includes("display")
        ? "display name lookup"
        : "profile fetch";
      console.error("[TraderAtlas] enrichProfiles failed during", step, e);
      setEnrichError(`Couldn't load trader profiles (${step}). ${e?.message ?? ""}`);
    } finally {
      setEnriching(false);
    }
  }, [verifyRealtime]);

  // Load current user + connection status map + incoming requests
  const [incomingRequests, setIncomingRequests] = useState<
    { id: string; from_user_id: string; display_name: string | null; city: string | null; country: string | null }[]
  >([]);

  const loadConnections = useCallback(async (uid: string) => {
    const { data: conns } = await supabase
      .from("friend_connections")
      .select("id, user_id, friend_id, status")
      .or(`user_id.eq.${uid},friend_id.eq.${uid}`);
    const map: Record<string, "none" | "sent" | "accepted" | "pending"> = {};
    const incomingIds: { id: string; from: string }[] = [];
    const accepted: string[] = [];
    (conns ?? []).forEach((c: any) => {
      const other = c.user_id === uid ? c.friend_id : c.user_id;
      map[other] = c.status === "accepted" ? "accepted" : c.user_id === uid ? "sent" : "pending";
      if (c.status === "accepted") accepted.push(other);
      if (c.status === "pending" && c.friend_id === uid) {
        incomingIds.push({ id: c.id, from: c.user_id });
      }
    });
    setConnStatus(map);
    setAcceptedFriendIds(accepted);

    if (incomingIds.length) {
      // Privacy: surface only display name + city/country, never bio/email/etc.
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, country")
        .in("id", incomingIds.map((r) => r.from));
      const { data: locs } = await supabase
        .from("user_locations")
        .select("user_id, city, country")
        .in("user_id", incomingIds.map((r) => r.from));
      const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      const locMap = new Map((locs ?? []).map((l: any) => [l.user_id, l]));
      setIncomingRequests(
        incomingIds.map((r) => ({
          id: r.id,
          from_user_id: r.from,
          display_name: (profMap.get(r.from) as any)?.display_name ?? null,
          city: (locMap.get(r.from) as any)?.city ?? null,
          country: (profMap.get(r.from) as any)?.country ?? (locMap.get(r.from) as any)?.country ?? null,
        }))
      );
    } else {
      setIncomingRequests([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setCurrentUserId(uid);
      if (!uid) return;
      loadConnections(uid);
    })();
  }, [loadConnections]);

  const respondToRequest = useCallback(
    async (requestId: string, fromUserId: string, accept: boolean) => {
      if (accept) {
        const { error } = await supabase
          .from("friend_connections")
          .update({ status: "accepted" })
          .eq("id", requestId);
        if (error) {
          toast({ variant: "destructive", title: "Couldn't accept", description: error.message });
          return;
        }
        setConnStatus((m) => ({ ...m, [fromUserId]: "accepted" }));
        toast({ title: "Connected", description: "You're now connected." });
      } else {
        const { error } = await supabase.from("friend_connections").delete().eq("id", requestId);
        if (error) {
          toast({ variant: "destructive", title: "Couldn't decline", description: error.message });
          return;
        }
        setConnStatus((m) => {
          const n = { ...m };
          delete n[fromUserId];
          return n;
        });
        toast({ title: "Request declined" });
      }
      setIncomingRequests((rs) => rs.filter((r) => r.id !== requestId));
    },
    [toast]
  );

  const connectWith = useCallback(
    async (friendId: string) => {
      if (!currentUserId) {
        toast({ variant: "destructive", title: "Sign in to connect" });
        return;
      }
      if (friendId === currentUserId) return;
      setConnectingId(friendId);
      const { error } = await supabase.from("friend_connections").insert({
        user_id: currentUserId,
        friend_id: friendId,
        status: "pending",
      });
      setConnectingId(null);
      if (error) {
        toast({ variant: "destructive", title: "Couldn't send request", description: error.message });
        return;
      }
      setConnStatus((m) => ({ ...m, [friendId]: "sent" }));
      toast({ title: "Request sent", description: "They'll see your invite in Discover." });
    },
    [currentUserId, toast]
  );

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

  // Continuous live GPS — uses watchPosition and routes every reading through
  // setMyPosDebounced, so the throttle slider directly controls how often the
  // map actually re-renders / re-centres.
  const [liveGps, setLiveGps] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (!liveGps) {
      if (watchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "Geolocation unavailable" });
      setLiveGps(false);
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => setMyPosDebounced([pos.coords.latitude, pos.coords.longitude]),
      (err) => {
        toast({ variant: "destructive", title: "Live GPS error", description: err.message });
        setLiveGps(false);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [liveGps, setMyPosDebounced, toast]);

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
          <div
            className="flex gap-1 bg-muted/30 p-1 rounded-full"
            role="tablist"
            aria-label="Trader Atlas view"
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                e.preventDefault();
                setView((v) => (v === "globe" ? "map" : "globe"));
              }
            }}
          >
            <Button
              size="sm"
              variant={view === "globe" ? "default" : "ghost"}
              className="h-7 text-[10px] px-3 rounded-full focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => setView("globe")}
              role="tab"
              aria-selected={view === "globe"}
              aria-controls="atlas-view-panel"
              tabIndex={view === "globe" ? 0 : -1}
            >
              <Globe2 className="w-3 h-3 mr-1" aria-hidden="true" />
              3D
            </Button>
            <Button
              size="sm"
              variant={view === "map" ? "default" : "ghost"}
              className="h-7 text-[10px] px-3 rounded-full focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => setView("map")}
              role="tab"
              aria-selected={view === "map"}
              aria-controls="atlas-view-panel"
              tabIndex={view === "map" ? 0 : -1}
            >
              <MapIcon className="w-3 h-3 mr-1" aria-hidden="true" />
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

        {/* Privacy-respecting incoming connection requests.
            Shows only display name + city/country — no bio, no email, no avatar URL. */}
        {incomingRequests.length > 0 && (
          <Card className="p-3 mb-3" aria-label="Incoming connection requests">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold flex items-center gap-1.5">
                <Users className="w-3 h-3 text-primary" />
                Connection Requests
                <Badge variant="secondary" className="text-[9px]">{incomingRequests.length}</Badge>
              </h2>
              <span className="text-[9px] text-muted-foreground">Privacy-safe view</span>
            </div>
            <div className="space-y-1.5">
              {incomingRequests.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-2 p-2 rounded-md bg-muted/30 border border-border/40"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {(r.display_name ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{r.display_name ?? "Trader"}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {r.city ?? "—"}{r.country ? `, ${r.country}` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="h-6 text-[10px] px-2 focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={() => respondToRequest(r.id, r.from_user_id, true)}
                    aria-label={`Accept request from ${r.display_name ?? "trader"}`}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] px-2 focus-visible:ring-2 focus-visible:ring-destructive"
                    onClick={() => respondToRequest(r.id, r.from_user_id, false)}
                    aria-label={`Decline request from ${r.display_name ?? "trader"}`}
                  >
                    Decline
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-muted-foreground mt-2">
              Only display name + general location are shown until you accept.
            </p>
          </Card>
        )}

        {/* Map area */}
        <Card id="atlas-view-panel" role="tabpanel" aria-label={view === "globe" ? "3D globe view" : "2D map view"} className="relative overflow-hidden h-[60vh] sm:h-[68vh] mb-3 rounded-3xl border-white/10 shadow-2xl">
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
                  className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Pin me to my precise location"
                >
                  <Crosshair className="w-4 h-4" aria-hidden="true" />
                </button>
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
                {filtered.map((t) => {
                  const status = connStatus[t.user_id];
                  const isMe = t.user_id === currentUserId;
                  return (
                    <Marker key={t.user_id} position={[t.latitude!, t.longitude!]} icon={avatarIcon(t)}>
                      <Popup>
                        <div className="text-xs space-y-1.5 min-w-[160px]">
                          <p className="font-bold">{t.display_name ?? "Trader"}</p>
                          <p className="text-muted-foreground">
                            {t.city ?? "—"}, {t.country ?? "—"}
                          </p>
                          {t.xp != null && <p className="text-amber-600 font-mono">{t.xp} XP</p>}
                          {!isMe && (
                            <button
                              type="button"
                              disabled={!!status || connectingId === t.user_id}
                              onClick={() => connectWith(t.user_id)}
                              className="w-full mt-1 inline-flex items-center justify-center gap-1 h-7 rounded-md bg-primary text-primary-foreground text-[10px] font-semibold disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              {status === "accepted"
                                ? "Connected"
                                : status === "sent" || status === "pending"
                                ? "Request pending"
                                : connectingId === t.user_id
                                ? "Sending…"
                                : "Connect"}
                            </button>
                          )}
                        </div>
                      </Popup>
                      <Tooltip direction="top" offset={[0, -22]} opacity={0.9}>
                        {t.display_name ?? "Trader"}
                      </Tooltip>
                    </Marker>
                  );
                })}
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
                    nearbyTop.map((t) => {
                      const status = connStatus[t.user_id];
                      const isMe = t.user_id === currentUserId;
                      return (
                        <div
                          key={t.user_id}
                          className="shrink-0 flex flex-col items-center gap-1 w-16"
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
                          {!isMe && (
                            <button
                              type="button"
                              disabled={!!status || connectingId === t.user_id}
                              onClick={() => connectWith(t.user_id)}
                              className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-primary"
                              aria-label={`Connect with ${t.display_name ?? "trader"}`}
                            >
                              {status === "accepted"
                                ? "✓"
                                : status === "sent" || status === "pending"
                                ? "Sent"
                                : "Connect"}
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Realtime verification toggle + log */}
        <Card className="p-3 mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold">Realtime verification mode</p>
            <p className="text-[10px] text-muted-foreground">
              Logs every Atlas profile refresh + dispatches a window event so you can confirm live updates without reloads.
            </p>
          </div>
          <Button
            size="sm"
            variant={verifyRealtime ? "default" : "outline"}
            className="text-[10px] focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => setVerifyRealtime((v) => !v)}
            aria-pressed={verifyRealtime}
          >
            {verifyRealtime ? "ON" : "OFF"}
          </Button>
        </Card>
        {verifyRealtime && <RealtimeVerifierLazy />}
        <Card className="p-3 mb-3" aria-label="GPS update controls">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold flex items-center gap-1.5">
              <Crosshair className="w-3 h-3 text-primary" />
              GPS Throttle
            </h2>
            <Badge variant="outline" className="text-[9px] font-mono" aria-live="polite">
              ~{gpsHz.toFixed(2)} Hz · {gpsThrottleMs}ms
            </Badge>
          </div>
          <Label htmlFor="gps-throttle" className="text-[10px] text-muted-foreground">
            Higher throttle = smoother map, fewer re-renders
          </Label>
          <Slider
            id="gps-throttle"
            min={100}
            max={3000}
            step={50}
            value={[gpsThrottleMs]}
            onValueChange={(v) => setGpsThrottleMs(v[0])}
            className="mt-2 focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="GPS update throttle in milliseconds"
          />
          <div className="flex items-center justify-between mt-2 gap-2">
            <p className="text-[9px] text-muted-foreground">
              Last GPS tick: {lastGpsAt ? lastGpsAt.toLocaleTimeString() : "—"} · ticks: {gpsTickCount}
            </p>
            <Button
              size="sm"
              variant={liveGps ? "default" : "outline"}
              className="h-6 text-[10px] px-2 focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => setLiveGps((v) => !v)}
              aria-pressed={liveGps}
              title="Toggle continuous GPS — throttle slider controls re-render frequency"
            >
              {liveGps ? "Live GPS: ON" : "Live GPS: OFF"}
            </Button>
          </div>
          <p className="text-[9px] text-muted-foreground/70 mt-1">
            {liveGps
              ? `Tracking continuously — coalescing samples to 1 update / ${gpsThrottleMs}ms`
              : "Toggle Live GPS to use the throttle slider for continuous tracking."}
          </p>
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
