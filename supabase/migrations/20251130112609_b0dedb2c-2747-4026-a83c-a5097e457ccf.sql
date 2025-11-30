-- Add profile visibility and Google Calendar fields to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS profile_visibility text DEFAULT 'public' CHECK (profile_visibility IN ('public', 'connections', 'private')),
ADD COLUMN IF NOT EXISTS google_calendar_connected boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS google_refresh_token text,
ADD COLUMN IF NOT EXISTS theme text DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'auto'));

-- Add avatar_url to profiles for profile pictures
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create storage bucket for profile pictures if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);