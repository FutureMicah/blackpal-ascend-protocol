-- Fix storage exposure: Make avatars bucket private and add RLS policies

-- Step 1: Make avatars bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'avatars';

-- Step 2: Add RLS policies on storage.objects for avatar access control

-- Allow users to upload their own avatars
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own avatars
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow avatar access based on profile visibility
CREATE POLICY "Public profile avatars are accessible"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'avatars' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id::text = (storage.foldername(name))[1]
    AND profile_visibility = 'public'
  )
);

-- Users can always view their own avatar
CREATE POLICY "Users can view own avatar"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);