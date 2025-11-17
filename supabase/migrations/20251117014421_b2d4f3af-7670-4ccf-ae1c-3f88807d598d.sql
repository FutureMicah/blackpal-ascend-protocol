-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('student', 'investor', 'admin', 'moderator');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create payment_tier enum
CREATE TYPE public.payment_tier AS ENUM ('NIGERIA', 'AFRICA', 'INTERNATIONAL');

-- Create payment_status enum
CREATE TYPE public.payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'expired');

-- Create payment_method enum
CREATE TYPE public.payment_method AS ENUM ('paystack', 'flutterwave', 'bank_transfer', 'ussd', 'voucher', 'crypto_trc20', 'crypto_bsc');

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  payment_tier payment_tier NOT NULL,
  payment_method payment_method NOT NULL,
  amount_usd DECIMAL(10, 2) NOT NULL,
  amount_local DECIMAL(10, 2),
  local_currency TEXT,
  payment_status payment_status DEFAULT 'pending',
  crypto_network TEXT,
  crypto_tx_hash TEXT,
  crypto_wallet_address TEXT,
  invoice_expires_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for payments
CREATE POLICY "Users can view their own payments"
ON public.payments
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments"
ON public.payments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments"
ON public.payments
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Add new payment and gamification fields to profiles table (skip country as it exists)
ALTER TABLE public.profiles ADD COLUMN continent TEXT;
ALTER TABLE public.profiles ADD COLUMN is_nigeria BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN is_africa BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN payment_tier payment_tier;
ALTER TABLE public.profiles ADD COLUMN payment_required BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN payment_completed BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN activated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN google_id TEXT;
ALTER TABLE public.profiles ADD COLUMN xp_points INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN rank_level INTEGER DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN citizenship_rank TEXT DEFAULT 'Visitor';
ALTER TABLE public.profiles ADD COLUMN streak_days INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE;

-- Create trigger for updated_at on payments
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Function to assign student role on signup
CREATE OR REPLACE FUNCTION public.assign_default_student_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$$;

-- Trigger to assign student role when profile is created
CREATE TRIGGER on_profile_created_assign_role
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.assign_default_student_role();