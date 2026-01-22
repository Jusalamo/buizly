-- Fix 1: Make meeting-attachments bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'meeting-attachments';

-- Fix 2: Add proper RLS policies for meeting-attachments storage
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload meeting attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view meeting attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their meeting attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their meeting attachments" ON storage.objects;

-- Create secure policies for meeting-attachments bucket
CREATE POLICY "Users can upload meeting attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'meeting-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view meeting attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'meeting-attachments' AND
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id::text = (storage.foldername(name))[2]
      AND (m.user_id = auth.uid() OR m.organizer_id = auth.uid())
    )
  )
);

CREATE POLICY "Users can update their meeting attachments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'meeting-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their meeting attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'meeting-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Fix 3: Create a proper secure view for public profiles that excludes sensitive fields
-- Drop existing profiles_public view and recreate with security_invoker
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = true)
AS SELECT 
  id,
  created_at,
  updated_at,
  full_name,
  job_title,
  company,
  bio,
  avatar_url,
  website,
  linkedin_url,
  instagram_url
FROM public.profiles
WHERE public.can_view_profile(id);

-- Fix 4: Update profiles table RLS to not expose email/phone in public policy
-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public can view limited profile data" ON public.profiles;

-- Recreate with proper restrictions - public access only gets non-sensitive fields via the view
-- The base table should not be directly accessible to unauthenticated users
CREATE POLICY "Public can view profiles via can_view_profile"
ON public.profiles FOR SELECT
USING (
  -- Authenticated users can view based on visibility settings
  (auth.uid() IS NOT NULL AND public.can_view_profile(id))
  OR
  -- Profile owner always can view
  (auth.uid() = id)
);

-- Fix 5: Add rate limiting function for profile views (to prevent spam)
CREATE OR REPLACE FUNCTION public.check_profile_view_rate_limit(
  p_ip_hash text,
  p_profile_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
BEGIN
  -- Check how many views from this IP in the last hour
  SELECT COUNT(*) INTO recent_count
  FROM profile_views
  WHERE viewer_ip_hash = p_ip_hash
    AND profile_id = p_profile_id
    AND created_at > NOW() - INTERVAL '1 hour';
  
  -- Allow max 10 views per profile per IP per hour
  RETURN recent_count < 10;
END;
$$;

-- Update profile_views INSERT policy to use rate limiting
DROP POLICY IF EXISTS "Anyone can create profile views for existing profiles" ON public.profile_views;

CREATE POLICY "Rate limited profile view creation"
ON public.profile_views FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = profile_views.profile_id
  )
  AND (
    viewer_ip_hash IS NULL 
    OR public.check_profile_view_rate_limit(viewer_ip_hash, profile_id)
  )
);