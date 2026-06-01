
-- Add custom pattern URL column for users who upload their own Adinkra/tribal pattern
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme_custom_pattern_url TEXT;

-- Create public bucket for user-uploaded theme patterns
INSERT INTO storage.buckets (id, name, public)
VALUES ('theme-patterns', 'theme-patterns', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: public read; user can manage their own files (foldered by user id)
CREATE POLICY "Theme patterns are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'theme-patterns');

CREATE POLICY "Users upload their own theme patterns"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'theme-patterns'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users update their own theme patterns"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'theme-patterns'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users delete their own theme patterns"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'theme-patterns'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
