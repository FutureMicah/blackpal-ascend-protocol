
-- Ensure crypto extension for PIN hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Promote futuremicah4@gmail.com to super_admin
DO $$
DECLARE v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = 'futuremicah4@gmail.com' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'super_admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- 2. Admin PINs (one per admin)
CREATE TABLE IF NOT EXISTS public.admin_pins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_pins owner read"
  ON public.admin_pins FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

-- No direct write policies; mutations only via SECURITY DEFINER RPCs

-- Seed super admin PIN = 4303
INSERT INTO public.admin_pins (user_id, pin_hash)
SELECT id, crypt('4303', gen_salt('bf'))
FROM auth.users WHERE lower(email) = 'futuremicah4@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, updated_at = now();

-- 3. Admin signup requests
CREATE TABLE IF NOT EXISTS public.admin_signup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  requested_role text NOT NULL DEFAULT 'admin'
    CHECK (requested_role IN ('admin','editor','customer_support','finance')),
  pin_hash text NOT NULL,
  face_photo_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  reviewer_id uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS admin_signup_requests_user_pending_uniq
  ON public.admin_signup_requests(user_id) WHERE status = 'pending';

ALTER TABLE public.admin_signup_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_req self read"
  ON public.admin_signup_requests FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "admin_req self insert"
  ON public.admin_signup_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin_req super update"
  ON public.admin_signup_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'super_admin'));

-- 4. Storage bucket for admin face photos (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('admin-faces', 'admin-faces', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "admin-faces self upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'admin-faces' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "admin-faces self read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'admin-faces' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'super_admin')
  ));

-- 5. RPC: verify the calling admin's PIN
CREATE OR REPLACE FUNCTION public.verify_admin_pin(_pin text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_hash text; v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;
  SELECT pin_hash INTO v_hash FROM public.admin_pins WHERE user_id = v_uid;
  IF v_hash IS NULL THEN RETURN false; END IF;
  RETURN crypt(_pin, v_hash) = v_hash;
END $$;

-- 6. RPC: set/change own PIN (only if you have an admin role or pending request)
CREATE OR REPLACE FUNCTION public.set_admin_pin(_pin text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _pin !~ '^[0-9]{4,8}$' THEN RAISE EXCEPTION 'PIN must be 4-8 digits'; END IF;
  INSERT INTO public.admin_pins (user_id, pin_hash)
  VALUES (v_uid, crypt(_pin, gen_salt('bf')))
  ON CONFLICT (user_id) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, updated_at = now();
END $$;

-- 7. RPC: submit admin signup request (called after auth signup)
CREATE OR REPLACE FUNCTION public.submit_admin_request(
  _email text,
  _display_name text,
  _requested_role text,
  _pin text,
  _face_photo_path text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _pin !~ '^[0-9]{4,8}$' THEN RAISE EXCEPTION 'PIN must be 4-8 digits'; END IF;
  IF _face_photo_path IS NULL OR length(_face_photo_path) < 1 THEN
    RAISE EXCEPTION 'Face photo is required';
  END IF;

  INSERT INTO public.admin_signup_requests
    (user_id, email, display_name, requested_role, pin_hash, face_photo_path)
  VALUES
    (v_uid, _email, _display_name, COALESCE(_requested_role,'admin'),
     crypt(_pin, gen_salt('bf')), _face_photo_path)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- 8. RPC: super admin approves a request (grants role + stores PIN)
CREATE OR REPLACE FUNCTION public.approve_admin_request(_request_id uuid, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r public.admin_signup_requests%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only super admin can approve';
  END IF;
  SELECT * INTO r FROM public.admin_signup_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'Already processed'; END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (r.user_id, r.requested_role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.admin_pins (user_id, pin_hash)
  VALUES (r.user_id, r.pin_hash)
  ON CONFLICT (user_id) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, updated_at = now();

  UPDATE public.admin_signup_requests
    SET status='approved', reviewer_id=auth.uid(), reviewed_at=now(), review_note=_note
    WHERE id = _request_id;
END $$;

-- 9. RPC: super admin rejects a request
CREATE OR REPLACE FUNCTION public.reject_admin_request(_request_id uuid, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only super admin can reject';
  END IF;
  UPDATE public.admin_signup_requests
    SET status='rejected', reviewer_id=auth.uid(), reviewed_at=now(), review_note=_note
    WHERE id = _request_id AND status = 'pending';
END $$;
