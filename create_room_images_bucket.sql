-- ============================================
-- Room image storage setup (run in Supabase SQL Editor)
-- Creates a public bucket + RLS policies for room images
-- ============================================

-- 1. Create the public bucket (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('room-images', 'room-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow signed-in admins to upload images
CREATE POLICY "Authenticated users can upload room images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'room-images');

-- 3. Allow signed-in admins to update image metadata
CREATE POLICY "Authenticated users can update room images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'room-images');

-- 4. Allow signed-in admins to delete images
CREATE POLICY "Authenticated users can delete room images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'room-images');

-- 5. Allow public read access to room images
CREATE POLICY "Public can view room images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'room-images');
