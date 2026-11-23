-- Per-contest maximum entry capacity (max_entries)
--
-- Impact / preview (read before applying; do NOT apply without approval):
--   * Adds public.contests.max_entries integer NULL. NULL = unlimited, so
--     every existing contest keeps its current behaviour (no new cap,
--     nobody is locked out, no rows are deleted or rewritten).
--   * Adds a BEFORE INSERT trigger on public.contest_entries that rejects
--     a NEW join once the contest is full (entrant count >= max_entries)
--     with SQLSTATE P0001 "contest is full" / "contest is over capacity".
--   * Admin / super_admin and service_role bypass the cap, so an admin can
--     still add people by hand and the scoring/recompute flow is untouched.
--   * Lowering the cap below the current entrant count deletes nobody:
--     the contest simply reads full/over-capacity and new joins block
--     until the entrant count drops under the cap again.
--   * No RLS policy changes, no grant changes. Existing policies and grants
--     are untouched.
--   * Field is nullable and has a CHECK (max_entries IS NULL OR >= 1);
--     a data-preserving, reversible addition (drop the column to undo).
--
-- NOTE: committed to the repo first and applied to the live database only
-- after explicit approval. Deploying the app code alone does NOT require
-- this migration: the UI treats a missing column as unlimited.

ALTER TABLE public.contests
  ADD COLUMN IF NOT EXISTS max_entries integer NULL;

-- Replace any previous constraint with a clean one.
ALTER TABLE public.contests
  DROP CONSTRAINT IF EXISTS contests_max_entries_min_check;
ALTER TABLE public.contests
  ADD CONSTRAINT contests_max_entries_min_check
  CHECK (max_entries IS NULL OR max_entries >= 1);

-- Only admins may set the cap via the UI. RLS already restricts INSERT/UPDATE
-- on contests to admins ("contests admin write" policy), so no grant change
-- is applied here; the app-layer path is admin-only and the DB trigger below
-- is the enforcement authority for joins.

-- Server-side authority: block new joins once the contest is at/over cap.
-- Runs BEFORE the existing seed trigger (tg_contest_entry_seed) so a
-- rejected join never gets scored or ranked.
CREATE OR REPLACE FUNCTION public.enforce_contest_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max int;
  v_count int;
  v_is_admin boolean := false;
BEGIN
  -- Admins (and service_role, which has no auth.uid()) may add entries by
  -- hand regardless of the cap.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  BEGIN
    v_is_admin := public.has_role(auth.uid(), 'admin')
               OR public.has_role(auth.uid(), 'super_admin');
  EXCEPTION WHEN OTHERS THEN
    v_is_admin := false;
  END;
  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  -- Lock the contest row so concurrent joins serialise on the cap check.
  SELECT c.max_entries INTO v_max
    FROM public.contests c
   WHERE c.id = NEW.contest_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'contest not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_max IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_count
    FROM public.contest_entries
   WHERE contest_id = NEW.contest_id;

  IF v_count > v_max THEN
    RAISE EXCEPTION 'contest is over capacity (% of % spots taken), new entries are closed',
      v_count, v_max
      USING ERRCODE = 'P0001';
  ELSIF v_count >= v_max THEN
    RAISE EXCEPTION 'contest is full (% of % spots taken), new entries are closed',
      v_count, v_max
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_contest_capacity ON public.contest_entries;
CREATE TRIGGER trg_enforce_contest_capacity
BEFORE INSERT ON public.contest_entries
FOR EACH ROW EXECUTE FUNCTION public.enforce_contest_capacity();
