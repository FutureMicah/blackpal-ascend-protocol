
-- 1. Webhook event log
CREATE TABLE IF NOT EXISTS public.paystack_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text,
  event_type text NOT NULL,
  signature_valid boolean NOT NULL DEFAULT false,
  prior_status text,
  new_status text,
  amount_minor integer,
  currency text,
  raw jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_paystack_webhook_events_ref ON public.paystack_webhook_events(reference);
CREATE INDEX IF NOT EXISTS idx_paystack_webhook_events_created ON public.paystack_webhook_events(created_at DESC);

ALTER TABLE public.paystack_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read webhook events"
ON public.paystack_webhook_events FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Admin alerts
CREATE TABLE IF NOT EXISTS public.admin_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
  user_id uuid,
  reference text,
  message text NOT NULL,
  metadata jsonb,
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_created ON public.admin_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_unack ON public.admin_alerts(acknowledged) WHERE acknowledged = false;

ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read alerts"
ON public.admin_alerts FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update alerts"
ON public.admin_alerts FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- 3. Allow refunded/disputed status (drop existing check if any, then re-add)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name LIKE 'payments_payment_status_check%'
  ) THEN
    EXECUTE 'ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_status_check';
  END IF;
END$$;

-- 4. Further reduce XP — cut current rewards in half so XP is hard to earn
UPDATE public.achievements
SET xp_reward = GREATEST(1, FLOOR(COALESCE(xp_reward,0) / 2));

-- Reset existing user XP totals to reflect new economy
UPDATE public.profiles SET xp_points = FLOOR(COALESCE(xp_points,0) / 2);
