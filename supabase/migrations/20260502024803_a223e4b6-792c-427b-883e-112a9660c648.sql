-- =========================================================
-- BTAX ECONOMY: integrated cleanly with existing schema
-- =========================================================

-- 1. Extend existing profiles (additive only)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS email text;

-- 2. Add 'sponsor' to existing app_role enum (safe if already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'sponsor'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'sponsor';
  END IF;
END$$;

-- 3. Wallets
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  btax_balance numeric(18,2) NOT NULL DEFAULT 0 CHECK (btax_balance >= 0),
  naira_funded_total numeric(18,2) NOT NULL DEFAULT 0 CHECK (naira_funded_total >= 0),
  btax_spent_total numeric(18,2) NOT NULL DEFAULT 0 CHECK (btax_spent_total >= 0),
  btax_earned_total numeric(18,2) NOT NULL DEFAULT 0 CHECK (btax_earned_total >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Academy settings (enforced singleton via fixed key column)
CREATE TABLE IF NOT EXISTS public.academy_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton = true),
  btax_to_naira_rate numeric(18,2) NOT NULL DEFAULT 100 CHECK (btax_to_naira_rate > 0),
  reward_pool_balance numeric(18,2) NOT NULL DEFAULT 100000 CHECK (reward_pool_balance >= 0),
  scholarship_pool_balance numeric(18,2) NOT NULL DEFAULT 50000 CHECK (scholarship_pool_balance >= 0),
  operations_pool_balance numeric(18,2) NOT NULL DEFAULT 50000 CHECK (operations_pool_balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.academy_settings (singleton)
VALUES (true)
ON CONFLICT (singleton) DO NOTHING;

-- 5. Ledger
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('fund','spend','reward','grant','refund','adjustment')),
  btax_amount numeric(18,2) NOT NULL CHECK (btax_amount >= 0),
  naira_amount numeric(18,2) NOT NULL DEFAULT 0 CHECK (naira_amount >= 0),
  description text,
  reference text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','failed','reversed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Products
CREATE TABLE IF NOT EXISTS public.academy_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  description text,
  price_btax numeric(18,2) NOT NULL CHECK (price_btax >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Purchases
CREATE TABLE IF NOT EXISTS public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.academy_products(id) ON DELETE RESTRICT,
  wallet_transaction_id uuid REFERENCES public.wallet_transactions(id) ON DELETE SET NULL,
  amount_btax numeric(18,2) NOT NULL CHECK (amount_btax >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. Sponsor allocations
CREATE TABLE IF NOT EXISTS public.sponsor_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  btax_amount numeric(18,2) NOT NULL CHECK (btax_amount > 0),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 9. Rewards
CREATE TABLE IF NOT EXISTS public.reward_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  btax_amount numeric(18,2) NOT NULL CHECK (btax_amount > 0),
  reward_type text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 10. Indexes
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON public.wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON public.wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_product_id ON public.purchases(product_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_allocations_sponsor_user_id ON public.sponsor_allocations(sponsor_user_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_allocations_student_user_id ON public.sponsor_allocations(student_user_id);
CREATE INDEX IF NOT EXISTS idx_reward_distributions_user_id ON public.reward_distributions(user_id);

-- 11. updated_at triggers (reuse existing handle_updated_at)
DROP TRIGGER IF EXISTS set_wallets_updated_at ON public.wallets;
CREATE TRIGGER set_wallets_updated_at BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_products_updated_at ON public.academy_products;
CREATE TRIGGER set_products_updated_at BEFORE UPDATE ON public.academy_products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_settings_updated_at ON public.academy_settings;
CREATE TRIGGER set_settings_updated_at BEFORE UPDATE ON public.academy_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 12. Update handle_new_user to ALSO create a wallet (preserve existing profile logic)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.wallets (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Backfill wallets for existing profiles
INSERT INTO public.wallets (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- 13. Enable RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_settings ENABLE ROW LEVEL SECURITY;

-- 14. Policies
-- Wallets
DROP POLICY IF EXISTS "Users view own wallet" ON public.wallets;
CREATE POLICY "Users view own wallet" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins view all wallets" ON public.wallets;
CREATE POLICY "Admins view all wallets" ON public.wallets
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins update wallets" ON public.wallets;
CREATE POLICY "Admins update wallets" ON public.wallets
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Wallet transactions
DROP POLICY IF EXISTS "Users view own wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Users view own wallet transactions" ON public.wallet_transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.wallets w WHERE w.id = wallet_transactions.wallet_id AND w.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Admins view all transactions" ON public.wallet_transactions;
CREATE POLICY "Admins view all transactions" ON public.wallet_transactions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Products
DROP POLICY IF EXISTS "Auth users view active products" ON public.academy_products;
CREATE POLICY "Auth users view active products" ON public.academy_products
  FOR SELECT USING (auth.uid() IS NOT NULL AND status = 'active');
DROP POLICY IF EXISTS "Admins view all products" ON public.academy_products;
CREATE POLICY "Admins view all products" ON public.academy_products
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins manage products" ON public.academy_products;
CREATE POLICY "Admins manage products" ON public.academy_products
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Purchases
DROP POLICY IF EXISTS "Users view own purchases" ON public.purchases;
CREATE POLICY "Users view own purchases" ON public.purchases
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins view all purchases" ON public.purchases;
CREATE POLICY "Admins view all purchases" ON public.purchases
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Sponsor allocations
DROP POLICY IF EXISTS "Sponsors view their allocations" ON public.sponsor_allocations;
CREATE POLICY "Sponsors view their allocations" ON public.sponsor_allocations
  FOR SELECT USING (auth.uid() = sponsor_user_id);
DROP POLICY IF EXISTS "Students view received allocations" ON public.sponsor_allocations;
CREATE POLICY "Students view received allocations" ON public.sponsor_allocations
  FOR SELECT USING (auth.uid() = student_user_id);
DROP POLICY IF EXISTS "Admins view all allocations" ON public.sponsor_allocations;
CREATE POLICY "Admins view all allocations" ON public.sponsor_allocations
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Rewards
DROP POLICY IF EXISTS "Users view own rewards" ON public.reward_distributions;
CREATE POLICY "Users view own rewards" ON public.reward_distributions
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins view all rewards" ON public.reward_distributions;
CREATE POLICY "Admins view all rewards" ON public.reward_distributions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Settings
DROP POLICY IF EXISTS "Auth users view settings" ON public.academy_settings;
CREATE POLICY "Auth users view settings" ON public.academy_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Admins manage settings" ON public.academy_settings;
CREATE POLICY "Admins manage settings" ON public.academy_settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 15. Seed academy products
INSERT INTO public.academy_products (name, category, description, price_btax)
SELECT * FROM (VALUES
  ('Beginner Forex Class', 'course', 'Introductory forex education program', 150::numeric),
  ('Intermediate Forex Class', 'course', 'Deeper market structure and execution training', 300::numeric),
  ('Advanced Trading Bootcamp', 'bootcamp', 'High-level trading systems and live practice', 750::numeric),
  ('1-on-1 Mentorship Session', 'mentorship', 'Private mentoring session', 100::numeric),
  ('Premium Trading Room Access', 'membership', 'Access to premium rooms and research', 50::numeric),
  ('Challenge Entry', 'challenge', 'Entry ticket for academy trading challenge', 25::numeric),
  ('Certification Exam', 'certification', 'Academy certification assessment', 80::numeric)
) AS seed(name, category, description, price_btax)
WHERE NOT EXISTS (SELECT 1 FROM public.academy_products);

-- =========================================================
-- 16. Server-side money functions (SECURITY DEFINER)
-- =========================================================

CREATE OR REPLACE FUNCTION public.fund_wallet(
  p_user_id uuid,
  p_naira_amount numeric,
  p_reference text DEFAULT NULL,
  p_description text DEFAULT 'Wallet funding'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.wallets%ROWTYPE;
  v_rate numeric;
  v_btax numeric(18,2);
  v_tx_id uuid;
BEGIN
  -- Authorization: only admin can fund (or extend later for verified payment webhooks)
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized to fund wallets';
  END IF;
  IF p_naira_amount <= 0 THEN
    RAISE EXCEPTION 'Funding amount must be greater than 0';
  END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;

  SELECT btax_to_naira_rate INTO v_rate FROM public.academy_settings LIMIT 1;
  v_btax := round(p_naira_amount / v_rate, 2);

  UPDATE public.wallets
  SET btax_balance = btax_balance + v_btax,
      naira_funded_total = naira_funded_total + p_naira_amount,
      btax_earned_total = btax_earned_total + v_btax
  WHERE id = v_wallet.id;

  UPDATE public.academy_settings
  SET operations_pool_balance = operations_pool_balance + p_naira_amount;

  INSERT INTO public.wallet_transactions (wallet_id, type, btax_amount, naira_amount, description, reference, status)
  VALUES (v_wallet.id, 'fund', v_btax, p_naira_amount, p_description, p_reference, 'completed')
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.spend_wallet(
  p_btax_amount numeric,
  p_reference text DEFAULT NULL,
  p_description text DEFAULT 'Wallet spend'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.wallets%ROWTYPE;
  v_rate numeric;
  v_naira numeric(18,2);
  v_tx_id uuid;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_btax_amount <= 0 THEN RAISE EXCEPTION 'Spend amount must be greater than 0'; END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  IF v_wallet.status <> 'active' THEN RAISE EXCEPTION 'Wallet is not active'; END IF;
  IF v_wallet.btax_balance < p_btax_amount THEN RAISE EXCEPTION 'Insufficient BTAX balance'; END IF;

  SELECT btax_to_naira_rate INTO v_rate FROM public.academy_settings LIMIT 1;
  v_naira := round(p_btax_amount * v_rate, 2);

  UPDATE public.wallets
  SET btax_balance = btax_balance - p_btax_amount,
      btax_spent_total = btax_spent_total + p_btax_amount
  WHERE id = v_wallet.id;

  INSERT INTO public.wallet_transactions (wallet_id, type, btax_amount, naira_amount, description, reference, status)
  VALUES (v_wallet.id, 'spend', p_btax_amount, v_naira, p_description, p_reference, 'completed')
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reward_user(
  p_user_id uuid,
  p_btax_amount numeric,
  p_reward_type text DEFAULT 'general',
  p_note text DEFAULT 'Reward credit'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.wallets%ROWTYPE;
  v_rate numeric;
  v_naira numeric(18,2);
  v_tx_id uuid;
  v_pool numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized to issue rewards';
  END IF;
  IF p_btax_amount <= 0 THEN RAISE EXCEPTION 'Reward amount must be greater than 0'; END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;

  SELECT btax_to_naira_rate, reward_pool_balance INTO v_rate, v_pool FROM public.academy_settings LIMIT 1;
  IF v_pool < p_btax_amount THEN RAISE EXCEPTION 'Insufficient reward pool balance'; END IF;

  v_naira := round(p_btax_amount * v_rate, 2);

  UPDATE public.academy_settings SET reward_pool_balance = reward_pool_balance - p_btax_amount;

  UPDATE public.wallets
  SET btax_balance = btax_balance + p_btax_amount,
      btax_earned_total = btax_earned_total + p_btax_amount
  WHERE id = v_wallet.id;

  INSERT INTO public.wallet_transactions (wallet_id, type, btax_amount, naira_amount, description, reference, status)
  VALUES (v_wallet.id, 'reward', p_btax_amount, v_naira, p_note, NULL, 'completed')
  RETURNING id INTO v_tx_id;

  INSERT INTO public.reward_distributions (user_id, btax_amount, reward_type, note)
  VALUES (p_user_id, p_btax_amount, p_reward_type, p_note);

  RETURN v_tx_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.allocate_sponsor_btax(
  p_student_user_id uuid,
  p_btax_amount numeric,
  p_note text DEFAULT 'Sponsor allocation'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sponsor_wallet public.wallets%ROWTYPE;
  v_student_wallet public.wallets%ROWTYPE;
  v_rate numeric;
  v_naira numeric(18,2);
  v_tx_id uuid;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (public.has_role(v_uid, 'sponsor') OR public.has_role(v_uid, 'admin')) THEN
    RAISE EXCEPTION 'Not authorized to allocate sponsor BTAX';
  END IF;
  IF p_btax_amount <= 0 THEN RAISE EXCEPTION 'Allocation amount must be greater than 0'; END IF;
  IF v_uid = p_student_user_id THEN RAISE EXCEPTION 'Cannot allocate to self'; END IF;

  SELECT * INTO v_sponsor_wallet FROM public.wallets WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sponsor wallet not found'; END IF;
  SELECT * INTO v_student_wallet FROM public.wallets WHERE user_id = p_student_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Student wallet not found'; END IF;

  IF v_sponsor_wallet.btax_balance < p_btax_amount THEN
    RAISE EXCEPTION 'Insufficient sponsor BTAX balance';
  END IF;

  SELECT btax_to_naira_rate INTO v_rate FROM public.academy_settings LIMIT 1;
  v_naira := round(p_btax_amount * v_rate, 2);

  UPDATE public.wallets
  SET btax_balance = btax_balance - p_btax_amount,
      btax_spent_total = btax_spent_total + p_btax_amount
  WHERE id = v_sponsor_wallet.id;

  UPDATE public.wallets
  SET btax_balance = btax_balance + p_btax_amount,
      btax_earned_total = btax_earned_total + p_btax_amount
  WHERE id = v_student_wallet.id;

  INSERT INTO public.wallet_transactions (wallet_id, type, btax_amount, naira_amount, description, reference, status)
  VALUES (v_student_wallet.id, 'grant', p_btax_amount, v_naira, p_note, NULL, 'completed')
  RETURNING id INTO v_tx_id;

  INSERT INTO public.sponsor_allocations (sponsor_user_id, student_user_id, btax_amount, note)
  VALUES (v_uid, p_student_user_id, p_btax_amount, p_note);

  RETURN v_tx_id;
END;
$$;