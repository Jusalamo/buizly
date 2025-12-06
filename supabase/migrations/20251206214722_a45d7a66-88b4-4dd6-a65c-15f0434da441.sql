-- Create profile_views table for analytics tracking
CREATE TABLE public.profile_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewer_ip_hash TEXT,
  viewer_location TEXT,
  viewer_device TEXT,
  viewer_referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile views
CREATE POLICY "Users can view their own profile views"
ON public.profile_views
FOR SELECT
USING (profile_id = auth.uid());

-- Public insert policy for tracking (anonymous visitors can create views)
CREATE POLICY "Anyone can create profile views"
ON public.profile_views
FOR INSERT
WITH CHECK (true);

-- Create index for efficient querying
CREATE INDEX idx_profile_views_profile_id ON public.profile_views(profile_id);
CREATE INDEX idx_profile_views_created_at ON public.profile_views(created_at DESC);

-- Add linkedin_profile_url to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- Add calendar sync fields to user_settings
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS outlook_calendar_connected BOOLEAN DEFAULT false;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS outlook_refresh_token TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS ical_url TEXT;