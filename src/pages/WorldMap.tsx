// World heatmap with toggle: 3D rotating globe vs 2D zoomable Leaflet map.
// Captures viewer's location on mount (IP first, then optional GPS prompt).
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe2, Map as MapIcon, MapPin, Users, Loader2, Crosshair } from "lucide-react";
import { FloatingNav } from "@/components/FloatingNav";
import { TraderGlobe } from "@/components/TraderGlobe";
import { GlassIcon } from "@/components/GlassIcon";
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
}

function FlyTo({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.flyTo(pos, 6, { duration: 1.5 });
  }, [pos, map]);
  return null;
}

const WorldMap = () => {
  const { toast } = useToast();
  const [view, setView] = useState<"globe" | "map">("globe");
  const [traders, setTraders] = useState<Trader[]>([]);
  const [loading, setLoading] = useState(true);
  const [myPos, setMyPos] = useState<[number, number] | null>(null);
  const [topCountries, setTopCountries] = useState<{ country: string; count: number }[]>([]);

  useEffect(() => {
    const init = async () => {
      // 1. Capture viewer's IP location silently
      const loc = await captureUserLocation({ askGPS: false });
      if (loc?.latitude && loc?.longitude) setMyPos([loc.latitude, loc.longitude]);

      // 2. Load all traders
      const { data } = await supabase
        .from("user_locations")
        .select("user_id, country, country_code, city, latitude, longitude, is_online, last_seen_at")
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      const list = (data ?? []) as Trader[];
      setTraders(list);

      // Country tallies
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
      setLoading(false);
    };
    init();

    // Realtime updates
    const ch = supabase
      .channel("locations-stream")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_locations" }, () => init())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const requestPreciseLocation = async () => {
    toast({ title: "Requesting precise location", description: "Allow access in your browser." });
    const loc = await captureUserLocation({ askGPS: true });
    if (loc?.latitude && loc?.longitude) {
      setMyPos([loc.latitude, loc.longitude]);
      toast({ title: "Pinned!", description: "Your precise location is now on the map." });
    } else {
      toast({ variant: "destructive", title: "Location denied", description: "Using IP-based location instead." });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <FloatingNav />
      <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-16 pb-20">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <GlassIcon icon={Globe2} size="sm" tint="ice" />
            <h1 className="text-lg sm:text-2xl font-bold">Trader Atlas</h1>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            Live world map of every BlackPal trader
          </p>
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

        {/* View toggle + GPS */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex gap-1 bg-muted/30 p-1 rounded-lg">
            <Button
              size="sm"
              variant={view === "globe" ? "default" : "ghost"}
              className="h-7 text-[10px] px-2.5"
              onClick={() => setView("globe")}
            >
              <Globe2 className="w-3 h-3 mr-1" />
              3D Globe
            </Button>
            <Button
              size="sm"
              variant={view === "map" ? "default" : "ghost"}
              className="h-7 text-[10px] px-2.5"
              onClick={() => setView("map")}
            >
              <MapIcon className="w-3 h-3 mr-1" />
              2D Zoom Map
            </Button>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={requestPreciseLocation}>
            <Crosshair className="w-3 h-3 mr-1" />
            Pin me
          </Button>
        </div>

        {/* Map area */}
        <Card className="relative overflow-hidden h-[55vh] sm:h-[65vh] mb-3">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : view === "globe" ? (
            <TraderGlobe traders={traders} />
          ) : (
            <MapContainer
              center={myPos ?? [20, 0]}
              zoom={2}
              minZoom={2}
              maxZoom={18}
              scrollWheelZoom
              style={{ height: "100%", width: "100%", background: "#0a0a0a" }}
              worldCopyJump
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution="&copy; OpenStreetMap &copy; CARTO"
              />
              <FlyTo pos={myPos} />
              {traders.map((t) => (
                <CircleMarker
                  key={t.user_id}
                  center={[t.latitude!, t.longitude!]}
                  radius={t.is_online ? 7 : 5}
                  pathOptions={{
                    color: t.is_online ? "#22c55e" : "#fbbf24",
                    fillColor: t.is_online ? "#22c55e" : "#fbbf24",
                    fillOpacity: 0.7,
                    weight: 1,
                  }}
                >
                  <Tooltip>
                    {t.city ?? "—"}, {t.country ?? "—"}
                  </Tooltip>
                </CircleMarker>
              ))}
              {myPos && (
                <CircleMarker
                  center={myPos}
                  radius={9}
                  pathOptions={{ color: "#a855f7", fillColor: "#a855f7", fillOpacity: 0.9, weight: 2 }}
                >
                  <Tooltip permanent>You</Tooltip>
                </CircleMarker>
              )}
            </MapContainer>
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
