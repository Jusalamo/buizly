-- =====================================================
-- COMPREHENSIVE CALENDAR & AI NOTES SYSTEM
-- =====================================================

-- 1. MEETING NOTES TABLE (Enhanced for AI-powered notes)
-- Already exists as meeting_notes, but we need to enhance it
ALTER TABLE public.meeting_notes 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ai_summary TEXT,
ADD COLUMN IF NOT EXISTS ai_action_items JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS ai_decisions JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS ai_highlights JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS transcript TEXT,
ADD COLUMN IF NOT EXISTS transcript_speakers JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS bookmarks JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS linked_contact_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS linked_company TEXT,
ADD COLUMN IF NOT EXISTS linked_project TEXT,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_standalone BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 2. CREATE CALENDAR EVENTS TABLE (for multi-calendar support)
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_id TEXT,
  source TEXT DEFAULT 'local',
  calendar_id TEXT,
  calendar_name TEXT,
  calendar_color TEXT DEFAULT '#00ff4d',
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN DEFAULT false,
  timezone TEXT DEFAULT 'UTC',
  recurrence_rule TEXT,
  recurrence_id UUID,
  attendees JSONB DEFAULT '[]',
  reminders JSONB DEFAULT '[{"type": "notification", "minutes": 15}]',
  color TEXT,
  status TEXT DEFAULT 'confirmed',
  busy BOOLEAN DEFAULT true,
  visibility TEXT DEFAULT 'default',
  meeting_link TEXT,
  meeting_notes_id UUID,
  has_notes BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, external_id, source)
);

-- 3. CREATE USER CALENDARS TABLE
CREATE TABLE IF NOT EXISTS public.user_calendars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calendar_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'google',
  name TEXT NOT NULL,
  color TEXT DEFAULT '#00ff4d',
  is_primary BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  is_synced BOOLEAN DEFAULT true,
  access_role TEXT DEFAULT 'reader',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, calendar_id, source)
);

-- 4. CREATE REMINDER SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.reminder_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT DEFAULT 'meeting',
  default_reminders JSONB DEFAULT '[{"type": "notification", "minutes": 15}, {"type": "email", "minutes": 60}]',
  snooze_duration INTEGER DEFAULT 5,
  working_hours_start TIME DEFAULT '09:00',
  working_hours_end TIME DEFAULT '17:00',
  working_days INTEGER[] DEFAULT '{1,2,3,4,5}',
  timezone TEXT DEFAULT 'America/New_York',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 5. CREATE EVENT TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS public.event_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration INTEGER DEFAULT 60,
  location TEXT,
  meeting_link_type TEXT,
  color TEXT,
  default_reminders JSONB DEFAULT '[{"type": "notification", "minutes": 15}]',
  include_notes_template BOOLEAN DEFAULT true,
  notes_template TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. CREATE NOTES CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.notes_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#00ff4d',
  icon TEXT DEFAULT 'folder',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- 7. CREATE SNOOZED REMINDERS TABLE
CREATE TABLE IF NOT EXISTS public.snoozed_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID,
  meeting_id UUID,
  snooze_until TIMESTAMP WITH TIME ZONE NOT NULL,
  original_reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
  reminder_type TEXT DEFAULT 'notification',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snoozed_reminders ENABLE ROW LEVEL SECURITY;

-- Calendar Events Policies
CREATE POLICY "Users can view their own calendar events"
ON public.calendar_events FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own calendar events"
ON public.calendar_events FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar events"
ON public.calendar_events FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar events"
ON public.calendar_events FOR DELETE USING (auth.uid() = user_id);

-- User Calendars Policies
CREATE POLICY "Users can view their own calendars"
ON public.user_calendars FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own calendars"
ON public.user_calendars FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendars"
ON public.user_calendars FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendars"
ON public.user_calendars FOR DELETE USING (auth.uid() = user_id);

-- Reminder Settings Policies
CREATE POLICY "Users can view their own reminder settings"
ON public.reminder_settings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reminder settings"
ON public.reminder_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminder settings"
ON public.reminder_settings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminder settings"
ON public.reminder_settings FOR DELETE USING (auth.uid() = user_id);

-- Event Templates Policies
CREATE POLICY "Users can view their own event templates"
ON public.event_templates FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own event templates"
ON public.event_templates FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own event templates"
ON public.event_templates FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own event templates"
ON public.event_templates FOR DELETE USING (auth.uid() = user_id);

-- Notes Categories Policies
CREATE POLICY "Users can view their own notes categories"
ON public.notes_categories FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes categories"
ON public.notes_categories FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes categories"
ON public.notes_categories FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes categories"
ON public.notes_categories FOR DELETE USING (auth.uid() = user_id);

-- Snoozed Reminders Policies
CREATE POLICY "Users can view their own snoozed reminders"
ON public.snoozed_reminders FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own snoozed reminders"
ON public.snoozed_reminders FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own snoozed reminders"
ON public.snoozed_reminders FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own snoozed reminders"
ON public.snoozed_reminders FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON public.calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_source ON public.calendar_events(source);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_user_id ON public.meeting_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_category ON public.meeting_notes(category);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_is_pinned ON public.meeting_notes(is_pinned);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION public.update_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_calendar_events_timestamp ON public.calendar_events;
CREATE TRIGGER update_calendar_events_timestamp
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.update_calendar_events_updated_at();

DROP TRIGGER IF EXISTS update_user_calendars_timestamp ON public.user_calendars;
CREATE TRIGGER update_user_calendars_timestamp
BEFORE UPDATE ON public.user_calendars
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_reminder_settings_timestamp ON public.reminder_settings;
CREATE TRIGGER update_reminder_settings_timestamp
BEFORE UPDATE ON public.reminder_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_event_templates_timestamp ON public.event_templates;
CREATE TRIGGER update_event_templates_timestamp
BEFORE UPDATE ON public.event_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();