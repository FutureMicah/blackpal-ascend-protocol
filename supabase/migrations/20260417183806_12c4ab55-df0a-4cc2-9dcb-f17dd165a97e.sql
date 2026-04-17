CREATE TABLE IF NOT EXISTS public.user_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  country TEXT,
  country_code TEXT,
  region TEXT,
  city TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  accuracy_source TEXT NOT NULL DEFAULT 'ip',
  is_online BOOLEAN DEFAULT false,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_locations_coords ON public.user_locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_user_locations_country ON public.user_locations(country_code);

ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all locations"
  ON public.user_locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own location"
  ON public.user_locations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own location"
  ON public.user_locations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own location"
  ON public.user_locations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER user_locations_updated_at
  BEFORE UPDATE ON public.user_locations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();