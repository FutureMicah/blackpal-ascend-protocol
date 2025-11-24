-- Create profile_history table for tracking profile changes
CREATE TABLE IF NOT EXISTS public.profile_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  country TEXT,
  phone_number TEXT,
  changed_fields TEXT[],
  change_type TEXT NOT NULL DEFAULT 'update',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own history
CREATE POLICY "Users can view their own profile history"
  ON public.profile_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own history
CREATE POLICY "Users can insert their own profile history"
  ON public.profile_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_profile_history_user_id ON public.profile_history(user_id);
CREATE INDEX idx_profile_history_created_at ON public.profile_history(created_at DESC);

-- Add a trigger to automatically create history entries when profile is updated
CREATE OR REPLACE FUNCTION public.track_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_fields TEXT[] := '{}';
BEGIN
  -- Track which fields changed
  IF OLD.display_name IS DISTINCT FROM NEW.display_name THEN
    changed_fields := array_append(changed_fields, 'display_name');
  END IF;
  
  IF OLD.bio IS DISTINCT FROM NEW.bio THEN
    changed_fields := array_append(changed_fields, 'bio');
  END IF;
  
  IF OLD.avatar_url IS DISTINCT FROM NEW.avatar_url THEN
    changed_fields := array_append(changed_fields, 'avatar_url');
  END IF;
  
  IF OLD.country IS DISTINCT FROM NEW.country THEN
    changed_fields := array_append(changed_fields, 'country');
  END IF;
  
  IF OLD.phone_number IS DISTINCT FROM NEW.phone_number THEN
    changed_fields := array_append(changed_fields, 'phone_number');
  END IF;

  -- Only insert if there were actual changes to tracked fields
  IF array_length(changed_fields, 1) > 0 THEN
    INSERT INTO public.profile_history (
      user_id,
      display_name,
      bio,
      avatar_url,
      country,
      phone_number,
      changed_fields,
      change_type
    ) VALUES (
      NEW.id,
      NEW.display_name,
      NEW.bio,
      NEW.avatar_url,
      NEW.country,
      NEW.phone_number,
      changed_fields,
      'update'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for profile updates
DROP TRIGGER IF EXISTS track_profile_updates ON public.profiles;
CREATE TRIGGER track_profile_updates
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.track_profile_changes();