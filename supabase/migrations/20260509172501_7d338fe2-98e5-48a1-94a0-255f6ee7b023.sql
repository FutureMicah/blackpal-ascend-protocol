
-- =====================================================================
-- Security hardening migration
-- Addresses: user_locations geodata leak, open chat RLS, achievement/
-- competition/lottery/leaderboard self-tampering, anon PII in profiles,
-- referral code enumeration, HIBP placeholder.
-- =====================================================================

-- --- user_locations: owner-only SELECT --------------------------------
DROP POLICY IF EXISTS "Authenticated users can view all locations" ON public.user_locations;
DROP POLICY IF EXISTS "Users view own location" ON public.user_locations;
CREATE POLICY "Users view own location"
  ON public.user_locations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Aggregate-only view for the world map (country counts, no coordinates)
DROP VIEW IF EXISTS public.world_map_country_counts;
CREATE VIEW public.world_map_country_counts
WITH (security_invoker = true) AS
  SELECT country, country_code, COUNT(*)::int AS trader_count
  FROM public.user_locations
  WHERE country IS NOT NULL
  GROUP BY country, country_code;
GRANT SELECT ON public.world_map_country_counts TO authenticated, anon;

-- --- room_messages: restrict to room participants ---------------------
DROP POLICY IF EXISTS "View room messages" ON public.room_messages;
DROP POLICY IF EXISTS "Send messages" ON public.room_messages;
DROP POLICY IF EXISTS "Room participants view messages" ON public.room_messages;
DROP POLICY IF EXISTS "Room participants send messages" ON public.room_messages;

CREATE POLICY "Room participants view messages"
  ON public.room_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.room_participants rp
      WHERE rp.room_id = room_messages.room_id
        AND rp.user_id = auth.uid()
        AND COALESCE(rp.is_banned, false) = false
    )
  );

CREATE POLICY "Room participants send messages"
  ON public.room_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.room_participants rp
      WHERE rp.room_id = room_messages.room_id
        AND rp.user_id = auth.uid()
        AND COALESCE(rp.is_banned, false) = false
        AND COALESCE(rp.is_muted, false) = false
    )
  );

-- --- room_participants: scope SELECT to room members ------------------
DROP POLICY IF EXISTS "View room participants" ON public.room_participants;
DROP POLICY IF EXISTS "Members view participants" ON public.room_participants;
CREATE POLICY "Members view participants"
  ON public.room_participants FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.room_participants self
      WHERE self.room_id = room_participants.room_id
        AND self.user_id = auth.uid()
        AND COALESCE(self.is_banned, false) = false
    )
  );

-- --- user_achievements: revoke client INSERT --------------------------
DROP POLICY IF EXISTS "System inserts achievements for authenticated users" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can insert their own achievements" ON public.user_achievements;
-- SELECT (own row) policy preserved; INSERT now only via service role / SECURITY DEFINER RPCs.

-- --- competition_participants: lock down writes & restrict reads ------
DROP POLICY IF EXISTS "Users can update their own participation" ON public.competition_participants;
DROP POLICY IF EXISTS "Users can view all participants" ON public.competition_participants;
DROP POLICY IF EXISTS "Authenticated view participants" ON public.competition_participants;
CREATE POLICY "Authenticated view participants"
  ON public.competition_participants FOR SELECT
  TO authenticated
  USING (true);
-- No client UPDATE policy → service role / SECURITY DEFINER only.

-- --- daily_lottery_spins: read-only for users -------------------------
DROP POLICY IF EXISTS "Users can manage their spins" ON public.daily_lottery_spins;
DROP POLICY IF EXISTS "Users view own spins" ON public.daily_lottery_spins;
CREATE POLICY "Users view own spins"
  ON public.daily_lottery_spins FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- --- season_leaderboard: server-side writes only ----------------------
DROP POLICY IF EXISTS "Users can update their own season stats" ON public.season_leaderboard;
DROP POLICY IF EXISTS "Users can modify their season stats" ON public.season_leaderboard;
DROP POLICY IF EXISTS "Authenticated view season leaderboard" ON public.season_leaderboard;
CREATE POLICY "Authenticated view season leaderboard"
  ON public.season_leaderboard FOR SELECT
  TO authenticated
  USING (true);

-- --- profiles: hide phone/DOB from anon callers -----------------------
-- RLS doesn't filter columns; revoke at column-grant level so anon can't
-- ever SELECT phone_number / date_of_birth even if the row policy allows it.
REVOKE SELECT (phone_number, date_of_birth) ON public.profiles FROM anon;
-- authenticated keeps SELECT; the app code now allowlists the public fields.

-- --- referral_codes: replace anon SELECT with validation RPC ----------
DROP POLICY IF EXISTS "Anyone can view active referral codes for validation" ON public.referral_codes;

CREATE OR REPLACE FUNCTION public.validate_referral_code(p_code text)
RETURNS TABLE (user_id uuid, code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rc.user_id, rc.code
  FROM public.referral_codes rc
  WHERE rc.code = upper(trim(p_code))
    AND COALESCE(rc.is_active, true) = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.validate_referral_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_referral_code(text) TO anon, authenticated;
