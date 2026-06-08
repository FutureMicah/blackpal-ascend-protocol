
ALTER TABLE public.xp_tier_config
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS payout_naira numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rules_description text;

ALTER TABLE public.account_requests
  ALTER COLUMN requested_size_naira DROP DEFAULT;

DELETE FROM public.xp_tier_config;
