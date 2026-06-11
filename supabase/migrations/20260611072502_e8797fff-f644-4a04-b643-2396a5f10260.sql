ALTER TABLE public.prop_trades
  ADD COLUMN IF NOT EXISTS seen_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_prop_trades_account_unseen
  ON public.prop_trades (prop_account_id)
  WHERE seen_at IS NULL;