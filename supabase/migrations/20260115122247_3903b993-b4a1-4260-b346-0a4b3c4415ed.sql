-- Fix user_settings data exposure - only allow authenticated users to read their own settings

-- Drop the permissive policy that allows unauthenticated access
DROP POLICY IF EXISTS "Users can view their own settings and others visibility" ON public.user_settings;

-- Create a strict policy - users can only view their OWN settings
CREATE POLICY "Users can view their own settings"
ON public.user_settings
FOR SELECT
USING (user_id = auth.uid());

-- Create a secure function to get profile visibility without exposing other columns
-- This function will be called by can_view_profile() instead of querying the table directly
CREATE OR REPLACE FUNCTION public.get_profile_visibility(target_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vis text;
BEGIN
  SELECT profile_visibility INTO vis 
  FROM user_settings 
  WHERE user_id = target_user_id;
  
  -- Default to 'public' if not found
  RETURN COALESCE(vis, 'public');
END;
$$;

-- Update can_view_profile to use the secure function instead of direct table access
CREATE OR REPLACE FUNCTION public.can_view_profile(profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vis text;
  viewer_id uuid;
BEGIN
  viewer_id := auth.uid();
  
  -- Get visibility setting using secure function
  vis := public.get_profile_visibility(profile_id);
  
  -- Public profiles are visible to everyone (including anonymous users)
  IF vis = 'public' THEN 
    RETURN true; 
  END IF;
  
  -- If no viewer is logged in, only public profiles are accessible
  IF viewer_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Profile owner can always view their own profile
  IF viewer_id = profile_id THEN 
    RETURN true; 
  END IF;
  
  -- For 'connections_only' - check if viewer has this profile as a connection
  IF vis = 'connections_only' THEN
    RETURN EXISTS (
      SELECT 1 FROM connections 
      WHERE user_id = viewer_id 
      AND connection_email = (SELECT email FROM profiles WHERE id = profile_id)
    );
  END IF;
  
  -- Private profiles are only visible to the owner
  IF vis = 'private' THEN
    RETURN false;
  END IF;
  
  RETURN false;
END;
$$;