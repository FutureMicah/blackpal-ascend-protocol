
-- System-level function used by paystack-webhook (service role) to auto-credit
-- a Naira top-up once charge.success is verified. Bypasses the admin check
-- because it is only callable when auth.uid() is NULL (i.e., service role).
CREATE OR REPLACE FUNCTION public.system_approve_wallet_topup(p_request_id uuid, p_reference text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_req public.wallet_topup_requests%ROWTYPE;
  v_wallet public.wallets%ROWTYPE;
  v_rate numeric;
  v_btax numeric(18,2);
  v_tx_id uuid;
BEGIN
  -- Only callable from service role (no authenticated user)
  IF auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'system_approve_wallet_topup is service-role only';
  END IF;

  SELECT * INTO v_req FROM public.wallet_topup_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Top-up request not found'; END IF;
  IF v_req.status <> 'pending' THEN
    -- Idempotent: already processed
    RETURN NULL;
  END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_req.user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;

  SELECT btax_to_naira_rate INTO v_rate FROM public.academy_settings LIMIT 1;
  v_btax := round(v_req.naira_amount / COALESCE(v_rate, 100), 2);

  UPDATE public.wallets
  SET btax_balance = btax_balance + v_btax,
      naira_funded_total = naira_funded_total + v_req.naira_amount,
      btax_earned_total = btax_earned_total + v_btax
  WHERE id = v_wallet.id;

  UPDATE public.academy_settings
  SET operations_pool_balance = operations_pool_balance + v_req.naira_amount;

  INSERT INTO public.wallet_transactions (wallet_id, type, btax_amount, naira_amount, description, reference, status)
  VALUES (v_wallet.id, 'fund', v_btax, v_req.naira_amount, 'Paystack top-up auto-credit', p_reference, 'completed')
  RETURNING id INTO v_tx_id;

  UPDATE public.wallet_topup_requests
  SET status = 'approved',
      reviewed_at = now(),
      review_note = 'Auto-approved by Paystack webhook (' || COALESCE(p_reference, '') || ')'
  WHERE id = p_request_id;

  RETURN v_tx_id;
END;
$function$;
