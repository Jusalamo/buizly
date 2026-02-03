// Calendar & Notes Types

export interface CalendarEvent {
  id: string;
  user_id: string;
  external_id?: string;
  source: 'local' | 'google' | 'outlook';
  calendar_id?: string;
  calendar_name?: string;
  calendar_color?: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  timezone: string;
  recurrence_rule?: string;
  recurrence_id?: string;
  attendees: EventAttendee[];
  reminders: EventReminder[];
  color?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  busy: boolean;
  visibility: 'default' | 'public' | 'private';
  meeting_link?: string;
  meeting_notes_id?: string;
  has_notes: boolean;
  created_at: string;
  updated_at: string;
  synced_at?: string;
}

export interface EventAttendee {
  email: string;
  name?: string;
  status: 'accepted' | 'declined' | 'tentative' | 'needsAction';
  optional?: boolean;
}

export interface EventReminder {
  type: 'notification' | 'email' | 'push';
  minutes: number;
}

export interface UserCalendar {
  id: string;
  user_id: string;
  calendar_id: string;
  source: 'google' | 'outlook' | 'local';
  name: string;
  color: string;
  is_primary: boolean;
  is_visible: boolean;
  is_synced: boolean;
  access_role: 'owner' | 'writer' | 'reader';
  created_at: string;
  updated_at: string;
  last_sync_at?: string;
}

export interface ReminderSettings {
  id: string;
  user_id: string;
  event_type: 'meeting' | 'deadline' | 'appointment';
  default_reminders: EventReminder[];
  snooze_duration: number;
  working_hours_start: string;
  working_hours_end: string;
  working_days: number[];
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface EventTemplate {
  id: string;
  user_id: string;
  name: string;
  title: string;
  description?: string;
  duration: number;
  location?: string;
  meeting_link_type?: 'zoom' | 'google_meet' | 'teams';
  color?: string;
  default_reminders: EventReminder[];
  include_notes_template: boolean;
  notes_template?: string;
  created_at: string;
  updated_at: string;
}

export interface MeetingNote {
  id: string;
  meeting_id?: string;
  user_id?: string;
  title?: string;
  text_note?: string;
  audio_note_url?: string;
  photo_urls?: string[];
  category: string;
  tags: string[];
  ai_summary?: string;
  ai_action_items: ActionItem[];
  ai_decisions: string[];
  ai_highlights: string[];
  transcript?: string;
  transcript_speakers: TranscriptSpeaker[];
  is_pinned: boolean;
  bookmarks: Bookmark[];
  linked_contact_ids: string[];
  linked_company?: string;
  linked_project?: string;
  is_standalone: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActionItem {
  id: string;
  text: string;
  assignee?: string;
  deadline?: string;
  completed: boolean;
}

export interface TranscriptSpeaker {
  id: string;
  name: string;
  color: string;
}

export interface Bookmark {
  id: string;
  timestamp: number;
  label: string;
  created_at: string;
}

export interface NotesCategory {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
  created_at: string;
}

export type CalendarView = 'day' | 'week' | 'month' | 'agenda';

export interface TimeSlot {
  start: Date;
  end: Date;
  isBusy: boolean;
}

export interface FreeBusyData {
  calendars: {
    [calendarId: string]: {
      busy: TimeSlot[];
    };
  };
}
