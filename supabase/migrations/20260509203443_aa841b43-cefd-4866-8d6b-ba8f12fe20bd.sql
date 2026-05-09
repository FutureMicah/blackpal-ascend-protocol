
DO $$
DECLARE v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = 'futuremicah4@gmail.com' LIMIT 1;
  IF v_uid IS NULL THEN RAISE NOTICE 'No such user'; RETURN; END IF;

  UPDATE auth.users
    SET encrypted_password = crypt('BlackPal@2026', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now()
  WHERE id = v_uid;

  INSERT INTO public.user_roles(user_id, role) VALUES (v_uid, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.admin_pins(user_id, pin_hash)
  VALUES (v_uid, crypt('4303', gen_salt('bf')))
  ON CONFLICT (user_id) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, updated_at = now();
END $$;
