-- Add database constraints for input validation
ALTER TABLE public.profiles
ADD CONSTRAINT username_length CHECK (length(username) BETWEEN 3 AND 30),
ADD CONSTRAINT username_format CHECK (username ~ '^[a-z0-9_]+$'),
ADD CONSTRAINT bio_length CHECK (length(bio) <= 500),
ADD CONSTRAINT phone_format CHECK (phone_number ~ '^\+?[0-9]{10,15}$' OR phone_number IS NULL),
ADD CONSTRAINT display_name_length CHECK (length(display_name) BETWEEN 1 AND 100),
ADD CONSTRAINT website_url_length CHECK (length(website_url) <= 255 OR website_url IS NULL),
ADD CONSTRAINT twitter_handle_length CHECK (length(twitter_handle) <= 50 OR twitter_handle IS NULL),
ADD CONSTRAINT linkedin_url_length CHECK (length(linkedin_url) <= 255 OR linkedin_url IS NULL),
ADD CONSTRAINT github_handle_length CHECK (length(github_handle) <= 50 OR github_handle IS NULL),
ADD CONSTRAINT instagram_handle_length CHECK (length(instagram_handle) <= 50 OR instagram_handle IS NULL);

-- Create function to auto-create profile stub on user signup (fixes race condition)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', 'User')
  );
  RETURN NEW;
END;
$$;

-- Trigger to auto-create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add policy to allow viewing public profiles (fixes isolation issue)
CREATE POLICY "Users can view public profiles"
ON public.profiles
FOR SELECT
USING (
  profile_visibility = 'public' 
  OR auth.uid() = id
);

-- Add policy to allow users to delete their own profile
CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
USING (auth.uid() = id);