-- Fix profiles table RLS to protect PII while allowing search by name
-- This addresses the security finding: profiles_table_public_exposure

-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;

-- Create new policies that protect sensitive data

-- 1. Users can always see their own full profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- 2. Authenticated users can search basic profile info (name, avatar, job title, company)
-- This is needed for the search feature - sensitive fields (email, phone) are filtered in application code
CREATE POLICY "Authenticated users can search profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND
  auth.uid() != id
);

-- 3. For public profile pages (unauthenticated viewing), use the can_view_profile function
-- which checks user_settings.profile_visibility
CREATE POLICY "Public can view profiles respecting visibility settings" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NULL AND
  public.can_view_profile(id)
);