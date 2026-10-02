DO $$
DECLARE r record;
  tbls text[] := ARRAY['achievement_materials','lottery_prizes','battle_pass_rewards','battle_passes','crafting_recipes','achievement_evolution_paths','stickers','competition_participants','sticker_packs','trader_sentiment','achievement_milestones','prop_tiers','class_live_sessions','achievements','achievement_seasons','season_leaderboard','xp_tier_config','guild_boss_battles','achievement_auctions','admin_broadcasts','contest_entries','achievement_lore','trading_competitions','subscription_tiers','certificates','collectibles','contest_recompute_runs','mentors','app_settings','auction_bids','profile_views'];
  t text;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname='public' AND tablename = ANY(tbls)
      AND (btrim(coalesce(qual,''))='true' OR btrim(coalesce(with_check,''))='true')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
  FOREACH t IN ARRAY tbls LOOP
    IF t NOT IN ('auction_bids','profile_views') AND to_regclass('public.'||t) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Signed-in users can read '||t, t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL)', 'Signed-in users can read '||t, t);
      EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    END IF;
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Admins manage settings" ON public.app_settings;
CREATE POLICY "Admins manage settings" ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Bidders sellers and admins view bids" ON public.auction_bids;
CREATE POLICY "Bidders sellers and admins view bids" ON public.auction_bids FOR SELECT TO authenticated
  USING (bidder_id = auth.uid() OR EXISTS (SELECT 1 FROM public.achievement_auctions a WHERE a.id = auction_id AND a.seller_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Signed-in users track own profile views" ON public.profile_views;
CREATE POLICY "Signed-in users track own profile views" ON public.profile_views FOR INSERT TO authenticated
  WITH CHECK (viewer_id = auth.uid());