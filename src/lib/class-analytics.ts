import { supabase } from "@/integrations/supabase/client";

export type ClassAnalyticsEvent =
  | "session_load_start"
  | "session_load_ready"
  | "skeleton_shown"
  | "skeleton_dismissed"
  | "retry"
  | "error"
  | "auto_recover"
  | "classes_load_start"
  | "classes_load_ready"
  | "classes_load_error"
  | "session_end";

const getBreakpoint = (w: number) =>
  w < 640 ? "xs" : w < 768 ? "sm" : w < 1024 ? "md" : w < 1280 ? "lg" : "xl";

const getOrientation = () =>
  typeof window === "undefined" || window.innerWidth >= window.innerHeight
    ? "landscape"
    : "portrait";

export interface TrackPayload {
  event_type: ClassAnalyticsEvent;
  course_id?: string | null;
  session_id?: string | null;
  duration_ms?: number;
  retry_count?: number;
  meta?: Record<string, unknown>;
}

/**
 * Fire-and-forget analytics. Never throws into the UI.
 */
export async function trackClassEvent(payload: TrackPayload): Promise<void> {
  try {
    if (typeof window === "undefined") return;
    const { data: { session } } = await supabase.auth.getSession();
    const row = {
      event_type: payload.event_type,
      course_id: payload.course_id ?? null,
      session_id: payload.session_id ?? null,
      user_id: session?.user?.id ?? null,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      orientation: getOrientation(),
      breakpoint: getBreakpoint(window.innerWidth),
      user_agent: navigator.userAgent.slice(0, 256),
      duration_ms: payload.duration_ms ?? null,
      retry_count: payload.retry_count ?? 0,
      meta: payload.meta ?? {},
    };
    await supabase.from("class_analytics_events" as any).insert(row as any);
  } catch {
    // swallow — analytics must never break UX
  }
}

/** Returns a stop() that records the elapsed time as a single event. */
export function startTimer(
  event: ClassAnalyticsEvent,
  base: Omit<TrackPayload, "event_type" | "duration_ms"> = {},
) {
  const t0 = performance.now();
  return (extraMeta: Record<string, unknown> = {}) => {
    const duration_ms = Math.round(performance.now() - t0);
    void trackClassEvent({
      ...base,
      event_type: event,
      duration_ms,
      meta: { ...(base.meta || {}), ...extraMeta },
    });
    return duration_ms;
  };
}

/** Exponential backoff helper: returns ms delay for the given attempt (capped). */
export function backoffDelay(attempt: number, baseMs = 1000, capMs = 30000) {
  const exp = Math.min(capMs, baseMs * Math.pow(2, attempt));
  // full jitter
  return Math.floor(Math.random() * exp);
}
