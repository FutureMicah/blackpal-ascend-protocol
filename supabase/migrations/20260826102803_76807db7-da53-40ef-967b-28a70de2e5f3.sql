REVOKE ALL ON FUNCTION public.recompute_contest_entry(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recompute_contest(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rerank_contest(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recompute_active_contests() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.contest_baseline_balance(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.recompute_contest_entry(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.recompute_contest(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.rerank_contest(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.recompute_active_contests() TO service_role;
GRANT EXECUTE ON FUNCTION public.contest_baseline_balance(uuid) TO service_role;