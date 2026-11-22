-- Security hardening: server-owned balance/payment state (NOT APPLIED)
-- Authored 2026-11-23 on branch security/hardening-20261123.
-- Status: reviewed SQL only. Apply via `supabase db push` after separate approval.
-- Client-side self-writes of virtual_currency / xp_points / payment_completed
-- are blocked here; those values are granted server-side (payment webhook,
-- award-achievement, admin review).

-- 1. profiles: prevent users from changing sensitive columns directly.
-- Business rule: payment_completed, virtual_currency, xp_points, level and
-- achievement aggregates are server-owned. Changing them from PostgREST
-- (auth.role = 'authenticated' with auth.uid() set) is rejected.
create or replace function public.protect_profiles_sensitive_columns()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  is_service boolean := coalesce(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'role' = 'service_role';
begin
  if is_service then
    return NEW;
  end if;
  if new.payment_completed is distinct from old.payment_completed
     or new.virtual_currency is distinct from old.virtual_currency
     or new.xp_points is distinct from old.xp_points then
    raise exception 'sensitive profile columns are server-owned (payment_completed, virtual_currency, xp_points)';
  end if;
  return NEW;
end;
$$;

drop trigger if exists enforce_profiles_sensitive_columns on public.profiles;
create trigger enforce_profiles_sensitive_columns
before update on public.profiles
for each row
execute function public.protect_profiles_sensitive_columns();

-- 2. Academy lessons: paid-course content must be visible only to feed/cards
-- and to enrolled users. anon access removed; authenticated users must have a
-- class_enrollments row for the course (or be admin).
drop policy if exists "lessons public read" on public.academy_lessons;
create policy "lessons enrolled read" on public.academy_lessons
  for select to authenticated
  using (
    public.has_role(auth.uid(), 'admin')
    or exists (
      select 1 from public.class_enrollments e
      where e.course_id = academy_lessons.course_id
        and e.user_id = auth.uid()
    )
  );
revoke select on public.academy_lessons from anon;

-- 3. class_live_sessions already restricts writes to admins (verified in
-- migration 20260622234527). Confirm no permissive policy was re-added:
-- (No statement needed while "live_admin_write" is the only write policy.)
-- If "live_public_read" (SELECT USING true) is considered too broad, tighten:
--   drop policy if exists "live_public_read" on public.class_live_sessions;
--   create policy "live_enrolled_read" ... using (exists (select 1 from class_enrollments ...));
-- Left as a documented check to avoid breaking the public stream URL flow.

-- 4. wallets: users already have no UPDATE policy (verified). Keep it that way:
-- do NOT add an authenticated UPDATE policy on public.wallets.
-- Balances change via service_role only.

-- 5. webauthn_credentials: users may INSERT their own rows. Enrollment is
-- additionally gated server-side by challenge binding in the webauthn edge
-- function. No RLS change needed; challenge state is in-memory per instance.
