     1|-- Targeted fix: idempotent, server-enforced daily-login claim (BTAX + XP).
     2|-- NOT APPLIED by this change. Effect when applied:
     3|--   * Creates public.daily_login_claims, one row per user per UTC day.
     4|--     Unique (user_id, claim_date) makes a repeat claim conflict instead
     5|--     of paying again; RLS keeps the ledger private to its owner.
     6|--   * Adds RPC claim_daily_login(p_claim_date) which atomically inserts
     7|--     the claim row, increments virtual_currency by reward.coins and
     8|--     xp_points by reward.xp in one UPDATE, and returns
     9|--     { already_claimed, coins, xp, virtual_currency, xp_points }.
    10|--     A second call on the same UTC day returns already_claimed = true
    11|--     and credits nothing. XP/BTAX grants are no longer read-modify-write
    12|--     in the client, so concurrent calls cannot overwrite each other.
    13|--   * Hard-caps coins at 100 and xp at 2 and rejects past or future dates,
    14|--     so the amounts cannot be caller-controlled.
    15|--   * sync_login_streak writes achievement_streak and streak_days from the
    16|--     same value so XPReactor/ProfileHeroCard/Leaderboard cannot drift.
    17|--   * update_achievement_streak stops overwriting the login streak (it
    18|--     now updates best_achievement_streak only, in place).
    19|-- No existing rows or columns are changed. Nothing here deploys or
    20|-- alters contest tables.
    21|
    22|CREATE TABLE IF NOT EXISTS public.daily_login_claims (
    23|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    24|  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    25|  claim_date date NOT NULL,
    26|  coins integer NOT NULL DEFAULT 0,
    27|  xp integer NOT NULL DEFAULT 0,
    28|  created_at timestamptz NOT NULL DEFAULT now(),
    29|  CONSTRAINT daily_login_claims_coins_nonneg CHECK (coins >= 0),
    30|  CONSTRAINT daily_login_claims_xp_nonneg CHECK (xp >= 0),
    31|  CONSTRAINT daily_login_claims_one_per_day UNIQUE (user_id, claim_date)
    32|);
    33|
    34|CREATE INDEX IF NOT EXISTS daily_login_claims_user_idx
    35|  ON public.daily_login_claims (user_id, created_at DESC);
    36|
    37|ALTER TABLE public.daily_login_claims ENABLE ROW LEVEL SECURITY;
    38|
    39|DROP POLICY IF EXISTS "Users can read own daily login claims"
    40|  ON public.daily_login_claims;
    41|CREATE POLICY "Users can read own daily login claims"
    42|  ON public.daily_login_claims FOR SELECT
    43|  USING (auth.uid() = user_id);
    44|
    45|REVOKE ALL ON public.daily_login_claims FROM PUBLIC, anon, authenticated;
    46|GRANT SELECT ON public.daily_login_claims TO authenticated;
    47|
    48|CREATE OR REPLACE FUNCTION public.claim_daily_login(p_claim_date date)
    49|RETURNS jsonb
    50|LANGUAGE plpgsql
    51|SECURITY DEFINER
    52|SET search_path = public
    53|AS $$
    54|DECLARE
    55|  v_user uuid := auth.uid();
    56|  v_today date := (now() AT TIME ZONE 'UTC')::date;
    57|  v_coins constant integer := 100;
    58|  v_xp constant integer := 2;
    59|  v_vc numeric;
    60|  v_xp_points integer;
    61|BEGIN
    62|  IF v_user IS NULL THEN
    63|    RAISE EXCEPTION 'Not authenticated';
    64|  END IF;
    65|
    66|  IF p_claim_date IS NULL OR p_claim_date <> v_today THEN
    67|    RAISE EXCEPTION 'Daily login claims can only be made for today (UTC)';
    68|  END IF;
    69|
    70|  INSERT INTO public.daily_login_claims (user_id, claim_date, coins, xp)
    71|  VALUES (v_user, p_claim_date, v_coins, v_xp)
    72|  ON CONFLICT (user_id, claim_date) DO NOTHING;
    73|
    74|  IF NOT FOUND THEN
    75|    SELECT p.virtual_currency, p.xp_points INTO v_vc, v_xp_points
    76|      FROM public.profiles p WHERE p.id = v_user;
    77|    RETURN jsonb_build_object(
    78|      'already_claimed', true,
    79|      'coins', 0,
    80|      'xp', 0,
    81|      'virtual_currency', COALESCE(v_vc, 0),
    82|      'xp_points', COALESCE(v_xp_points, 0)
    83|    );
    84|  END IF;
    85|
    86|  UPDATE public.profiles
    87|     SET virtual_currency = COALESCE(virtual_currency, 0) + v_coins,
    88|         xp_points        = COALESCE(xp_points, 0) + v_xp
    89|   WHERE id = v_user
    90|  RETURNING virtual_currency, xp_points INTO v_vc, v_xp_points;
    91|
    92|  IF NOT FOUND THEN
    93|    INSERT INTO public.daily_login_claims (user_id, claim_date, coins, xp)
    94|    VALUES (v_user, p_claim_date, 0, 0)
    95|    ON CONFLICT (user_id, claim_date) DO UPDATE
    96|      SET coins = EXCLUDED.coins, xp = EXCLUDED.xp;
    97|    RAISE EXCEPTION 'Profile not found for user';
    98|  END IF;
    99|
   100|  RETURN jsonb_build_object(
   101|    'already_claimed', false,
   102|    'coins', v_coins,
   103|    'xp', v_xp,
   104|    'virtual_currency', v_vc,
   105|    'xp_points', v_xp_points
   106|  );
   107|END;
   108|$$;
   109|
   110|REVOKE EXECUTE ON FUNCTION public.claim_daily_login(date) FROM PUBLIC, anon;
   111|GRANT EXECUTE ON FUNCTION public.claim_daily_login(date) TO authenticated;
   112|
   113|-- Atomic login streak sync: achievement_streak and streak_days are the
   114|-- same login streak, so write both from one value. p_current_streak is
   115|-- clamped to [1, 36500] and best_* only ever grows.
   116|CREATE OR REPLACE FUNCTION public.sync_login_streak(
   117|  p_last_login_at timestamptz,
   118|  p_current_streak integer,
   119|  p_best_streak integer
   120|)
   121|RETURNS void
   122|LANGUAGE plpgsql
   123|SECURITY DEFINER
   124|SET search_path = public
   125|AS $$
   126|DECLARE
   127|  v_user uuid := auth.uid();
   128|  v_cur integer := LEAST(GREATEST(COALESCE(p_current_streak, 1), 1), 36500);
   129|  v_best integer := LEAST(GREATEST(COALESCE(p_best_streak, v_cur), v_cur), 36500);
   130|BEGIN
   131|  IF v_user IS NULL THEN
   132|    RAISE EXCEPTION 'Not authenticated';
   133|  END IF;
   134|
   135|  UPDATE public.profiles
   136|     SET last_login_at = GREATEST(COALESCE(p_last_login_at, now()), now() - interval '1 second'),
   137|         achievement_streak = v_cur,
   138|         streak_days = v_cur,
   139|         best_achievement_streak = GREATEST(COALESCE(best_achievement_streak, 0), v_best)
   140|   WHERE id = v_user;
   141|END;
   142|$$;
   143|
   144|REVOKE EXECUTE ON FUNCTION public.sync_login_streak(timestamptz, integer, integer) FROM PUBLIC, anon;
   145|GRANT EXECUTE ON FUNCTION public.sync_login_streak(timestamptz, integer, integer) TO authenticated;
   146|
   147|-- Achievement streaks are activity streaks, not the login streak.
   148|-- Previously this function overwrote achievement_streak (the daily-login
   149|-- counter shown everywhere) with an achievement-based value, so the two
   150|-- counters fought. Now it only raises best_achievement_streak and
   151|-- last_achievement_date; the login streak is owned by sync_login_streak.
   152|CREATE OR REPLACE FUNCTION public.update_achievement_streak(user_id_param uuid)
   153|RETURNS void
   154|LANGUAGE plpgsql
   155|SECURITY DEFINER
   156|SET search_path = public
   157|AS $$
   158|BEGIN
   159|  UPDATE public.profiles
   160|     SET best_achievement_streak = GREATEST(COALESCE(best_achievement_streak, 0), 1),
   161|         last_achievement_date = now()
   162|   WHERE id = user_id_param;
   163|END;
   164|$$;
   165|
-- Atomic, idempotent XP grant used by award-achievement: inserts the
-- xp_ledger row and increments profiles.xp_points in the same call, so
-- concurrent awards cannot overwrite each other and a retried call with
-- the same (source, source_id) credits nothing extra. source_id must be
-- a uuid (achievement id).
CREATE OR REPLACE FUNCTION public.award_xp_once(
  p_user_id uuid,
  p_amount integer,
  p_source text,
  p_source_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_xp integer;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'XP amount must be positive';
  END IF;
  IF p_source_id IS NOT NULL THEN
    INSERT INTO public.xp_ledger (user_id, amount, source, source_id, metadata)
    VALUES (p_user_id, p_amount, p_source, p_source_id,
            jsonb_build_object('reason', COALESCE(p_reason, '')))
    ON CONFLICT (user_id, source, source_id) WHERE source_id IS NOT NULL DO NOTHING;
    IF NOT FOUND THEN
      SELECT p.xp_points INTO v_xp FROM public.profiles p WHERE p.id = p_user_id;
      RETURN jsonb_build_object('already_awarded', true, 'xp', 0, 'xp_points', COALESCE(v_xp, 0));
    END IF;
  ELSE
    INSERT INTO public.xp_ledger (user_id, amount, source, source_id, metadata)
    VALUES (p_user_id, p_amount, p_source, NULL,
            jsonb_build_object('reason', COALESCE(p_reason, '')));
  END IF;

  UPDATE public.profiles
     SET xp_points = COALESCE(xp_points, 0) + p_amount
   WHERE id = p_user_id
  RETURNING xp_points INTO v_xp;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user';
  END IF;

  RETURN jsonb_build_object('already_awarded', false, 'xp', p_amount, 'xp_points', v_xp);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_xp_once(uuid, integer, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_xp_once(uuid, integer, text, uuid, text) TO service_role;
