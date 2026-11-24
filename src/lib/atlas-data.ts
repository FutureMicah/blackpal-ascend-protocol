/**
 * Privacy-safe trader loading for the Atlas globe (WorldMap).
 *
 * This is the ONLY data path the user-facing Trader Atlas uses to list
 * other traders. It goes through the existing SECURITY DEFINER RPC
 * `atlas_public_users`, which enforces the location-privacy rules
 * server-side so the client never needs broad table access:
 *
 * - ghost          => row excluded entirely (invisible on the atlas)
 * - country (default for viewers of others) => coordinates jittered by
 *   up to ~0.75 deg per axis, so no precise pin is ever exposed
 * - precise        => exact coordinates returned ONLY for the viewer's
 *   own row (user_id = auth.uid()); everyone else still gets jittered
 *
 * Do NOT replace this with a direct `user_locations` table read.
 * `user_locations` RLS is owner-only (+ admin), so a direct read
 * returns an (almost) empty map for regular users and, if that policy
 * is ever loosened, would leak precise coordinates. The RPC is the
 * privacy boundary; see supabase/migrations
 * 20260509172501 (owner-only RLS) and 20260611074859 (atlas RPCs).
 *
 * Realtime: this module never subscribes to raw `user_locations`
 * postgres_changes with payloads. Realtime on that table is subject to
 * the same owner-only RLS, so it cannot be a safe refresh path either.
 * Callers refresh by re-calling `loadAtlasTraders` (debounced) on a
 * coarse trigger + interval, exactly like SnapchatMap's RPC reload.
 */
export interface AtlasTraderRow {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  country: string | null;
  country_code: string | null;
  /** Jittered unless this row is the viewer themself with precise sharing. */
  latitude: number | null;
  longitude: number | null;
  is_online: boolean | null;
  is_trading: boolean | null;
  last_seen_at: string | null;
  /** "country" for everyone except the viewer viewing their own precise row. */
  precision_level: string | null;
}

export interface AtlasTradersOptions {
  onlyOnline?: boolean;
  onlyTrading?: boolean;
  limit?: number;
}

/**
 * Load privacy-safe atlas traders via atlas_public_users.
 * Returns [] on any error (e.g. unauthenticated) so the map degrades
 * to an empty state instead of crashing or falling back to raw reads.
 */
export async function loadAtlasTraders(
  supabase: {
    rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
  },
  opts: AtlasTradersOptions = {},
): Promise<AtlasTraderRow[]> {
  const { data, error } = await supabase.rpc("atlas_public_users", {
    p_only_online: opts.onlyOnline ?? false,
    p_only_trading: opts.onlyTrading ?? false,
    p_limit: opts.limit ?? 800,
  });
  if (error || !Array.isArray(data)) return [];
  return data as AtlasTraderRow[];
}
