
CREATE TYPE public.topup_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.wallet_topup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  naira_amount numeric(18,2) NOT NULL CHECK (naira_amount > 0),
  btax_preview numeric(18,2) NOT NULL CHECK (btax_preview >= 0),
  rate_at_submission numeric(18,4) NOT NULL,
  receipt_url text,
  payer_note text,
  status public.topup_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id),
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wallet_topup_user ON public.wallet_topup_requests(user_id);
CREATE INDEX idx_wallet_topup_status ON public.wallet_topup_requests(status);

ALTER TABLE public.wallet_topup_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own topups"
  ON public.wallet_topup_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own topups"
  ON public.wallet_topup_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins update topups"
  ON public.wallet_topup_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_wallet_topup_updated
  BEFORE UPDATE ON public.wallet_topup_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.approve_wallet_topup(p_request_id uuid, p_note text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.wallet_topup_requests%ROWTYPE;
  v_tx_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized to approve top-ups';
  END IF;
  SELECT * INTO v_req FROM public.wallet_topup_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Top-up request not found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'Top-up already processed'; END IF;

  v_tx_id := public.fund_wallet(v_req.user_id, v_req.naira_amount, p_request_id::text, COALESCE('Naira top-up: ' || COALESCE(p_note,''), 'Naira top-up'));

  UPDATE public.wallet_topup_requests
  SET status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = p_note
  WHERE id = p_request_id;

  RETURN v_tx_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_wallet_topup(p_request_id uuid, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized to reject top-ups';
  END IF;
  UPDATE public.wallet_topup_requests
  SET status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = p_note
  WHERE id = p_request_id AND status = 'pending';
END;
$$;
