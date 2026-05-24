CREATE OR REPLACE FUNCTION public.get_my_admin_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN 'super_admin'
    WHEN public.has_role(auth.uid(), 'admin'::public.app_role) THEN 'admin'
    WHEN public.has_role(auth.uid(), 'finance'::public.app_role) THEN 'finance'
    WHEN public.has_role(auth.uid(), 'editor'::public.app_role) THEN 'editor'
    WHEN public.has_role(auth.uid(), 'customer_support'::public.app_role) THEN 'customer_support'
    ELSE NULL
  END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_roles'
      AND policyname = 'Admins can view role assignments'
  ) THEN
    CREATE POLICY "Admins can view role assignments"
    ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (
      public.has_role(auth.uid(), 'super_admin'::public.app_role)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    );
  END IF;
END $$;