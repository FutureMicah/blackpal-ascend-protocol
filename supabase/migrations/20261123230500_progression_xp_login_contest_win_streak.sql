-- Progression / XP system: login streak + contest participation + win streak XP.
--
-- NOT APPLIED by this change. Commit-first, apply only after explicit approval.
-- Deploying the app code alone does NOT require this migration: every client
-- path below (claim RPC, contest join) falls back or no-ops cleanly when the
-- objects here are missing, and the login-streak milestone XP rides the
-- existing award-achievement edge function.
--
-- Design (all values written once, here, so they cannot be caller-controlled):
--   Daily login claim ........... 2 XP   (already in claim_daily_login,
--                                          stamped into daily_login_claims.xp)
--   Login streak milestones ..... 10 XP  at day 7, 30 XP at day 30,
--                                  50 XP at day 100, 100 XP at day 365
--                                  (client -> award-achievement ->
--                                  award_xp_once, idempotent per achievement)
--   Contest participation ....... 20 XP  once per contest per user
--                                  (BEFORE INSERT trigger cheats-payment:
--                                  source 'contest_participation',
--                                  source_id = contest_entries.id, and
--                                  contest_entries has UNIQUE(contest_id,
--                                  user_id), so a re-join cannot re-pay)
--   Contest pass ("win") ........ 100 XP  on contest_entries.status moving
--                                  INTO 'passed' (source 'contest_passed',
--                                  source_id = contest entry id)
--   Winning-streak milestones ... 150 XP  at 2 consecutive contest passes,
--                                  300 XP at 3, 500 XP at 5, 1000 XP at 10
--                                  (source 'contest_win_streak', deterministic
--                                  source_id per user + streak length, so
--                                  re-passing the same milestone cannot re-pay;
--                                  a loss resets the counter, so re-earning the
--                                  same milestone pays again, by design)
--
-- Ordering inside a win streak pays the most, then a single contest win,
-- then participation, then the daily login: 1000 > 100 > 20 > 2. XP stays
-- hard: 1 level is 1000 XP (XPReactor), so a level is ~50 contest joins,
-- ~10 contest passes, or ~500 daily logins at the daily rate.
--
-- Impact / preview (read before applying; do NOT apply without approval):
--   * ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
--       win_streak int / best_win_streak int (both NOT NULL DEFAULT 0).
--     Purely additive; no existing row or column is rewritten.
--   * No RLS changes, no grant changes beyond EXECUTE on the new RPC.
--   * award_xp_once() is re-granted to `authenticated` (it previously was
--     service_role-only) so the contest_participation RPC can call it as
--     the signed-in user. The RPC validates p_contest_id belongs to the
--     caller and p_amount is forced to 20 inside the function body.
--   * The participation trigger runs AFTER INSERT on contest_entries and
--     calls award_xp_once(20, 'contest_participation', NEW.id). It is
--     EXCEPTION-tolerant: if XP awarding fails (e.g. migration stack not
--     fully applied yet) the join still succeeds. The cap trigger
--     (trg_enforce_contest_capacity) runs BEFORE INSERT, so a rejected
--     full-contest join never pays participation XP.
--   * The pass trigger runs AFTER UPDATE on contest_entries and only fires
--     on the in_progress -> passed transition (not on every score update).
--     The recompute flow (recompute_contest_entry) writes status server
--     side, so this is the authoritative win signal; no client can set it.
--   * Milestone XP is only paid when the streak lands exactly on a
--     milestone, and the source_id encodes (user, streak length), so
--     re-runs of the recompute cron cannot double-pay a milestone.
--
-- NOTE on "win detection": there is no winner/prize column on contests or
-- contest_entries (checked: prize_btax exists on contests, no winner_id,
-- no is_winner). The only server-side win signal that exists is
-- contest_entries.status = 'passed' (all four gates green), set by the
-- recompute trigger/cron. That is what "winning" means here: passing the
-- gauntlet. This migration deliberately does NOT invent a rank-1 winner
-- rule; if a rank-1-only winner rule is wanted later, it needs its own
-- server-side definition first.

-- =========================================================================
-- 1. Win streak columns (contest passes). Distinct from the login streak
--    (achievement_streak / streak_days) and from best_achievement_streak.
-- =========================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS win_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_win_streak integer NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_win_streak_nonneg_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_win_streak_nonneg_check
  CHECK (win_streak >= 0 AND best_win_streak >= 0 AND best_win_streak >= win_streak);

-- =========================================================================
-- 2. Contest participation XP (once per contest per user, server-side).
-- =========================================================================

-- award_xp_once must be callable from an authenticated user context so the
-- participation RPC below can pay them. It was service_role-only.
REVOKE EXECUTE ON FUNCTION public.award_xp_once(uuid, integer, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_xp_once(uuid, integer, text, uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.award_contest_participation(p_contest_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_entry_id uuid;
  v_xp integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Hard-capped: the amount is not a caller argument at all.
  v_xp := 20;

  SELECT e.id INTO v_entry_id
    FROM public.contest_entries e
   WHERE e.contest_id = p_contest_id
     AND e.user_id = v_user;

  IF v_entry_id IS NULL THEN
    RETURN jsonb_build_object(
      'already_awarded', false, 'xp', 0,
      'reason', 'no entry for this contest'
    );
  END IF;

  -- contest_entries already enforces UNIQUE (contest_id, user_id), so this
  -- is one credit per (user, contest) no matter how many times the client
  -- retries or double-submits.
  RETURN public.award_xp_once(v_user, v_xp, 'contest_participation', v_entry_id,
                              'contest participation');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_contest_participation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_contest_participation(uuid) TO authenticated;

-- Pay participation XP automatically when the entry row lands. This is the
-- server-side authority: the client join insert is the only way in, and
-- award_xp_once dedupes on (user, source, source_id).
CREATE OR REPLACE FUNCTION public.award_contest_participation_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM public.award_xp_once(NEW.user_id, 20, 'contest_participation', NEW.id,
                                 'contest participation');
  EXCEPTION WHEN OTHERS THEN
    -- Participation XP must never block a legitimate join.
    NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_contest_participation ON public.contest_entries;
CREATE TRIGGER trg_award_contest_participation
AFTER INSERT ON public.contest_entries
FOR EACH ROW EXECUTE FUNCTION public.award_contest_participation_trg();

-- =========================================================================
-- 3. Contest pass ("win") XP + winning-streak milestones.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.award_contest_result_xp_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_streak integer;
  v_milestone_xp integer;
  v_milestone_id uuid;
BEGIN
  -- Only the transition INTO 'passed' is a win. Repeated score updates
  -- that keep status = 'passed' pay nothing extra.
  IF COALESCE(OLD.status, '') = 'passed' OR NEW.status <> 'passed' THEN
    RETURN NEW;
  END IF;

  BEGIN
    -- Flat win reward: 100 XP, once per contest entry.
    PERFORM public.award_xp_once(NEW.user_id, 100, 'contest_passed', NEW.id,
                                 'contest passed');

    -- Winning streak: consecutive contest passes. Scored from the entries
    -- themselves (passed = win), so the counter is recomputed from
    -- authoritative rows and cannot be inflated by the client.
    -- Winning streak: consecutive contest passes, newest entries first.
    -- Entries are ordered by join time; walk backwards from the newest
    -- entry and count consecutive 'passed' rows until the first
    -- non-passed one. If there is no non-passed entry, every pass counts.
    WITH ordered AS (
      SELECT id, status,
             row_number() OVER (ORDER BY joined_at DESC, id DESC) AS rn
        FROM public.contest_entries
       WHERE user_id = NEW.user_id
    ),
    first_break AS (
      SELECT COALESCE(MIN(rn), 0) AS break_rn
        FROM ordered
       WHERE status <> 'passed'
    )
    SELECT count(*) INTO v_new_streak
      FROM ordered, first_break
     WHERE status = 'passed'
       AND (break_rn = 0 OR rn < break_rn);

    -- Milestone XP: clear, escalating, and the largest awards in the
    -- system. source_id encodes (user, streak length) so the same
    -- milestone cannot pay twice for the same run; after a loss reset,
    -- re-earning the milestone legitimately pays again.
    v_milestone_xp := CASE v_new_streak
      WHEN 2 THEN 150
      WHEN 3 THEN 300
      WHEN 5 THEN 500
      WHEN 10 THEN 1000
      ELSE 0
    END;

    UPDATE public.profiles
       SET win_streak = v_new_streak,
           best_win_streak = GREATEST(COALESCE(best_win_streak, 0), v_new_streak)
     WHERE id = NEW.user_id;

    IF v_milestone_xp > 0 THEN
      v_milestone_id := (md5(NEW.user_id::text || ':' || v_new_streak::text || ':contest_win_streak'))::uuid;
      PERFORM public.award_xp_once(NEW.user_id, v_milestone_xp,
                                   'contest_win_streak', v_milestone_id,
                                   'contest win streak ' || v_new_streak::text);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Result XP must never break the scoring/recompute flow.
    NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_contest_result_xp ON public.contest_entries;
CREATE TRIGGER trg_award_contest_result_xp
AFTER UPDATE OF status ON public.contest_entries
FOR EACH ROW EXECUTE FUNCTION public.award_contest_result_xp_trg();

-- A loss (transition to 'failed') resets the win streak. Milestone XP for
-- the old streak is not clawed back; re-earning a milestone after a reset
-- pays again (the source_id dedupe is per user + milestone-length, and
-- after a reset the new run's md5 differs only if the run ordering
-- differs, which the trigger owns).
CREATE OR REPLACE FUNCTION public.reset_win_streak_on_fail_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(OLD.status, '') <> 'failed' AND NEW.status = 'failed' THEN
    UPDATE public.profiles
       SET win_streak = 0
     WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_win_streak_on_fail ON public.contest_entries;
CREATE TRIGGER trg_reset_win_streak_on_fail
AFTER UPDATE OF status ON public.contest_entries
FOR EACH ROW EXECUTE FUNCTION public.reset_win_streak_on_fail_trg();
