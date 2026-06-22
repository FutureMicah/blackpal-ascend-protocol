
DO $$ BEGIN
  CREATE TYPE public.live_session_provider AS ENUM ('jitsi', 'daily', 'external');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.class_live_sessions
  ADD COLUMN IF NOT EXISTS provider public.live_session_provider NOT NULL DEFAULT 'jitsi',
  ADD COLUMN IF NOT EXISTS room_name TEXT;

UPDATE public.class_live_sessions
SET room_name = COALESCE(room_name, 'blackpal-' || id::text)
WHERE room_name IS NULL;
