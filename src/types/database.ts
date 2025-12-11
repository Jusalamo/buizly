// Extended types for the application
export type MeetingStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled' | 'rescheduled';

export type NotificationType = 
  | 'meeting_request'
  | 'meeting_confirmed'
  | 'meeting_declined'
  | 'meeting_cancelled'
  | 'meeting_rescheduled'
  | 'meeting_reminder'
  | 'new_participant'
  | 'profile_shared'
  | 'new_connection'
  | 'follow_up_scheduled';

export interface MeetingParticipant {
  id: string;
  meeting_id: string;
  user_id: string | null;
  email: string;
  name: string | null;
  response: MeetingStatus;
  responded_at: string | null;
  suggested_time: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, any> | null;
  read: boolean;
  created_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  onboarding_completed: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  profile_visibility: string;
  google_calendar_connected: boolean;
  google_refresh_token: string | null;
  outlook_calendar_connected: boolean;
  outlook_refresh_token: string | null;
  ical_url: string | null;
  theme: string;
  created_at: string;
  updated_at: string;
}

export interface Meeting {
  id: string;
  user_id: string;
  connection_id: string | null;
  meeting_date: string;
  meeting_time: string;
  follow_up_sent: boolean;
  created_at: string;
  title: string | null;
  description: string | null;
  location: string | null;
  status: MeetingStatus;
  organizer_id: string | null;
  google_calendar_event_id: string | null;
  reminder_24h_sent: boolean;
  reminder_1h_sent: boolean;
  parent_meeting_id: string | null;
}

export interface Connection {
  id: string;
  user_id: string;
  connection_name: string;
  connection_title: string | null;
  connection_email: string | null;
  connection_phone: string | null;
  connection_company: string | null;
  notes: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  job_title: string | null;
  company: string | null;
  email: string;
  phone: string | null;
  website: string | null;
  bio: string | null;
  qr_code_url: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}
