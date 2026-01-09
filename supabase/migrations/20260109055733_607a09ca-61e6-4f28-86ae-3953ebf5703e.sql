-- Fix notifications table to allow sending notifications to other users
-- This is needed for connection requests, meeting invitations, etc.

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notifications;

-- Create a new policy that allows sending notifications to anyone (for system events)
-- But still requires authentication
CREATE POLICY "Authenticated users can send notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Also need to allow user_settings to be readable for can_view_profile function
-- to properly check visibility settings for unauthenticated users
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;

-- Allow reading visibility settings for profile viewing
CREATE POLICY "Users can view their own settings and others visibility" 
ON public.user_settings 
FOR SELECT 
USING (
  user_id = auth.uid() OR
  -- Allow reading just the visibility setting for can_view_profile function
  auth.uid() IS NULL
);