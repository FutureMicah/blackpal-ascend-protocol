// Global presence: ensures every signed-in user heartbeats their online status
// from anywhere in the app — not just the Trader Atlas page. This is what makes
// "every online trader" actually appear on the globe in real time.
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { captureUserLocation } from "@/lib/location-tracker";

const HEARTBEAT_MS = 60_000; // 1 minute; well inside the 5-min "fresh online" window

export const PresenceProvider = () => {
  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const beat = async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid || cancelled) return;
      await supabase
        .from("user_locations")
        .update({ is_online: true, last_seen_at: new Date().toISOString() })
        .eq("user_id", uid);
    };

    const ensureLocation = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      // Upsert IP-based location row so heartbeat updates have something to write to.
      await captureUserLocation({ askGPS: false });
      await beat();
    };

    void ensureLocation();
    intervalId = setInterval(() => void beat(), HEARTBEAT_MS);

    const onVis = () => {
      if (document.hidden) {
        supabase.auth.getUser().then(({ data }) => {
          const uid = data.user?.id;
          if (!uid) return;
          void supabase.from("user_locations").update({ is_online: false }).eq("user_id", uid);
        });
      } else {
        void beat();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    const onBeforeUnload = () => {
      supabase.auth.getUser().then(({ data }) => {
        const uid = data.user?.id;
        if (!uid) return;
        void supabase.from("user_locations").update({ is_online: false }).eq("user_id", uid);
      });
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) void ensureLocation();
    });

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("beforeunload", onBeforeUnload);
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
};
