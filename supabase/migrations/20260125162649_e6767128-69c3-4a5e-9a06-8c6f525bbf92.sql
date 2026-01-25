-- Fix 1: Update profiles table RLS to restrict email/phone access to authenticated users only
-- Also fix profiles_public view to respect visibility settings

-- First, drop existing policies that may expose email/phone
DROP POLICY IF EXISTS "Public can view profiles via can_view_profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles based on visibility" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create a secure function to get public profile data (excluding email/phone for unauthenticated)
CREATE OR REPLACE FUNCTION public.get_public_profile_safe(profile_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  job_title text,
  company text,
  bio text,
  avatar_url text,
  website text,
  linkedin_url text,
  instagram_url text,
  gallery_photos text[],
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vis text;
  viewer uuid;
BEGIN
  viewer := auth.uid();
  
  -- Get visibility
  vis := public.get_profile_visibility(profile_id);
  
  -- If private and not the owner, return nothing
  IF vis = 'private' AND (viewer IS NULL OR viewer != profile_id) THEN
    RETURN;
  END IF;
  
  -- If connections_only and not connected, return nothing
  IF vis = 'connections_only' THEN
    IF viewer IS NULL OR viewer = profile_id THEN
      -- Owner can see their own profile
      IF viewer != profile_id THEN
        RETURN;
      END IF;
    ELSE
      -- Check if connected
      IF NOT EXISTS (
        SELECT 1 FROM connections 
        WHERE user_id = viewer 
        AND connection_email = (SELECT email FROM profiles WHERE profiles.id = profile_id)
      ) THEN
        RETURN;
      END IF;
    END IF;
  END IF;
  
  -- Return public-safe profile data (no email/phone)
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.job_title,
    p.company,
    p.bio,
    p.avatar_url,
    p.website,
    p.linkedin_url,
    p.instagram_url,
    p.gallery_photos,
    p.created_at,
    p.updated_at
  FROM profiles p
  WHERE p.id = profile_id;
END;
$$;

-- Create secure function to get full profile (with email/phone) for authenticated users only
CREATE OR REPLACE FUNCTION public.get_profile_with_contact(profile_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  job_title text,
  company text,
  bio text,
  avatar_url text,
  website text,
  linkedin_url text,
  instagram_url text,
  gallery_photos text[],
  email text,
  phone text,
  qr_code_url text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vis text;
  viewer uuid;
BEGIN
  viewer := auth.uid();
  
  -- Must be authenticated to get contact info
  IF viewer IS NULL THEN
    RETURN;
  END IF;
  
  -- Get visibility
  vis := public.get_profile_visibility(profile_id);
  
  -- Owner can always see their own profile
  IF viewer = profile_id THEN
    RETURN QUERY
    SELECT 
      p.id, p.full_name, p.job_title, p.company, p.bio, p.avatar_url,
      p.website, p.linkedin_url, p.instagram_url, p.gallery_photos,
      p.email, p.phone, p.qr_code_url, p.created_at, p.updated_at
    FROM profiles p
    WHERE p.id = profile_id;
    RETURN;
  END IF;
  
  -- If private, only owner can see
  IF vis = 'private' THEN
    RETURN;
  END IF;
  
  -- If connections_only, check connection
  IF vis = 'connections_only' THEN
    IF NOT EXISTS (
      SELECT 1 FROM connections 
      WHERE user_id = viewer 
      AND connection_email = (SELECT email FROM profiles WHERE profiles.id = profile_id)
    ) THEN
      RETURN;
    END IF;
  END IF;
  
  -- Return full profile with contact info for authenticated users who have access
  RETURN QUERY
  SELECT 
    p.id, p.full_name, p.job_title, p.company, p.bio, p.avatar_url,
    p.website, p.linkedin_url, p.instagram_url, p.gallery_photos,
    p.email, p.phone, p.qr_code_url, p.created_at, p.updated_at
  FROM profiles p
  WHERE p.id = profile_id;
END;
$$;

-- Create stricter RLS policies for profiles table
-- Only authenticated users can view profiles they have access to
CREATE POLICY "Authenticated users view profiles via can_view_profile" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND can_view_profile(id)
);

-- Users can always view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Recreate profiles_public view with security_invoker and visibility check
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public 
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  p.created_at,
  p.updated_at,
  p.full_name,
  p.job_title,
  p.company,
  p.bio,
  p.avatar_url,
  p.website,
  p.linkedin_url,
  p.instagram_url
FROM profiles p
INNER JOIN user_settings us ON us.user_id = p.id
WHERE us.profile_visibility = 'public';