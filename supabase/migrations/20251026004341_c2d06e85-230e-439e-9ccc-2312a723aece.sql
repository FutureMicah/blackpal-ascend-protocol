-- Add comprehensive profile fields
ALTER TABLE public.profiles
ADD COLUMN username text UNIQUE,
ADD COLUMN bio text,
ADD COLUMN date_of_birth date,
ADD COLUMN phone_number text,
ADD COLUMN language text DEFAULT 'en',
ADD COLUMN timezone text,
ADD COLUMN website_url text,
ADD COLUMN twitter_handle text,
ADD COLUMN linkedin_url text,
ADD COLUMN github_handle text,
ADD COLUMN instagram_handle text,
ADD COLUMN profile_visibility text DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private', 'friends')),
ADD COLUMN show_email boolean DEFAULT false,
ADD COLUMN theme_preference text DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system'));

-- Create index on username for faster lookups
CREATE INDEX idx_profiles_username ON public.profiles(username);

COMMENT ON COLUMN public.profiles.username IS 'Unique username/handle for the user';
COMMENT ON COLUMN public.profiles.bio IS 'User bio or about section';
COMMENT ON COLUMN public.profiles.profile_visibility IS 'Profile visibility setting: public, private, or friends';
COMMENT ON COLUMN public.profiles.show_email IS 'Whether to show email on profile';
COMMENT ON COLUMN public.profiles.theme_preference IS 'User theme preference: light, dark, or system';