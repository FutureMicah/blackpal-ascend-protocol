
-- Login activity log
CREATE TABLE public.login_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  login_method text NOT NULL DEFAULT 'password',
  device_info text,
  ip_address text,
  user_agent text,
  country text,
  city text,
  is_suspicious boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.login_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own login activity"
ON public.login_activity FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own login activity"
ON public.login_activity FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Enable realtime for login activity alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.login_activity;
