-- Security fixes migration

-- 1. Create function to check profile visibility (SECURITY DEFINER to avoid RLS recursion)
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
  
  -- Public profiles are visible to everyone
  IF vis IS NULL OR vis = 'public' THEN 
    RETURN true; 
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

-- 2. Update profiles SELECT policy to use the visibility function
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Users can view profiles based on visibility" 
ON profiles 
FOR SELECT 
USING (public.can_view_profile(id));

-- 3. Restrict notifications INSERT policy - only allow system to insert via service role
-- Users should use the edge function which validates and sanitizes input
DROP POLICY IF EXISTS "Users can insert notifications for others" ON notifications;
CREATE POLICY "Users can insert their own notifications" 
ON notifications 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- 4. Add UPDATE and DELETE policies for meeting_notes
CREATE POLICY "Users can update notes for their meetings"
ON meeting_notes FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM meetings 
    WHERE meetings.id = meeting_notes.meeting_id 
    AND meetings.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete notes for their meetings"
ON meeting_notes FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM meetings 
    WHERE meetings.id = meeting_notes.meeting_id 
    AND meetings.user_id = auth.uid()
  )
);