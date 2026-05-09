// Trader Atlas v2 — MapLibre GL globe with cinematic neon overlays.
// Free stack: MapLibre GL JS + OpenFreeMap vector tiles + ESRI World Imagery
// satellite raster + AWS Terrarium terrain. No API keys required.
//
// Renders trader avatars as HTML markers, animated great-circle arcs between
// connections, an activity heatmap, and supports globe / mercator projection
// plus three styles (Cinematic, Satellite, Hybrid).
import { useEffect, useMemo, useRef } from "react";
import maplibregl, {
  Map as MLMap,
  Marker as MLMarker,
  StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export interface AtlasTrader {
  user_id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  latitude: number | null;
  longitude: number | null;
  is_online?: boolean | null;
  xp?: number | null;
  city?: string | null;
  country?: string | null;
}

export interface AtlasConnection {
  from: [number, number]; // [lng, lat]
  to: [number, number];
}

export type AtlasStyleId = "cinematic" | "satellite" | "hybrid";
export type AtlasProjection = "globe" | "mercator";

interface Props {
  traders: AtlasTrader[];
  connections?: AtlasConnection[];
  myPos?: [number, number] | null; // [lat, lng]
  styleId: AtlasStyleId;
  projection: AtlasProjection;
  showHeatmap?: boolean;
  onMarkerClick?: (t: AtlasTrader) => void;
}

// Sanitize avatar URL — only http(s).
function safeUrl(u?: string | null): string | null {
  if (!u) return null;
  try {
    const url = new URL(u, window.location.origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return encodeURI(url.toString());
  } catch {
    return null;
  }
}

// Great-circle interpolation between two [lng,lat] points.
function greatCircle(a: [number, number], b: [number, number], steps = 64): [number, number][] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const [lng1, lat1] = a.map(toRad) as [number, number];
  const [lng2, lat2] = b.map(toRad) as [number, number];
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng2 - lng1) / 2) ** 2,
      ),
    );
  if (d === 0) return [a, b];
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
    const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lng = Math.atan2(y, x);
    pts.push([toDeg(lng), toDeg(lat)]);
  }
  return pts;
}

// Build the three free styles inline so we don't depend on remote style JSON.
function buildStyle(id: AtlasStyleId): StyleSpecification {
  const satellite: StyleSpecification = {
    version: 8,
    sources: {
      esri: {
        type: "raster",
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        attribution:
          "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
        maxzoom: 19,
      },
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": "#020203" } },
      { id: "satellite", type: "raster", source: "esri" },
    ],
    sky: {
      "sky-color": "#0a0a18",
      "sky-horizon-blend": 0.5,
      "horizon-color": "#1a1530",
      "horizon-fog-blend": 0.5,
      "fog-color": "#05060c",
      "fog-ground-blend": 0.2,
    },
  };

  if (id === "satellite") return satellite;

  if (id === "hybrid") {
    // Satellite + neon labels via OpenFreeMap dark vector tiles label layer.
    return {
      ...satellite,
      sources: {
        ...satellite.sources,
        openfreemap: {
          type: "vector",
          url: "https://tiles.openfreemap.org/planet",
        } as any,
      },
      layers: [
        ...satellite.layers,
        // Country borders as thin glowing lines
        {
          id: "country-borders",
          type: "line",
          source: "openfreemap",
          "source-layer": "boundary",
          filter: ["==", ["get", "admin_level"], 2],
          paint: {
            "line-color": "#a855f7",
            "line-opacity": 0.45,
            "line-width": 0.6,
          },
        } as any,
        // Place labels (cities/countries) in glowy white
        {
          id: "place-labels",
          type: "symbol",
          source: "openfreemap",
          "source-layer": "place",
          filter: ["in", ["get", "class"], ["literal", ["country", "city", "town"]]],
          layout: {
            "text-field": ["get", "name"],
            "text-size": ["interpolate", ["linear"], ["zoom"], 1, 9, 6, 14],
            "text-font": ["Noto Sans Regular"],
          },
          paint: {
            "text-color": "#ffffff",
            "text-halo-color": "#0b0712",
            "text-halo-width": 1.4,
            "text-opacity": 0.85,
          },
        } as any,
      ],
    };
  }

  // Cinematic: deep-black vector style (OpenFreeMap dark) — hosted JSON.
  // Returning a style URL would block the typing; use a tiny inline style that
  // pulls vector tiles directly with hand-tuned dark cinematic paint.
  return {
    version: 8,
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {
      openfreemap: {
        type: "vector",
        url: "https://tiles.openfreemap.org/planet",
        attribution:
          "&copy; OpenFreeMap &copy; OpenStreetMap contributors",
      } as any,
    },
    sky: {
      "sky-color": "#0a0a18",
      "sky-horizon-blend": 0.6,
      "horizon-color": "#2a1a4a",
      "horizon-fog-blend": 0.6,
      "fog-color": "#05060c",
      "fog-ground-blend": 0.15,
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": "#05060c" } },
      {
        id: "water",
        type: "fill",
        source: "openfreemap",
        "source-layer": "water",
        paint: { "fill-color": "#0a0815", "fill-opacity": 1 },
      } as any,
      {
        id: "landcover",
        type: "fill",
        source: "openfreemap",
        "source-layer": "landcover",
        paint: { "fill-color": "#0e0a1c", "fill-opacity": 0.6 },
      } as any,
      {
        id: "country-fill",
        type: "fill",
        source: "openfreemap",
        "source-layer": "boundary",
        filter: ["==", ["get", "admin_level"], 2],
        paint: { "fill-color": "#1a1230", "fill-opacity": 0.0 },
      } as any,
      {
        id: "country-border",
        type: "line",
        source: "openfreemap",
        "source-layer": "boundary",
        filter: ["==", ["get", "admin_level"], 2],
        paint: {
          "line-color": "#a855f7",
          "line-opacity": 0.55,
          "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.4, 6, 1.2],
          "line-blur": 0.4,
        },
      } as any,
      {
        id: "state-border",
        type: "line",
        source: "openfreemap",
        "source-layer": "boundary",
        filter: ["==", ["get", "admin_level"], 4],
        paint: {
          "line-color": "#7c3aed",
          "line-opacity": 0.25,
          "line-width": 0.4,
        },
      } as any,
      {
        id: "place-labels",
        type: "symbol",
        source: "openfreemap",
        "source-layer": "place",
        filter: ["in", ["get", "class"], ["literal", ["country", "city", "town"]]],
        layout: {
          "text-field": ["get", "name"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 1, 10, 6, 15],
          "text-font": ["Noto Sans Regular"],
          "text-letter-spacing": 0.08,
        },
        paint: {
          "text-color": "#f5d76e",
          "text-halo-color": "#0b0712",
          "text-halo-width": 1.6,
          "text-opacity": 0.9,
        },
      } as any,
    ],
  };
}

export function AtlasGlobe({
  traders,
  connections = [],
  myPos,
  styleId,
  projection,
  showHeatmap = false,
  onMarkerClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<MLMarker[]>([]);
  const meMarkerRef = useRef<MLMarker | null>(null);
  const styleLoadedRef = useRef(false);

  // Init map once
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle(styleId),
      center: [0, 20],
      zoom: 1.6,
      pitch: 0,
      bearing: 0,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
    map.touchZoomRotate.enableRotation();

    map.on("load", () => {
      styleLoadedRef.current = true;
      try {
        (map as any).setProjection?.({ type: projection === "globe" ? "globe" : "mercator" });
      } catch {
        // older runtimes — ignore
      }
      // Arcs source
      if (!map.getSource("arcs")) {
        map.addSource("arcs", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "arcs-glow",
          type: "line",
          source: "arcs",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#a855f7",
            "line-width": 4,
            "line-opacity": 0.25,
            "line-blur": 6,
          },
        });
        map.addLayer({
          id: "arcs-line",
          type: "line",
          source: "arcs",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#f5d76e",
            "line-width": 1.3,
            "line-opacity": 0.9,
          },
        });
      }
      // Heatmap source
      if (!map.getSource("heat")) {
        map.addSource("heat", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "heat-layer",
          type: "heatmap",
          source: "heat",
          maxzoom: 7,
          paint: {
            "heatmap-weight": 1,
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.6, 7, 2],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 12, 7, 30],
            "heatmap-opacity": 0.75,
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0, "rgba(0,0,0,0)",
              0.2, "rgba(124,58,237,0.4)",
              0.5, "rgba(168,85,247,0.7)",
              0.8, "rgba(245,215,110,0.9)",
              1, "rgba(255,255,255,1)",
            ],
          },
        });
        map.setLayoutProperty("heat-layer", "visibility", showHeatmap ? "visible" : "none");
      }
    });

    mapRef.current = map;
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      meMarkerRef.current?.remove();
      meMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
      styleLoadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Style change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    styleLoadedRef.current = false;
    map.setStyle(buildStyle(styleId));
    map.once("style.load", () => {
      styleLoadedRef.current = true;
      // Re-add custom sources/layers after style swap
      if (!map.getSource("arcs")) {
        map.addSource("arcs", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "arcs-glow", type: "line", source: "arcs",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#a855f7", "line-width": 4, "line-opacity": 0.25, "line-blur": 6 },
        });
        map.addLayer({
          id: "arcs-line", type: "line", source: "arcs",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#f5d76e", "line-width": 1.3, "line-opacity": 0.9 },
        });
      }
      if (!map.getSource("heat")) {
        map.addSource("heat", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "heat-layer", type: "heatmap", source: "heat", maxzoom: 7,
          paint: {
            "heatmap-weight": 1,
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.6, 7, 2],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 12, 7, 30],
            "heatmap-opacity": 0.75,
            "heatmap-color": [
              "interpolate", ["linear"], ["heatmap-density"],
              0, "rgba(0,0,0,0)",
              0.2, "rgba(124,58,237,0.4)",
              0.5, "rgba(168,85,247,0.7)",
              0.8, "rgba(245,215,110,0.9)",
              1, "rgba(255,255,255,1)",
            ],
          },
        });
        map.setLayoutProperty("heat-layer", "visibility", showHeatmap ? "visible" : "none");
      }
    });
  }, [styleId, showHeatmap]);

  // Projection change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    try {
      (map as any).setProjection?.({ type: projection === "globe" ? "globe" : "mercator" });
    } catch {
      /* noop */
    }
  }, [projection]);

  // Heatmap toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer("heat-layer")) return;
    map.setLayoutProperty("heat-layer", "visibility", showHeatmap ? "visible" : "none");
  }, [showHeatmap]);

  // Markers (avatars). Recreate when traders change.
  const tradersKey = useMemo(
    () =>
      traders
        .filter((t) => t.latitude != null && t.longitude != null)
        .map((t) => `${t.user_id}:${t.latitude}:${t.longitude}:${t.is_online ? 1 : 0}`)
        .join("|"),
    [traders],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Clear old
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    const valid = traders.filter((t) => t.latitude != null && t.longitude != null);
    valid.forEach((t) => {
      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute("aria-label", `Trader ${t.display_name ?? "anonymous"}`);
      const ring = t.is_online ? "#22c55e" : "#a855f7";
      const safe = safeUrl(t.avatar_url);
      const initials = (t.display_name ?? "?").slice(0, 1).toUpperCase();
      el.style.cssText = `
        position:relative;width:38px;height:38px;border-radius:9999px;
        border:2px solid ${ring};box-shadow:0 0 12px ${ring}66, 0 4px 14px rgba(0,0,0,.5);
        background:#0f0f14;cursor:pointer;padding:0;overflow:visible;
      `;
      el.innerHTML = safe
        ? `<img src="${safe}" alt="" style="width:100%;height:100%;border-radius:9999px;object-fit:cover;" onerror="this.style.display='none'"/>`
        : `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;border-radius:9999px;background:linear-gradient(135deg,#7c3aed,#3b82f6);color:#fff;font-weight:700;font-size:13px;">${initials}</span>`;
      // Pulse ring for online
      if (t.is_online) {
        const pulse = document.createElement("span");
        pulse.style.cssText = `
          position:absolute;inset:-6px;border-radius:9999px;border:2px solid ${ring};
          opacity:.6;animation:atlasPulse 2s ease-out infinite;pointer-events:none;
        `;
        el.appendChild(pulse);
      }
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onMarkerClick?.(t);
        map.flyTo({ center: [t.longitude!, t.latitude!], zoom: Math.max(map.getZoom(), 4), duration: 1200 });
      });
      const m = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([t.longitude!, t.latitude!])
        .addTo(map);
      markersRef.current.push(m);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradersKey]);

  // "You" marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !myPos) return;
    if (!meMarkerRef.current) {
      const el = document.createElement("div");
      el.setAttribute("aria-label", "Your location");
      el.style.cssText = `
        width:18px;height:18px;border-radius:9999px;background:#3b82f6;
        border:3px solid #fff;box-shadow:0 0 0 8px rgba(59,130,246,.25);
      `;
      meMarkerRef.current = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([myPos[1], myPos[0]])
        .addTo(map);
    } else {
      meMarkerRef.current.setLngLat([myPos[1], myPos[0]]);
    }
  }, [myPos]);

  // Arcs
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const src = map.getSource("arcs") as maplibregl.GeoJSONSource | undefined;
      if (!src) return;
      const features = connections.map((c) => ({
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "LineString" as const,
          coordinates: greatCircle(c.from, c.to, 64),
        },
      }));
      src.setData({ type: "FeatureCollection", features });
    };
    if (styleLoadedRef.current) apply();
    else map.once("style.load", apply);
  }, [connections]);

  // Heatmap data
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const src = map.getSource("heat") as maplibregl.GeoJSONSource | undefined;
      if (!src) return;
      const features = traders
        .filter((t) => t.latitude != null && t.longitude != null)
        .map((t) => ({
          type: "Feature" as const,
          properties: { weight: t.is_online ? 1 : 0.3 },
          geometry: { type: "Point" as const, coordinates: [t.longitude!, t.latitude!] },
        }));
      src.setData({ type: "FeatureCollection", features });
    };
    if (styleLoadedRef.current) apply();
    else map.once("style.load", apply);
  }, [traders]);

  return (
    <>
      <style>{`
        @keyframes atlasPulse {
          0% { transform: scale(1); opacity: .7; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .maplibregl-ctrl-attrib { background: rgba(0,0,0,.5) !important; color: #fff !important; }
        .maplibregl-ctrl-attrib a { color: #c4a8ff !important; }
      `}</style>
      <div ref={containerRef} className="absolute inset-0 w-full h-full" aria-label="Trader Atlas globe" />
    </>
  );
}

export default AtlasGlobe;
