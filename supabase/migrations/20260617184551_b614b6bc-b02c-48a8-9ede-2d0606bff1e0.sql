ALTER TABLE public.user_prop_accounts
  ADD COLUMN IF NOT EXISTS consistency_threshold_percent numeric NOT NULL DEFAULT 40;