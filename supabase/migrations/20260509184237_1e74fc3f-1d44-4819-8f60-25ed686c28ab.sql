ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS naira_balance numeric(18,2) NOT NULL DEFAULT 0
  CHECK (naira_balance >= 0);