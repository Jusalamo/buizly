-- Create the gallery bucket as private (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery', 'gallery', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- RLS Policy: Users can upload their own gallery photos
CREATE POLICY "Users can upload their own gallery photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'gallery' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policy: Users can view gallery photos if they have profile access
CREATE POLICY "Users can view gallery photos with profile access"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'gallery' AND
  (auth.uid()::text = (storage.foldername(name))[1] OR
   public.can_view_profile((storage.foldername(name))[1]::uuid))
);

-- RLS Policy: Users can update their own gallery photos
CREATE POLICY "Users can update their own gallery photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'gallery' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policy: Users can delete their own gallery photos
CREATE POLICY "Users can delete their own gallery photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'gallery' AND
  auth.uid()::text = (storage.foldername(name))[1]
);