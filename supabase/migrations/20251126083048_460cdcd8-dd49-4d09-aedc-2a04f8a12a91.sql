-- Create enum for meeting status
CREATE TYPE public.meeting_status AS ENUM ('pending', 'confirmed', 'declined', 'cancelled', 'rescheduled');

-- Create enum for notification type
CREATE TYPE public.notification_type AS ENUM (
  'meeting_request', 
  'meeting_confirmed', 
  'meeting_declined', 
  'meeting_cancelled', 
  'meeting_rescheduled',
  'meeting_reminder',
  'new_participant',
  'profile_shared',
  'new_connection',
  'follow_up_scheduled'
);

-- Add new columns to meetings table
ALTER TABLE public.meetings 
ADD COLUMN title TEXT,
ADD COLUMN description TEXT,
ADD COLUMN location TEXT,
ADD COLUMN status meeting_status DEFAULT 'pending',
ADD COLUMN organizer_id UUID REFERENCES public.profiles(id),
ADD COLUMN google_calendar_event_id TEXT,
ADD COLUMN reminder_24h_sent BOOLEAN DEFAULT false,
ADD COLUMN reminder_1h_sent BOOLEAN DEFAULT false,
ADD COLUMN parent_meeting_id UUID REFERENCES public.meetings(id);

-- Create meeting participants table
CREATE TABLE public.meeting_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  email TEXT NOT NULL,
  name TEXT,
  response meeting_status DEFAULT 'pending',
  responded_at TIMESTAMP WITH TIME ZONE,
  suggested_time TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user settings table for onboarding etc
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  onboarding_completed BOOLEAN DEFAULT false,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for meeting_participants
CREATE POLICY "Users can view participants of their meetings"
ON public.meeting_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.meetings 
    WHERE meetings.id = meeting_participants.meeting_id 
    AND (meetings.user_id = auth.uid() OR meetings.organizer_id = auth.uid())
  )
  OR user_id = auth.uid()
  OR email = (SELECT email FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can add participants to their meetings"
ON public.meeting_participants FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.meetings 
    WHERE meetings.id = meeting_participants.meeting_id 
    AND (meetings.user_id = auth.uid() OR meetings.organizer_id = auth.uid())
  )
);

CREATE POLICY "Users can update their own response"
ON public.meeting_participants FOR UPDATE
USING (
  user_id = auth.uid() 
  OR email = (SELECT email FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can delete participants from their meetings"
ON public.meeting_participants FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.meetings 
    WHERE meetings.id = meeting_participants.meeting_id 
    AND (meetings.user_id = auth.uid() OR meetings.organizer_id = auth.uid())
  )
);

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert notifications for others"
ON public.notifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (user_id = auth.uid());

-- RLS policies for user_settings
CREATE POLICY "Users can view their own settings"
ON public.user_settings FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own settings"
ON public.user_settings FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own settings"
ON public.user_settings FOR UPDATE
USING (user_id = auth.uid());

-- Create storage bucket for meeting media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('meeting-media', 'meeting-media', false);

-- Storage policies for meeting media
CREATE POLICY "Users can upload their own media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'meeting-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own media"
ON storage.objects FOR SELECT
USING (bucket_id = 'meeting-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own media"
ON storage.objects FOR DELETE
USING (bucket_id = 'meeting-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create function to auto-create user settings
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- Trigger for user settings
CREATE TRIGGER on_profile_created_settings
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_settings();