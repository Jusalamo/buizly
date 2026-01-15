-- Fix SECURITY DEFINER views by using SECURITY INVOKER instead
-- This ensures RLS policies of the querying user are respected

-- Drop and recreate profiles_public with SECURITY INVOKER
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public 
WITH (security_invoker = true) AS
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
FROM public.profiles;

-- Drop and recreate user_settings_safe with SECURITY INVOKER  
DROP VIEW IF EXISTS public.user_settings_safe;

CREATE VIEW public.user_settings_safe
WITH (security_invoker = true) AS
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
FROM public.user_settings;

-- Re-grant permissions
GRANT SELECT ON public.profiles_public TO anon, authenticated;
GRANT SELECT, UPDATE ON public.user_settings_safe TO authenticated;
GRANT SELECT ON public.profiles_search TO authenticated;