
ALTER TABLE public.account_requests
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES public.xp_tier_config(id) ON DELETE SET NULL;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='account_requests_status_check') THEN
    ALTER TABLE public.account_requests DROP CONSTRAINT account_requests_status_check;
  END IF;
END $$;

ALTER TABLE public.account_requests
  ADD CONSTRAINT account_requests_status_check
  CHECK (status IN ('pending','approved','rejected','fulfilled'));

CREATE OR REPLACE FUNCTION public.admin_update_account_request(
  _request_id uuid,
  _status text,
  _reason text DEFAULT NULL,
  _admin_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.account_requests%ROWTYPE;
  v_pkg_name text;
  v_title text;
  v_message text;
  v_type text;
  v_icon text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _status NOT IN ('approved','rejected','fulfilled','pending') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  SELECT * INTO v_req FROM public.account_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;

  UPDATE public.account_requests
    SET status = _status,
        rejection_reason = CASE WHEN _status='rejected' THEN _reason ELSE rejection_reason END,
        admin_notes = COALESCE(_admin_notes, admin_notes),
        reviewed_by = auth.uid(),
        reviewed_at = now()
    WHERE id = _request_id;

  SELECT tier_name INTO v_pkg_name FROM public.xp_tier_config
    WHERE id = v_req.package_id OR tier_level = v_req.requested_tier
    ORDER BY (id = v_req.package_id) DESC NULLS LAST LIMIT 1;
  v_pkg_name := COALESCE(v_pkg_name, 'Tier ' || v_req.requested_tier);

  IF _status = 'approved' THEN
    v_title := 'Account request approved';
    v_message := 'Your request for ' || v_pkg_name || ' (₦' || to_char(v_req.requested_size_naira,'FM999,999,999') || ') was approved. We are preparing your account.';
    v_type := 'success'; v_icon := '✅';
  ELSIF _status = 'rejected' THEN
    v_title := 'Account request rejected';
    v_message := 'Your request for ' || v_pkg_name || ' was rejected.' || CASE WHEN _reason IS NOT NULL AND length(_reason)>0 THEN ' Reason: ' || _reason ELSE '' END;
    v_type := 'error'; v_icon := '❌';
  ELSIF _status = 'fulfilled' THEN
    v_title := 'Account is ready';
    v_message := 'Your ' || v_pkg_name || ' account has been issued. Open Portfolio to view details.';
    v_type := 'success'; v_icon := '🎉';
  ELSE
    v_title := 'Account request updated';
    v_message := 'Status: ' || _status;
    v_type := 'info'; v_icon := '🔔';
  END IF;

  INSERT INTO public.in_app_notifications (user_id, title, message, type, icon, action_url)
  VALUES (v_req.user_id, v_title, v_message, v_type, v_icon, '/portfolio');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_account_request(uuid, text, text, text) TO authenticated;
