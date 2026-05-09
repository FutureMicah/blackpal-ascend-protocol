-- Add USD→NGN rate to settings
ALTER TABLE public.academy_settings
  ADD COLUMN IF NOT EXISTS usd_to_ngn_rate numeric(10,2) NOT NULL DEFAULT 1500.00,
  ADD COLUMN IF NOT EXISTS gate_pass_usd numeric(10,2) NOT NULL DEFAULT 2.00;

-- Make XP harder: cut all achievement xp_reward to ~1/3
UPDATE public.achievements SET xp_reward = GREATEST(1, ROUND(xp_reward::numeric / 3));

-- ============ ACADEMY CONTENT (admin-controlled) ============
CREATE TABLE IF NOT EXISTS public.academy_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  cover_url text,
  is_published boolean NOT NULL DEFAULT false,
  display_order int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.academy_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "courses public read published" ON public.academy_courses
  FOR SELECT USING (is_published = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "courses admin write" ON public.academy_courses
  FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.academy_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  media_url text,
  media_type text CHECK (media_type IN ('video','audio','image','file','text')),
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.academy_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lessons public read" ON public.academy_lessons
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.academy_courses c WHERE c.id = course_id AND (c.is_published OR public.has_role(auth.uid(),'admin')))
  );
CREATE POLICY "lessons admin write" ON public.academy_lessons
  FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.academy_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  cta_label text,
  cta_url text,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.academy_ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ads public read active" ON public.academy_ads
  FOR SELECT USING (is_active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "ads admin write" ON public.academy_ads
  FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.contests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  prize_btax numeric(18,2) NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  rules text,
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contests public read active" ON public.contests
  FOR SELECT USING (is_active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "contests admin write" ON public.contests
  FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- BlackForge strategies (move from localStorage to DB)
CREATE TABLE IF NOT EXISTS public.user_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  asset text NOT NULL,
  timeframe text NOT NULL,
  stop_loss text,
  take_profit text,
  is_deployed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strategies own select" ON public.user_strategies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "strategies own insert" ON public.user_strategies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "strategies own update" ON public.user_strategies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "strategies own delete" ON public.user_strategies FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for academy media (admin-uploaded)
INSERT INTO storage.buckets (id, name, public)
VALUES ('academy-media','academy-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "academy-media public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'academy-media');
CREATE POLICY "academy-media admin write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'academy-media' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "academy-media admin update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'academy-media' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "academy-media admin delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'academy-media' AND public.has_role(auth.uid(),'admin'));