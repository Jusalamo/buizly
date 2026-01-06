import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Connection = Database["public"]["Tables"]["connections"]["Row"];
type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

interface CachedData {
  profile: Profile | null;
  connections: Connection[];
  meetings: Meeting[];
  lastFetched: number;
}

// Simple in-memory cache
const cache: CachedData = {
  profile: null,
  connections: [],
  meetings: [],
  lastFetched: 0,
};

const CACHE_TTL = 30000; // 30 seconds

export function useCachedData() {
  const [profile, setProfile] = useState<Profile | null>(cache.profile);
  const [connections, setConnections] = useState<Connection[]>(cache.connections);
  const [meetings, setMeetings] = useState<Meeting[]>(cache.meetings);
  const [loading, setLoading] = useState(!cache.profile);
  const fetchingRef = useRef(false);

  const fetchData = useCallback(async (force = false) => {
    const now = Date.now();
    
    // Return cached data if fresh
    if (!force && cache.lastFetched && now - cache.lastFetched < CACHE_TTL) {
      setProfile(cache.profile);
      setConnections(cache.connections);
      setMeetings(cache.meetings);
      setLoading(false);
      return;
    }

    // Prevent duplicate fetches
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Parallel fetch all data
      const [profileResult, connectionsResult, meetingsResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('connections').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('meetings').select('*').or(`user_id.eq.${user.id},organizer_id.eq.${user.id}`).order('meeting_date', { ascending: true }),
      ]);

      // Update cache
      cache.profile = profileResult.data;
      cache.connections = connectionsResult.data || [];
      cache.meetings = meetingsResult.data || [];
      cache.lastFetched = Date.now();

      // Update state
      setProfile(cache.profile);
      setConnections(cache.connections);
      setMeetings(cache.meetings);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  const invalidateCache = useCallback(() => {
    cache.lastFetched = 0;
    fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    profile,
    connections,
    meetings,
    loading,
    refetch: invalidateCache,
  };
}
