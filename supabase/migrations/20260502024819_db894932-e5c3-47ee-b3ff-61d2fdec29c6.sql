REVOKE EXECUTE ON FUNCTION public.fund_wallet(uuid, numeric, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.spend_wallet(numeric, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reward_user(uuid, numeric, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.allocate_sponsor_btax(uuid, numeric, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.fund_wallet(uuid, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.spend_wallet(numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reward_user(uuid, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_sponsor_btax(uuid, numeric, text) TO authenticated;