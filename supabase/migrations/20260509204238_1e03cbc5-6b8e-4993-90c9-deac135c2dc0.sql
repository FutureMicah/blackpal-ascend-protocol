CREATE OR REPLACE FUNCTION public.verify_admin_pin(_pin text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash text;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT pin_hash INTO v_hash
  FROM public.admin_pins
  WHERE user_id = v_uid;

  IF v_hash IS NULL THEN
    RETURN false;
  END IF;

  RETURN extensions.crypt(_pin, v_hash) = v_hash;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_admin_pin(_pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _pin !~ '^[0-9]{4,8}$' THEN
    RAISE EXCEPTION 'PIN must be 4-8 digits';
  END IF;

  INSERT INTO public.admin_pins (user_id, pin_hash)
  VALUES (v_uid, extensions.crypt(_pin, extensions.gen_salt('bf')))
  ON CONFLICT (user_id) DO UPDATE
    SET pin_hash = EXCLUDED.pin_hash,
        updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_admin_request(
  _email text,
  _display_name text,
  _requested_role text,
  _pin text,
  _face_photo_path text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _pin !~ '^[0-9]{4,8}$' THEN
    RAISE EXCEPTION 'PIN must be 4-8 digits';
  END IF;

  IF _face_photo_path IS NULL OR length(_face_photo_path) < 1 THEN
    RAISE EXCEPTION 'Face photo is required';
  END IF;

  INSERT INTO public.admin_signup_requests
    (user_id, email, display_name, requested_role, pin_hash, face_photo_path)
  VALUES
    (v_uid, _email, _display_name, COALESCE(_requested_role, 'admin'), extensions.crypt(_pin, extensions.gen_salt('bf')), _face_photo_path)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

UPDATE public.admin_pins
SET pin_hash = extensions.crypt('4303', extensions.gen_salt('bf')),
    updated_at = now()
WHERE user_id = (
  SELECT id FROM auth.users WHERE lower(email) = 'futuremicah4@gmail.com' LIMIT 1
);