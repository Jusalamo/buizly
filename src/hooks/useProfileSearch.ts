import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface SearchableProfile extends Profile {
  isPrivate: boolean;
}

// Cache search results for instant display
const searchCache = new Map<string, SearchableProfile[]>();

export function useProfileSearch() {
  const [results, setResults] = useState<SearchableProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastQueryRef = useRef<string>('');
  const pendingQueryRef = useRef<string | null>(null);

  // Get current user on mount - immediate
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const search = useCallback(async (query: string) => {
    const trimmedQuery = query.trim().toLowerCase();
    
    // Clear results if query is too short
    if (trimmedQuery.length < 1) {
      setResults([]);
      setLoading(false);
      lastQueryRef.current = '';
      return;
    }

    // Skip if same query
    if (trimmedQuery === lastQueryRef.current) return;
    
    // Check cache first - instant results
    const cached = searchCache.get(trimmedQuery);
    if (cached) {
      setResults(cached);
      lastQueryRef.current = trimmedQuery;
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    pendingQueryRef.current = trimmedQuery;

    setLoading(true);

    try {
      let userId = currentUserId;
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        userId = user.id;
        setCurrentUserId(userId);
      }

      // Check if this query was superseded
      if (pendingQueryRef.current !== trimmedQuery) {
        return;
      }

      // Search using profiles_search view - excludes PII (email, phone) by design
      // This prevents authenticated users from accessing sensitive user data
      const { data: profiles, error } = await supabase
        .from('profiles_search')
        .select('id, full_name, avatar_url, job_title, company')
        .neq('id', userId)
        .ilike('full_name', `%${trimmedQuery}%`)
        .order('full_name', { ascending: true })
        .limit(3); // Only first 3 closest matches

      if (error) throw error;

      // Check if this query was superseded
      if (pendingQueryRef.current !== trimmedQuery) {
        return;
      }

      if (!profiles || profiles.length === 0) {
        setResults([]);
        lastQueryRef.current = trimmedQuery;
        searchCache.set(trimmedQuery, []);
        setLoading(false);
        return;
      }

      // Get visibility settings in parallel
      const { data: settings } = await supabase
        .from('user_settings')
        .select('user_id, profile_visibility')
        .in('user_id', profiles.map(p => p.id));

      // Check if this query was superseded
      if (pendingQueryRef.current !== trimmedQuery) {
        return;
      }

      const visibilityMap = new Map(settings?.map(s => [s.user_id, s.profile_visibility]) || []);

      // Map profiles with privacy info
      const searchableProfiles: SearchableProfile[] = profiles.map(p => {
        const isPrivate = visibilityMap.get(p.id) === 'private';
        return {
          ...p,
          isPrivate,
          // For private profiles, still show name but hide other details
          job_title: isPrivate ? null : p.job_title,
          company: isPrivate ? null : p.company,
          // Keep bio, phone, etc as null since we didn't fetch them
          bio: null,
          phone: null,
          website: null,
          linkedin_url: null,
          qr_code_url: null,
          created_at: '',
          updated_at: '',
        } as SearchableProfile;
      });

      setResults(searchableProfiles);
      lastQueryRef.current = trimmedQuery;
      
      // Cache results for instant future display
      searchCache.set(trimmedQuery, searchableProfiles);
      
      // Limit cache size
      if (searchCache.size > 50) {
        const firstKey = searchCache.keys().next().value;
        if (firstKey) searchCache.delete(firstKey);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Search error:', error);
      }
    } finally {
      if (pendingQueryRef.current === trimmedQuery) {
        setLoading(false);
      }
    }
  }, [currentUserId]);

  const clearResults = useCallback(() => {
    setResults([]);
    lastQueryRef.current = '';
    pendingQueryRef.current = null;
  }, []);

  return {
    results,
    loading,
    search,
    clearResults,
  };
}

// Pre-warm search with common patterns (optional - improves UX)
export function preloadSearchCache() {
  // This would be called on app load to warm up common searches
  // Currently disabled to avoid unnecessary queries
}
