-- First, check if profiles_public is a view or table and recreate it properly with RLS
-- Drop the existing view if it exists
DROP VIEW IF EXISTS public.profiles_public;

-- Recreate as a secure view that respects profile_visibility settings
CREATE OR REPLACE VIEW public.profiles_public 
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
JOIN user_settings us ON us.user_id = p.id
WHERE us.profile_visibility = 'public'
   OR (
     us.profile_visibility = 'connections_only' 
     AND (
       auth.uid() = p.id 
       OR EXISTS (
         SELECT 1 FROM connections 
         WHERE user_id = auth.uid() 
         AND connection_email = p.email
       )
     )
   )
   OR auth.uid() = p.id;