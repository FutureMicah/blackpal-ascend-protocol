ALTER TABLE public.contests
  ADD COLUMN IF NOT EXISTS entry_price_usd numeric NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS target_profit_pct numeric NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS max_drawdown_pct numeric NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS min_trades integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS min_active_days integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS fail_rate_pct numeric NOT NULL DEFAULT 78;

CREATE TABLE IF NOT EXISTS public.contest_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  profit_pct numeric NOT NULL DEFAULT 0,
  drawdown_pct numeric NOT NULL DEFAULT 0,
  trades_count integer NOT NULL DEFAULT 0,
  active_days integer NOT NULL DEFAULT 0,
  rank integer,
  status text NOT NULL DEFAULT 'in_progress',
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contest_id, user_id)
);

GRANT SELECT, INSERT, UPDATE ON public.contest_entries TO authenticated;
GRANT SELECT ON public.contest_entries TO anon;
GRANT ALL ON public.contest_entries TO service_role;

ALTER TABLE public.contest_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contest entries are viewable by everyone"
  ON public.contest_entries FOR SELECT USING (true);

CREATE POLICY "Users can join contests themselves"
  ON public.contest_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own entry"
  ON public.contest_entries FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage contest entries"
  ON public.contest_entries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE IF NOT EXISTS public.contest_reminder_prefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email_enabled boolean NOT NULL DEFAULT true,
  in_app_enabled boolean NOT NULL DEFAULT true,
  score_updates boolean NOT NULL DEFAULT true,
  ending_soon_minutes integer NOT NULL DEFAULT 60,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contest_reminder_prefs TO authenticated;
GRANT ALL ON public.contest_reminder_prefs TO service_role;

ALTER TABLE public.contest_reminder_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their reminder prefs"
  ON public.contest_reminder_prefs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER contest_entries_updated_at
  BEFORE UPDATE ON public.contest_entries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER contest_reminder_prefs_updated_at
  BEFORE UPDATE ON public.contest_reminder_prefs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.notify_contest_score_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_pref boolean := true;
BEGIN
  IF NEW.score IS DISTINCT FROM OLD.score OR NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT COALESCE(in_app_enabled AND score_updates, true) INTO v_pref
      FROM public.contest_reminder_prefs WHERE user_id = NEW.user_id;
    IF COALESCE(v_pref, true) THEN
      SELECT title INTO v_title FROM public.contests WHERE id = NEW.contest_id;
      INSERT INTO public.in_app_notifications (user_id, title, message, type, icon)
      VALUES (
        NEW.user_id,
        'Contest score updated',
        COALESCE(v_title, 'Contest') || ': score ' || round(NEW.score, 1) || '%'
          || CASE WHEN NEW.rank IS NOT NULL THEN ' · rank #' || NEW.rank ELSE '' END
          || ' · ' || NEW.status,
        'contest',
        'trophy'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_contest_score_change
  AFTER UPDATE ON public.contest_entries
  FOR EACH ROW EXECUTE FUNCTION public.notify_contest_score_change();

UPDATE public.contests SET entry_price_usd = 10, target_profit_pct = 8, max_drawdown_pct = 5, min_trades = 10, min_active_days = 3, fail_rate_pct = 78 WHERE title ILIKE '%10%';
UPDATE public.contests SET entry_price_usd = 50, target_profit_pct = 10, max_drawdown_pct = 5, min_trades = 15, min_active_days = 5, fail_rate_pct = 90 WHERE title ILIKE '%50%';
UPDATE public.contests SET entry_price_usd = 100, target_profit_pct = 12, max_drawdown_pct = 4, min_trades = 20, min_active_days = 7, fail_rate_pct = 97 WHERE title ILIKE '%100%';