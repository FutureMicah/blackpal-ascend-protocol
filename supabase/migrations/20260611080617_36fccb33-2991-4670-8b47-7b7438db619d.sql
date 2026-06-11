ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS energy_mode text NOT NULL DEFAULT 'pulse'
    CHECK (energy_mode IN ('pulse','silent')),
  ADD COLUMN IF NOT EXISTS atlas_camera jsonb;