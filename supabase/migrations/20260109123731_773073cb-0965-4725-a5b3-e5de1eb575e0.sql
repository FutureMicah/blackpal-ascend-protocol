-- Make avatars bucket public so uploaded images can be viewed
UPDATE storage.buckets SET public = true WHERE id = 'avatars';