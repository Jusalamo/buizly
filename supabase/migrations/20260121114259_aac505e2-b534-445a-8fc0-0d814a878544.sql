-- Fix the infinite recursion in plugs RLS by creating a security definer function
-- The issue is that the SELECT policy checks plug_participants which also has policies checking plugs

-- Create security definer function to check if user is a participant of a plug
CREATE OR REPLACE FUNCTION public.is_plug_participant(p_plug_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM plug_participants
    WHERE plug_id = p_plug_id
    AND user_id = p_user_id
  )
$$;

-- Drop the problematic policy that causes recursion
DROP POLICY IF EXISTS "Users can view plugs they're part of" ON public.plugs;

-- Recreate policy using the security definer function
CREATE POLICY "Users can view plugs they're part of"
ON public.plugs
FOR SELECT
USING (public.is_plug_participant(id, auth.uid()));

-- Also create meeting-attachments storage bucket since it's missing
INSERT INTO storage.buckets (id, name, public)
VALUES ('meeting-attachments', 'meeting-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for meeting-attachments bucket
CREATE POLICY "Users can upload their own meeting attachments"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'meeting-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view meeting attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'meeting-attachments');

CREATE POLICY "Users can update their own meeting attachments"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'meeting-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own meeting attachments"
ON storage.objects
FOR DELETE
USING (bucket_id = 'meeting-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);