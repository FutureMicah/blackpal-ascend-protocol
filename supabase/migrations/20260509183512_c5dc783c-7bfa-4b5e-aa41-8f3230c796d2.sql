-- Defaults: balances start at 0, admin-controlled
ALTER TABLE public.profiles ALTER COLUMN virtual_currency SET DEFAULT 0;
ALTER TABLE public.trader_accounts ALTER COLUMN current_balance SET DEFAULT 0;
ALTER TABLE public.trader_accounts ALTER COLUMN highest_balance SET DEFAULT 0;
ALTER TABLE public.user_prop_accounts ALTER COLUMN account_balance SET DEFAULT 0;
ALTER TABLE public.user_prop_accounts ALTER COLUMN highest_balance SET DEFAULT 0;
ALTER TABLE public.user_prop_accounts ALTER COLUMN current_equity SET DEFAULT 0;
ALTER TABLE public.user_prop_accounts ALTER COLUMN starting_balance SET DEFAULT 0;

-- Zero out existing balances (admin must fund explicitly)
UPDATE public.profiles SET virtual_currency = 0 WHERE virtual_currency IS DISTINCT FROM 0;
UPDATE public.trader_accounts SET current_balance = 0, highest_balance = 0
  WHERE current_balance IS DISTINCT FROM 0 OR highest_balance IS DISTINCT FROM 0;
UPDATE public.user_prop_accounts
  SET account_balance = 0, highest_balance = 0, current_equity = 0, starting_balance = 0
  WHERE account_balance IS DISTINCT FROM 0
     OR highest_balance IS DISTINCT FROM 0
     OR current_equity IS DISTINCT FROM 0
     OR starting_balance IS DISTINCT FROM 0;