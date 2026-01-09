-- Fix the overly permissive INSERT policy on profile_views
-- Replace "WITH CHECK (true)" with a proper check that validates the profile_id exists

DROP POLICY IF EXISTS "Anyone can create profile views" ON public.profile_views;

-- Create a more restrictive policy that allows inserts but validates the profile exists
CREATE POLICY "Anyone can create profile views for existing profiles" 
ON public.profile_views 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = profile_id
  )
);