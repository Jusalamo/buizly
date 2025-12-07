-- Drop and recreate the can_view_profile function to handle anonymous users properly
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
  
  -- Get visibility setting (default to 'public' if not found)
  SELECT profile_visibility INTO vis 
  FROM user_settings 
  WHERE user_id = profile_id;
  
  -- Public profiles are visible to everyone (including anonymous users)
  IF vis IS NULL OR vis = 'public' THEN 
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