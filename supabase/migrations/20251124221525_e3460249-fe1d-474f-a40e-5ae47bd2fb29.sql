-- Add theme customization columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS theme_background TEXT DEFAULT 'default',
ADD COLUMN IF NOT EXISTS theme_font TEXT DEFAULT 'inter',
ADD COLUMN IF NOT EXISTS theme_layout TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS theme_accent_color TEXT DEFAULT 'purple';

-- Create profile_views table for analytics
CREATE TABLE IF NOT EXISTS public.profile_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewer_country TEXT,
  viewer_continent TEXT,
  viewer_city TEXT,
  referrer TEXT,
  user_agent TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profile_views
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- Profile owners can view their own analytics
CREATE POLICY "Profile owners can view their analytics"
  ON public.profile_views
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = profile_views.profile_id
      AND profiles.id = auth.uid()
    )
  );

-- Anyone can insert profile views (for tracking)
CREATE POLICY "Anyone can track profile views"
  ON public.profile_views
  FOR INSERT
  WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX idx_profile_views_profile_id ON public.profile_views(profile_id);
CREATE INDEX idx_profile_views_viewed_at ON public.profile_views(viewed_at DESC);
CREATE INDEX idx_profile_views_viewer_country ON public.profile_views(viewer_country);

-- Create a view for profile analytics summary
CREATE OR REPLACE VIEW public.profile_analytics_summary AS
SELECT 
  profile_id,
  COUNT(*) as total_views,
  COUNT(DISTINCT viewer_id) as unique_visitors,
  COUNT(DISTINCT viewer_country) as countries_count,
  COUNT(*) FILTER (WHERE viewed_at >= NOW() - INTERVAL '7 days') as views_last_7_days,
  COUNT(*) FILTER (WHERE viewed_at >= NOW() - INTERVAL '30 days') as views_last_30_days,
  MAX(viewed_at) as last_viewed_at
FROM public.profile_views
GROUP BY profile_id;

-- Grant access to the analytics summary view
GRANT SELECT ON public.profile_analytics_summary TO authenticated;
GRANT SELECT ON public.profile_analytics_summary TO anon;