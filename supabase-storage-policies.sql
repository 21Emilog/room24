-- ===========================
-- STORAGE BUCKET POLICIES FOR VOICE MESSAGES
-- Run this in Supabase SQL Editor to enable voice uploads
-- ===========================

-- 1. Create the voice-messages bucket if it doesn't exist
-- (You may have already created this via the Supabase dashboard)
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-messages', 'voice-messages', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow authenticated users to upload voice messages
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'voice-messages');

-- 3. Allow anyone to read voice messages (public bucket)
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'voice-messages');

-- 4. Allow users to update their own uploads
DROP POLICY IF EXISTS "Allow owner updates" ON storage.objects;
CREATE POLICY "Allow owner updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'voice-messages' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'voice-messages');

-- 5. Allow users to delete their own uploads
DROP POLICY IF EXISTS "Allow owner deletes" ON storage.objects;
CREATE POLICY "Allow owner deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'voice-messages');
