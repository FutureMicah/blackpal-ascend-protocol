CREATE OR REPLACE FUNCTION public.refresh_quest_progress()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_day date := (now() AT TIME ZONE 'UTC')::date;
  v_week date := date_trunc('week', (now() AT TIME ZONE 'UTC'))::date;
  v_q RECORD;
  v_period_start date;
  v_progress int;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  FOR v_q IN SELECT * FROM public.xp_quests WHERE is_active = true LOOP
    v_period_start := CASE WHEN v_q.period = 'daily' THEN v_day ELSE v_week END;
    v_progress := 0;
    IF v_q.quest_key = 'daily_trade' THEN
      SELECT count(*) INTO v_progress FROM public.prop_trades
        WHERE user_id = v_user AND status = 'closed' AND closed_at::date = v_day;
    ELSIF v_q.quest_key = 'daily_journal' THEN
      SELECT count(*) INTO v_progress FROM public.trading_journal
        WHERE user_id = v_user AND created_at::date = v_day;
    ELSIF v_q.quest_key = 'daily_login' THEN
      v_progress := 1;
    ELSIF v_q.quest_key = 'weekly_wins' THEN
      SELECT count(*) INTO v_progress FROM public.prop_trades
        WHERE user_id = v_user AND status = 'closed'
          AND closed_at >= v_week
          AND COALESCE(profit_loss,0)+COALESCE(commission,0)+COALESCE(swap,0) > 0;
    ELSIF v_q.quest_key = 'weekly_consistency' THEN
      SELECT count(DISTINCT closed_at::date) INTO v_progress FROM public.prop_trades
        WHERE user_id = v_user AND status = 'closed' AND closed_at >= v_week;
    END IF;

    INSERT INTO public.xp_quest_progress (user_id, quest_id, period_start, progress, completed_at)
    VALUES (v_user, v_q.id, v_period_start, v_progress,
            CASE WHEN v_progress >= v_q.target THEN now() ELSE NULL END)
    ON CONFLICT (user_id, quest_id, period_start) DO UPDATE
      SET progress = GREATEST(public.xp_quest_progress.progress, EXCLUDED.progress),
          completed_at = COALESCE(public.xp_quest_progress.completed_at,
            CASE WHEN GREATEST(public.xp_quest_progress.progress, EXCLUDED.progress) >= v_q.target THEN now() ELSE NULL END);
  END LOOP;
END $$;