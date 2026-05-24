REVOKE ALL ON FUNCTION public.get_my_admin_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_admin_role() TO authenticated;

REVOKE ALL ON FUNCTION public.verify_admin_pin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_admin_pin(text) TO authenticated;

REVOKE ALL ON FUNCTION public.set_admin_pin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_admin_pin(text) TO authenticated;