import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Meeting, MeetingParticipant, MeetingStatus } from '@/types/database';

interface CreateMeetingData {
  title: string;
  description?: string;
  meeting_date: string;
  meeting_time: string;
  location?: string;
  connection_id?: string;
  participants?: { email: string; name?: string }[];
  parent_meeting_id?: string;
}

export function useMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  // Clean up past meetings automatically
  const cleanupPastMeetings = useCallback(async (userId: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      // Get past meetings
      const { data: pastMeetings } = await supabase
        .from('meetings')
        .select('id')
        .eq('user_id', userId)
        .lt('meeting_date', todayStr);

      if (pastMeetings && pastMeetings.length > 0) {
        for (const meeting of pastMeetings) {
          // Clear parent references
          await supabase
            .from('meetings')
            .update({ parent_meeting_id: null })
            .eq('parent_meeting_id', meeting.id);

          // Delete participants
          await supabase
            .from('meeting_participants')
            .delete()
            .eq('meeting_id', meeting.id);

          // Delete notes
          await supabase
            .from('meeting_notes')
            .delete()
            .eq('meeting_id', meeting.id);

          // Delete the meeting
          await supabase
            .from('meetings')
            .delete()
            .eq('id', meeting.id);
        }
        console.log(`Cleaned up ${pastMeetings.length} past meetings`);
      }
    } catch (error) {
      console.error('Error cleaning up past meetings:', error);
    }
  }, []);

  const fetchMeetings = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Clean up past meetings first
      await cleanupPastMeetings(user.id);

      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .or(`user_id.eq.${user.id},organizer_id.eq.${user.id}`)
        .order('meeting_date', { ascending: true });

      if (error) throw error;

      const typedData = (data || []).map(item => ({
        ...item,
        status: (item.status || 'pending') as MeetingStatus
      }));

      setMeetings(typedData);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  }, [cleanupPastMeetings]);

  const createMeeting = useCallback(async (meetingData: CreateMeetingData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get organizer profile
      const { data: organizerProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .insert({
          user_id: user.id,
          organizer_id: user.id,
          title: meetingData.title,
          description: meetingData.description || null,
          meeting_date: meetingData.meeting_date,
          meeting_time: meetingData.meeting_time,
          location: meetingData.location || null,
          connection_id: meetingData.connection_id || null,
          parent_meeting_id: meetingData.parent_meeting_id || null,
          status: 'pending' as MeetingStatus
        })
        .select()
        .single();

      if (meetingError) throw meetingError;

      // Add participants if provided
      if (meetingData.participants && meetingData.participants.length > 0) {
        const participantsToInsert = meetingData.participants.map(p => ({
          meeting_id: meeting.id,
          email: p.email,
          name: p.name || null,
          response: 'pending' as MeetingStatus
        }));

        const { error: participantsError } = await supabase
          .from('meeting_participants')
          .insert(participantsToInsert);

        if (participantsError) throw participantsError;

        // Send email invitations to all participants
        for (const participant of meetingData.participants) {
          try {
            await supabase.functions.invoke('send-meeting-invitation', {
              body: {
                meetingId: meeting.id,
                participantEmail: participant.email,
                participantName: participant.name,
                meetingTitle: meetingData.title,
                meetingDate: meetingData.meeting_date,
                meetingTime: meetingData.meeting_time,
                meetingLocation: meetingData.location,
                meetingDescription: meetingData.description,
                organizerName: organizerProfile?.full_name || 'A Buizly user',
                organizerEmail: organizerProfile?.email || user.email,
              }
            });
            console.log(`Meeting invitation sent to ${participant.email}`);
          } catch (emailError) {
            console.error(`Failed to send invitation to ${participant.email}:`, emailError);
            // Don't fail the meeting creation if email fails
          }
        }
      }

      // Check if Google Calendar is connected and create event
      try {
        const { data: settings } = await supabase
          .from('user_settings')
          .select('google_calendar_connected')
          .eq('user_id', user.id)
          .single();

        if (settings?.google_calendar_connected) {
          const meetingDateTime = new Date(`${meetingData.meeting_date}T${meetingData.meeting_time}`);
          const endDateTime = new Date(meetingDateTime.getTime() + 60 * 60 * 1000);

          const attendees = meetingData.participants?.map(p => p.email) || [];

          const { data: calendarData } = await supabase.functions.invoke('google-create-event', {
            body: {
              title: meetingData.title,
              description: meetingData.description || '',
              startDateTime: meetingDateTime.toISOString(),
              endDateTime: endDateTime.toISOString(),
              location: meetingData.location || '',
              attendees
            }
          });

          if (calendarData?.eventId) {
            await supabase
              .from('meetings')
              .update({ google_calendar_event_id: calendarData.eventId })
              .eq('id', meeting.id);
          }
        }
      } catch (calendarError) {
        console.error('Error creating calendar event:', calendarError);
      }

      await fetchMeetings();
      return meeting;
    } catch (error) {
      console.error('Error creating meeting:', error);
      throw error;
    }
  }, [fetchMeetings]);

  const updateMeeting = useCallback(async (
    meetingId: string, 
    updates: Partial<Meeting>
  ) => {
    try {
      const { error } = await supabase
        .from('meetings')
        .update(updates)
        .eq('id', meetingId);

      if (error) throw error;

      await fetchMeetings();
    } catch (error) {
      console.error('Error updating meeting:', error);
      throw error;
    }
  }, [fetchMeetings]);

  const cancelMeeting = useCallback(async (meetingId: string) => {
    try {
      const { error } = await supabase
        .from('meetings')
        .update({ status: 'cancelled' as MeetingStatus })
        .eq('id', meetingId);

      if (error) throw error;

      await fetchMeetings();
    } catch (error) {
      console.error('Error cancelling meeting:', error);
      throw error;
    }
  }, [fetchMeetings]);

  const deleteMeeting = useCallback(async (meetingId: string) => {
    try {
      // First, clear parent_meeting_id references for child meetings
      await supabase
        .from('meetings')
        .update({ parent_meeting_id: null })
        .eq('parent_meeting_id', meetingId);

      // Delete meeting participants
      await supabase
        .from('meeting_participants')
        .delete()
        .eq('meeting_id', meetingId);

      // Delete meeting notes
      await supabase
        .from('meeting_notes')
        .delete()
        .eq('meeting_id', meetingId);

      // Now delete the meeting
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId);

      if (error) throw error;

      await fetchMeetings();
    } catch (error) {
      console.error('Error deleting meeting:', error);
      throw error;
    }
  }, [fetchMeetings]);

  const getMeetingParticipants = useCallback(async (meetingId: string) => {
    try {
      const { data, error } = await supabase
        .from('meeting_participants')
        .select('*')
        .eq('meeting_id', meetingId);

      if (error) throw error;

      return (data || []).map(item => ({
        ...item,
        response: (item.response || 'pending') as MeetingStatus
      })) as MeetingParticipant[];
    } catch (error) {
      console.error('Error fetching participants:', error);
      return [];
    }
  }, []);

  const addParticipant = useCallback(async (
    meetingId: string,
    email: string,
    name?: string,
    userId?: string
  ) => {
    try {
      const { error } = await supabase
        .from('meeting_participants')
        .insert({
          meeting_id: meetingId,
          email,
          name: name || null,
          user_id: userId || null,
          response: 'pending' as MeetingStatus
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding participant:', error);
      throw error;
    }
  }, []);

  const updateParticipantResponse = useCallback(async (
    participantId: string,
    response: MeetingStatus,
    suggestedTime?: string
  ) => {
    try {
      const { error } = await supabase
        .from('meeting_participants')
        .update({
          response,
          responded_at: new Date().toISOString(),
          suggested_time: suggestedTime || null
        })
        .eq('id', participantId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating participant response:', error);
      throw error;
    }
  }, []);

  const removeParticipant = useCallback(async (participantId: string) => {
    try {
      const { error } = await supabase
        .from('meeting_participants')
        .delete()
        .eq('id', participantId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing participant:', error);
      throw error;
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  return {
    meetings,
    loading,
    createMeeting,
    updateMeeting,
    cancelMeeting,
    deleteMeeting,
    getMeetingParticipants,
    addParticipant,
    updateParticipantResponse,
    removeParticipant,
    refetch: fetchMeetings
  };
}
