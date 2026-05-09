ALTER TABLE public.app_announcements
  ADD COLUMN IF NOT EXISTS target_roles app_role[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_app_announcements_target_roles
  ON public.app_announcements USING GIN (target_roles);

DROP POLICY IF EXISTS "Anyone authenticated can read active announcements" ON public.app_announcements;

CREATE POLICY "Authenticated users can read targeted active announcements"
ON public.app_announcements
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND starts_at <= now()
  AND (ends_at IS NULL OR ends_at > now())
  AND (
    cardinality(target_roles) = 0
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = ANY (target_roles)
    )
  )
);