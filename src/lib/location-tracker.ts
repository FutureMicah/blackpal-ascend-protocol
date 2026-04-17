// Captures user location via IP first, then optionally upgrades to GPS precision.
// Persists into the user_locations table.
import { supabase } from "@/integrations/supabase/client";

export interface TraderLocation {
  user_id: string;
  country: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy_source: "ip" | "gps";
}

async function fetchIPLocation(): Promise<Partial<TraderLocation>> {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const d = await res.json();
    return {
      country: d.country_name ?? null,
      country_code: d.country_code ?? null,
      region: d.region ?? null,
      city: d.city ?? null,
      latitude: typeof d.latitude === "number" ? d.latitude : null,
      longitude: typeof d.longitude === "number" ? d.longitude : null,
      accuracy_source: "ip",
    };
  } catch {
    return { accuracy_source: "ip" };
  }
}

function fetchGPS(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 }
    );
  });
}

export async function captureUserLocation(opts: { askGPS?: boolean } = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const ip = await fetchIPLocation();
  let payload: any = {
    user_id: user.id,
    ...ip,
    is_online: true,
    last_seen_at: new Date().toISOString(),
  };

  if (opts.askGPS) {
    const gps = await fetchGPS();
    if (gps) {
      payload.latitude = gps.latitude;
      payload.longitude = gps.longitude;
      payload.accuracy_source = "gps";
    }
  }

  const { error } = await supabase
    .from("user_locations")
    .upsert(payload, { onConflict: "user_id" });

  if (error) console.error("location upsert failed", error);
  return payload;
}
