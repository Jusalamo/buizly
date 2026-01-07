import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Connection = Database["public"]["Tables"]["connections"]["Row"];
type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

interface AppCache {
  profile: Profile | null;
  connections: Connection[];
  meetings: Meeting[];
  userId: string | null;
  initialized: boolean;
  lastFetched: number;
}

// Global singleton cache - survives component unmounts and re-renders
const globalCache: AppCache = {
  profile: null,
  connections: [],
  meetings: [],
  userId: null,
  initialized: false,
  lastFetched: 0,
};

const CACHE_TTL = 60000; // 60 seconds - longer TTL for better perceived performance
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach(listener => listener());
}

// Background refresh - doesn't block UI
async function refreshCache(force = false) {
  const now = Date.now();
  
  // Skip if cache is fresh and not forced
  if (!force && globalCache.initialized && now - globalCache.lastFetched < CACHE_TTL) {
    return;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      globalCache.profile = null;
      globalCache.connections = [];
      globalCache.meetings = [];
      globalCache.userId = null;
      globalCache.initialized = true;
      notifyListeners();
      return;
    }

    // Only refetch if user changed or cache is stale
    if (globalCache.userId === user.id && !force && globalCache.initialized) {
      return;
    }

    // Parallel fetch all data - fastest possible load
    const [profileResult, connectionsResult, meetingsResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('connections').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('meetings').select('*').or(`user_id.eq.${user.id},organizer_id.eq.${user.id}`).order('meeting_date', { ascending: true }),
    ]);

    globalCache.profile = profileResult.data;
    globalCache.connections = connectionsResult.data || [];
    globalCache.meetings = meetingsResult.data || [];
    globalCache.userId = user.id;
    globalCache.initialized = true;
    globalCache.lastFetched = Date.now();

    notifyListeners();
  } catch (error) {
    console.error('Cache refresh error:', error);
  }
}

export function useAppCache() {
  const [, forceUpdate] = useState({});
  const mountedRef = useRef(true);

  // Subscribe to cache updates
  useEffect(() => {
    mountedRef.current = true;
    const listener = () => {
      if (mountedRef.current) {
        forceUpdate({});
      }
    };
    listeners.add(listener);

    // Initial load if not cached
    if (!globalCache.initialized) {
      refreshCache();
    }

    return () => {
      mountedRef.current = false;
      listeners.delete(listener);
    };
  }, []);

  const invalidate = useCallback(() => {
    refreshCache(true);
  }, []);

  return {
    profile: globalCache.profile,
    connections: globalCache.connections,
    meetings: globalCache.meetings,
    loading: !globalCache.initialized,
    initialized: globalCache.initialized,
    refetch: invalidate,
  };
}

// Pre-warm cache on app load
export function initializeAppCache() {
  refreshCache();
}

// Invalidate and refresh cache
export function invalidateAppCache() {
  globalCache.lastFetched = 0;
  refreshCache(true);
}
