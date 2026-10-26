-- Payment gate: a browser session can never mark a payment completed or flip
-- profiles.payment_completed. Only the server (service role: paystack-verify and
-- paystack-webhook) or an admin can. A client may only create a PENDING payment row.

CREATE OR REPLACE FUNCTION public.is_payment_privileged()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.role() = 'service_role'
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin');
$$;

-- payments: clients can insert only pending rows with no transaction reference,
-- and cannot change payment_status / completed_at afterwards.
CREATE OR REPLACE FUNCTION public.guard_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_payment_privileged() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.payment_status := 'pending';
    NEW.completed_at := NULL;
    NEW.transaction_id := NULL;
  ELSE
    NEW.payment_status := OLD.payment_status;
    NEW.completed_at := OLD.completed_at;
    NEW.transaction_id := OLD.transaction_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_payments_status ON public.payments;
CREATE TRIGGER guard_payments_status
BEFORE INSERT OR UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.guard_payment_status();

-- profiles: clients cannot grant themselves access. Changes are silently reverted
-- so an ordinary profile save from a stale form never errors.
CREATE OR REPLACE FUNCTION public.guard_profile_payment_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_payment_privileged() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.payment_completed := false;
    NEW.activated_at := NULL;
  ELSE
    NEW.payment_completed := OLD.payment_completed;
    NEW.activated_at := OLD.activated_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profiles_payment_completed ON public.profiles;
CREATE TRIGGER guard_profiles_payment_completed
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_profile_payment_completed();
