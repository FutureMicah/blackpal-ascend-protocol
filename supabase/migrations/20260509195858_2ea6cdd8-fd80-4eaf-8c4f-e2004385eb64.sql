
-- Idempotent reference tracking for Paystack/Flutterwave gateways
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS transaction_id text;

CREATE UNIQUE INDEX IF NOT EXISTS payments_transaction_id_key
  ON public.payments(transaction_id)
  WHERE transaction_id IS NOT NULL;

-- Clear all friend activity (start fresh)
TRUNCATE TABLE public.friend_activities;
