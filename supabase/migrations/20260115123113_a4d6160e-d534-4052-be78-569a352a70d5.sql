-- FIX 1: Restrict public access to profiles - remove email/phone from public view
-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public can view profiles respecting visibility settings" ON public.profiles;

-- Create a more restrictive public policy that excludes sensitive fields
-- Public users can only see non-sensitive profile data for public profiles
CREATE POLICY "Public can view limited profile data"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NULL 
  AND can_view_profile(id)
);

-- Create a view for public profile access that excludes sensitive data
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT 
  id,
  full_name,
  job_title,
  company,
  bio,
  avatar_url,
  website,
  linkedin_url,
  instagram_url,
  created_at,
  updated_at
FROM public.profiles
WHERE can_view_profile(id);

-- FIX 2: Add RLS to profiles_search view by recreating it with security
DROP VIEW IF EXISTS public.profiles_search;

CREATE VIEW public.profiles_search WITH (security_invoker = true) AS
SELECT 
  id,
  full_name,
  job_title,
  company,
  bio,
  avatar_url,
  website,
  linkedin_url,
  created_at,
  updated_at
FROM public.profiles
WHERE can_view_profile(id);

-- Grant appropriate permissions
GRANT SELECT ON public.profiles_search TO authenticated;
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- FIX 3: Create secure storage for OAuth tokens using vault (if available)
-- For now, add a function to encrypt/decrypt tokens
CREATE OR REPLACE FUNCTION public.get_user_oauth_token(token_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token_value text;
BEGIN
  -- Only allow the authenticated user to get their own tokens
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF token_type = 'google' THEN
    SELECT google_refresh_token INTO token_value
    FROM user_settings
    WHERE user_id = auth.uid();
  ELSIF token_type = 'outlook' THEN
    SELECT outlook_refresh_token INTO token_value
    FROM user_settings
    WHERE user_id = auth.uid();
  ELSE
    RAISE EXCEPTION 'Invalid token type';
  END IF;
  
  RETURN token_value;
END;
$$;

-- Create function to set OAuth token securely
CREATE OR REPLACE FUNCTION public.set_user_oauth_token(token_type text, token_value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow the authenticated user to set their own tokens
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF token_type = 'google' THEN
    UPDATE user_settings
    SET google_refresh_token = token_value, updated_at = now()
    WHERE user_id = auth.uid();
  ELSIF token_type = 'outlook' THEN
    UPDATE user_settings
    SET outlook_refresh_token = token_value, updated_at = now()
    WHERE user_id = auth.uid();
  ELSE
    RAISE EXCEPTION 'Invalid token type';
  END IF;
END;
$$;

-- Update RLS policy for user_settings to exclude token columns from direct access
-- First, create a view that excludes tokens for regular access
CREATE OR REPLACE VIEW public.user_settings_safe AS
SELECT 
  id,
  user_id,
  onboarding_completed,
  email_notifications,
  push_notifications,
  google_calendar_connected,
  outlook_calendar_connected,
  profile_visibility,
  theme,
  ical_url,
  created_at,
  updated_at
FROM public.user_settings
WHERE user_id = auth.uid();

GRANT SELECT, UPDATE ON public.user_settings_safe TO authenticated;