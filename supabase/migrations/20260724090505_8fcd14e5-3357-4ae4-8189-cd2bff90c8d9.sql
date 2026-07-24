ALTER TABLE public.class_analytics_alerts_sent
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS attempted_channels text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS errors jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_alerts_sent_status_time
  ON public.class_analytics_alerts_sent (status, sent_at DESC);