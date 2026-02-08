import { useState, useEffect, useCallback, useRef } from 'react';
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
  isAuthenticated: boolean;
}

// Global singleton cache - survives component unmounts and re-renders
const globalCache: AppCache = {
  profile: null,
  connections: [],
  meetings: [],
  userId: null,
  initialized: false,
  lastFetched: 0,
  isAuthenticated: false,
};

// localStorage keys for instant mount data
const LS_PROFILE_KEY = 'buizly_profile';
const LS_CONNECTIONS_KEY = 'buizly_connections';
const LS_MEETINGS_KEY = 'buizly_meetings';
const LS_AUTH_KEY = 'buizly_authenticated';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const listeners = new Set<() => void>();
let authListenerSetup = false;
let fetchInProgress = false;

function notifyListeners() {
  listeners.forEach(listener => listener());
}

// Hydrate from localStorage for instant mount
function hydrateFromStorage() {
  if (globalCache.initialized) return;
  
  try {
    const wasAuth = localStorage.getItem(LS_AUTH_KEY) === 'true';
    if (!wasAuth) return;
    
    const storedProfile = localStorage.getItem(LS_PROFILE_KEY);
    const storedConnections = localStorage.getItem(LS_CONNECTIONS_KEY);
    const storedMeetings = localStorage.getItem(LS_MEETINGS_KEY);
    
    if (storedProfile) {
      globalCache.profile = JSON.parse(storedProfile);
      globalCache.isAuthenticated = true;
      globalCache.userId = globalCache.profile?.id || null;
    }
    if (storedConnections) {
      globalCache.connections = JSON.parse(storedConnections);
    }
    if (storedMeetings) {
      globalCache.meetings = JSON.parse(storedMeetings);
    }
    
    // Mark as initialized with stale data so UI renders instantly
    if (globalCache.profile) {
      globalCache.initialized = true;
    }
  } catch (e) {
    console.warn('Cache hydration error:', e);
  }
}

// Persist to localStorage for next app load
function persistToStorage() {
  try {
    if (globalCache.profile) {
      localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(globalCache.profile));
      localStorage.setItem(LS_AUTH_KEY, 'true');
    }
    if (globalCache.connections.length > 0) {
      localStorage.setItem(LS_CONNECTIONS_KEY, JSON.stringify(globalCache.connections));
    }
    if (globalCache.meetings.length > 0) {
      localStorage.setItem(LS_MEETINGS_KEY, JSON.stringify(globalCache.meetings));
    }
  } catch (e) {
    console.warn('Cache persist error:', e);
  }
}

// Clear cache completely
function clearCache() {
  globalCache.profile = null;
  globalCache.connections = [];
  globalCache.meetings = [];
  globalCache.userId = null;
  globalCache.initialized = true;
  globalCache.lastFetched = 0;
  globalCache.isAuthenticated = false;
  
  // Clear localStorage
  try {
    localStorage.removeItem(LS_PROFILE_KEY);
    localStorage.removeItem(LS_CONNECTIONS_KEY);
    localStorage.removeItem(LS_MEETINGS_KEY);
    localStorage.setItem(LS_AUTH_KEY, 'false');
  } catch (e) {}
  
  notifyListeners();
}

// Background refresh - doesn't block UI
async function refreshCache(force = false) {
  const now = Date.now();
  
  // Skip if cache is fresh and not forced, or if fetch is already in progress
  if (!force && globalCache.initialized && now - globalCache.lastFetched < CACHE_TTL) {
    return;
  }
  
  if (fetchInProgress) return;
  fetchInProgress = true;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      if (!globalCache.initialized) {
        globalCache.initialized = true;
        notifyListeners();
      }
      fetchInProgress = false;
      return;
    }

    const user = session.user;
    
    // User is authenticated
    globalCache.isAuthenticated = true;

    // Only refetch if user changed or cache is stale
    if (globalCache.userId === user.id && !force && globalCache.lastFetched > 0) {
      fetchInProgress = false;
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

    // Persist for instant load on next visit
    persistToStorage();
    notifyListeners();
  } catch (error) {
    console.error('Cache refresh error:', error);
    // Still mark as initialized so UI can render
    if (!globalCache.initialized) {
      globalCache.initialized = true;
      notifyListeners();
    }
  } finally {
    fetchInProgress = false;
  }
}

// Setup auth state listener - only once
function setupAuthListener() {
  if (authListenerSetup) return;
  authListenerSetup = true;

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      // User just signed in - force refresh with their data
      globalCache.userId = null; // Reset to force refetch
      setTimeout(() => refreshCache(true), 0);
    } else if (event === 'SIGNED_OUT') {
      // User signed out - clear everything
      clearCache();
    } else if (event === 'TOKEN_REFRESHED' && session?.user) {
      // Token refreshed, user still logged in
      globalCache.isAuthenticated = true;
    }
  });
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

    // Setup auth listener
    setupAuthListener();

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
    isAuthenticated: globalCache.isAuthenticated,
    userId: globalCache.userId,
    refetch: invalidate,
  };
}

// Pre-warm cache on app load
export function initializeAppCache() {
  // First hydrate from localStorage for instant UI
  hydrateFromStorage();
  // Then setup auth listener and refresh in background
  setupAuthListener();
  refreshCache();
}

// Invalidate and refresh cache
export function invalidateAppCache() {
  globalCache.lastFetched = 0;
  refreshCache(true);
}
