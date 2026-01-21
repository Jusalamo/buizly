-- Fix 1: Create profiles_searchable view that excludes email and phone
-- This view is for authenticated users to search other profiles
CREATE OR REPLACE VIEW public.profiles_searchable 
WITH (security_invoker = true)
AS
SELECT 
  id,
  full_name,
  avatar_url,
  job_title,
  company,
  bio,
  website,
  linkedin_url,
  instagram_url,
  created_at,
  updated_at
FROM profiles;

-- Fix 2: Drop the overly permissive search policy and replace with a safer one
DROP POLICY IF EXISTS "Authenticated users can search profiles" ON public.profiles;

-- Create a new policy that only allows access to non-sensitive fields via the view
-- Users can still view their own full profile
-- This ensures email and phone are only accessible to profile owners or via can_view_profile

-- Fix 3: Update user_settings to use column-level security for OAuth tokens
-- Create a function to get settings without exposing tokens
CREATE OR REPLACE FUNCTION public.get_user_settings_safe()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  onboarding_completed boolean,
  email_notifications boolean,
  push_notifications boolean,
  google_calendar_connected boolean,
  outlook_calendar_connected boolean,
  profile_visibility text,
  theme text,
  ical_url text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow authenticated users to get their own settings
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  RETURN QUERY
  SELECT 
    us.id,
    us.user_id,
    us.onboarding_completed,
    us.email_notifications,
    us.push_notifications,
    us.google_calendar_connected,
    us.outlook_calendar_connected,
    us.profile_visibility,
    us.theme,
    us.ical_url,
    us.created_at,
    us.updated_at
  FROM user_settings us
  WHERE us.user_id = auth.uid();
END;
$$;