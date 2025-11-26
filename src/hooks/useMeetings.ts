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

  const fetchMeetings = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
  }, []);

  const createMeeting = useCallback(async (meetingData: CreateMeetingData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

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
