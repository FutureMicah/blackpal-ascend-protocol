
-- 1. Global alert config (single row)
CREATE TABLE IF NOT EXISTS public.class_analytics_alert_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  retry_threshold numeric NOT NULL DEFAULT 0.20 CHECK (retry_threshold > 0 AND retry_threshold <= 1),
  error_threshold numeric NOT NULL DEFAULT 0.10 CHECK (error_threshold > 0 AND error_threshold <= 1),
  min_loads integer NOT NULL DEFAULT 5 CHECK (min_loads >= 1),
  debounce_minutes integer NOT NULL DEFAULT 30 CHECK (debounce_minutes >= 1 AND debounce_minutes <= 1440),
  email_enabled boolean NOT NULL DEFAULT false,
  slack_enabled boolean NOT NULL DEFAULT false,
  email_recipients text[] NOT NULL DEFAULT ARRAY[]::text[],
  slack_webhook_url text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE ON public.class_analytics_alert_config TO authenticated;
GRANT ALL ON public.class_analytics_alert_config TO service_role;
ALTER TABLE public.class_analytics_alert_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage alert config" ON public.class_analytics_alert_config;
CREATE POLICY "Admins manage alert config" ON public.class_analytics_alert_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

INSERT INTO public.class_analytics_alert_config (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- 2. Per-breakpoint/orientation overrides
CREATE TABLE IF NOT EXISTS public.class_analytics_alert_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  breakpoint text,
  orientation text,
  retry_threshold numeric CHECK (retry_threshold IS NULL OR (retry_threshold > 0 AND retry_threshold <= 1)),
  error_threshold numeric CHECK (error_threshold IS NULL OR (error_threshold > 0 AND error_threshold <= 1)),
  min_loads integer CHECK (min_loads IS NULL OR min_loads >= 1),
  debounce_minutes integer CHECK (debounce_minutes IS NULL OR (debounce_minutes >= 1 AND debounce_minutes <= 1440)),
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE (breakpoint, orientation)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_analytics_alert_overrides TO authenticated;
GRANT ALL ON public.class_analytics_alert_overrides TO service_role;
ALTER TABLE public.class_analytics_alert_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage overrides" ON public.class_analytics_alert_overrides;
CREATE POLICY "Admins manage overrides" ON public.class_analytics_alert_overrides
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 3. Dedupe log
CREATE TABLE IF NOT EXISTS public.class_analytics_alerts_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signature text NOT NULL,
  kind text NOT NULL,
  breakpoint text,
  orientation text,
  rate numeric,
  loads integer,
  channels text[] NOT NULL DEFAULT ARRAY[]::text[],
  sent_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.class_analytics_alerts_sent TO authenticated;
GRANT ALL ON public.class_analytics_alerts_sent TO service_role;
ALTER TABLE public.class_analytics_alerts_sent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read alerts sent" ON public.class_analytics_alerts_sent;
CREATE POLICY "Admins read alerts sent" ON public.class_analytics_alerts_sent
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX IF NOT EXISTS idx_alerts_sent_signature_time
  ON public.class_analytics_alerts_sent (signature, sent_at DESC);
