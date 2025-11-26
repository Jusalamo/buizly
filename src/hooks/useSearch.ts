import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Connection, Meeting, MeetingStatus } from '@/types/database';

interface SearchResults {
  connections: Connection[];
  meetings: Meeting[];
}

interface SearchFilters {
  dateFrom?: string;
  dateTo?: string;
  name?: string;
  meetingType?: string;
  location?: string;
}

export function useSearch() {
  const [results, setResults] = useState<SearchResults>({ connections: [], meetings: [] });
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string, filters?: SearchFilters) => {
    if (!query.trim() && !filters) {
      setResults({ connections: [], meetings: [] });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Search connections
      let connectionsQuery = supabase
        .from('connections')
        .select('*')
        .eq('user_id', user.id);

      if (query.trim()) {
        connectionsQuery = connectionsQuery.or(
          `connection_name.ilike.%${query}%,connection_email.ilike.%${query}%,connection_company.ilike.%${query}%,notes.ilike.%${query}%`
        );
      }

      if (filters?.name) {
        connectionsQuery = connectionsQuery.ilike('connection_name', `%${filters.name}%`);
      }

      const { data: connections, error: connectionsError } = await connectionsQuery;
      if (connectionsError) throw connectionsError;

      // Search meetings
      let meetingsQuery = supabase
        .from('meetings')
        .select('*')
        .or(`user_id.eq.${user.id},organizer_id.eq.${user.id}`);

      if (query.trim()) {
        meetingsQuery = meetingsQuery.or(
          `title.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%`
        );
      }

      if (filters?.dateFrom) {
        meetingsQuery = meetingsQuery.gte('meeting_date', filters.dateFrom);
      }

      if (filters?.dateTo) {
        meetingsQuery = meetingsQuery.lte('meeting_date', filters.dateTo);
      }

      if (filters?.location) {
        meetingsQuery = meetingsQuery.ilike('location', `%${filters.location}%`);
      }

      const { data: meetings, error: meetingsError } = await meetingsQuery;
      if (meetingsError) throw meetingsError;

      const typedMeetings = (meetings || []).map(item => ({
        ...item,
        status: (item.status || 'pending') as MeetingStatus
      }));

      setResults({
        connections: connections || [],
        meetings: typedMeetings
      });
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults({ connections: [], meetings: [] });
  }, []);

  return {
    results,
    loading,
    search,
    clearResults
  };
}
