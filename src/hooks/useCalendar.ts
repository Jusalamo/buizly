import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CalendarEvent, UserCalendar, CalendarView } from '@/types/calendar';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, format } from 'date-fns';

const CACHE_KEY = 'calendar_events_cache';
const CALENDARS_CACHE_KEY = 'user_calendars_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function loadFromCache<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        return data;
      }
    }
  } catch (e) {
    console.warn('Cache read error:', e);
  }
  return null;
}

function saveToCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) {
    console.warn('Cache write error:', e);
  }
}

export function useCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendars, setCalendars] = useState<UserCalendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('week');
  const [syncing, setSyncing] = useState(false);

  // Load from cache on mount for instant UI
  useEffect(() => {
    const cachedEvents = loadFromCache<CalendarEvent[]>(CACHE_KEY);
    const cachedCalendars = loadFromCache<UserCalendar[]>(CALENDARS_CACHE_KEY);
    if (cachedEvents) setEvents(cachedEvents);
    if (cachedCalendars) setCalendars(cachedCalendars);
  }, []);

  const getDateRange = useCallback((date: Date, viewType: CalendarView) => {
    switch (viewType) {
      case 'day':
        return { start: startOfDay(date), end: endOfDay(date) };
      case 'week':
        return { start: startOfWeek(date, { weekStartsOn: 0 }), end: endOfWeek(date, { weekStartsOn: 0 }) };
      case 'month':
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);
        // Extend to include full weeks
        return { 
          start: startOfWeek(monthStart, { weekStartsOn: 0 }), 
          end: endOfWeek(monthEnd, { weekStartsOn: 0 }) 
        };
      case 'agenda':
        return { start: startOfDay(date), end: addDays(endOfDay(date), 30) };
      default:
        return { start: startOfDay(date), end: endOfDay(date) };
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { start, end } = getDateRange(currentDate, view);

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;

      const typedEvents: CalendarEvent[] = (data || []).map(e => ({
        ...e,
        attendees: Array.isArray(e.attendees) ? e.attendees as unknown as CalendarEvent['attendees'] : [],
        reminders: Array.isArray(e.reminders) ? e.reminders as unknown as CalendarEvent['reminders'] : [],
        source: (e.source || 'local') as 'local' | 'google' | 'outlook',
        status: (e.status || 'confirmed') as 'confirmed' | 'tentative' | 'cancelled',
        visibility: (e.visibility || 'default') as 'default' | 'public' | 'private',
      }));

      setEvents(typedEvents);
      saveToCache(CACHE_KEY, typedEvents);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoading(false);
    }
  }, [currentDate, view, getDateRange]);

  const fetchCalendars = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_calendars')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false });

      if (error) throw error;

      const typedCalendars = (data || []) as UserCalendar[];
      setCalendars(typedCalendars);
      saveToCache(CALENDARS_CACHE_KEY, typedCalendars);
    } catch (error) {
      console.error('Error fetching calendars:', error);
    }
  }, []);

  const createEvent = useCallback(async (eventData: Partial<CalendarEvent>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Optimistic update - add temp event immediately
      const tempId = `temp-${Date.now()}`;
      const optimisticEvent: CalendarEvent = {
        id: tempId,
        user_id: user.id,
        title: eventData.title || 'New Event',
        description: eventData.description || null,
        location: eventData.location || null,
        start_time: eventData.start_time!,
        end_time: eventData.end_time!,
        all_day: eventData.all_day || false,
        timezone: eventData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        color: eventData.color || null,
        meeting_link: eventData.meeting_link || null,
        source: 'local',
        status: 'confirmed',
        visibility: 'default',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        attendees: eventData.attendees || [],
        reminders: eventData.reminders || [{ type: 'notification', minutes: 15 }],
        external_id: null,
        calendar_id: null,
        calendar_name: null,
        calendar_color: null,
        recurrence_rule: eventData.recurrence_rule || null,
        recurrence_id: null,
        synced_at: null,
        has_notes: eventData.has_notes || false,
        meeting_notes_id: eventData.meeting_notes_id || null,
        busy: true,
      };
      
      setEvents(prev => [...prev, optimisticEvent]);

      const insertData = {
        user_id: user.id,
        title: eventData.title || 'New Event',
        description: eventData.description,
        location: eventData.location,
        start_time: eventData.start_time!,
        end_time: eventData.end_time!,
        all_day: eventData.all_day || false,
        timezone: eventData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        recurrence_rule: eventData.recurrence_rule,
        attendees: JSON.stringify(eventData.attendees || []),
        reminders: JSON.stringify(eventData.reminders || [{ type: 'notification', minutes: 15 }]),
        color: eventData.color,
        meeting_link: eventData.meeting_link,
        source: 'local',
        status: 'confirmed',
        has_notes: eventData.has_notes || false,
        meeting_notes_id: eventData.meeting_notes_id || null,
      };

      const { data, error } = await supabase
        .from('calendar_events')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        // Rollback on error
        setEvents(prev => prev.filter(e => e.id !== tempId));
        throw error;
      }

      // Replace temp event with real event
      const typedEvent: CalendarEvent = {
        ...data,
        attendees: Array.isArray(data.attendees) ? data.attendees as unknown as CalendarEvent['attendees'] : [],
        reminders: Array.isArray(data.reminders) ? data.reminders as unknown as CalendarEvent['reminders'] : [],
        source: 'local' as const,
        status: 'confirmed' as const,
        visibility: 'default' as const,
      };
      
      setEvents(prev => prev.map(e => e.id === tempId ? typedEvent : e));
      saveToCache(CACHE_KEY, events.map(e => e.id === tempId ? typedEvent : e));
      
      // Sync to Google Calendar if connected
      await syncEventToGoogle(typedEvent);

      return data;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }, [fetchEvents]);

  const updateEvent = useCallback(async (eventId: string, updates: Partial<CalendarEvent>) => {
    try {
      // Optimistic update
      const previousEvents = [...events];
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, ...updates } : e));

      // Convert to database-compatible types
      const dbUpdates: Record<string, unknown> = { ...updates };
      if (updates.attendees) {
        dbUpdates.attendees = updates.attendees as unknown as Record<string, unknown>[];
      }
      if (updates.reminders) {
        dbUpdates.reminders = updates.reminders as unknown as Record<string, unknown>[];
      }

      const { error } = await supabase
        .from('calendar_events')
        .update(dbUpdates)
        .eq('id', eventId);

      if (error) {
        // Rollback on error
        setEvents(previousEvents);
        throw error;
      }

      // Refresh in background
      fetchEvents();
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }, [events, fetchEvents]);

  const deleteEvent = useCallback(async (eventId: string) => {
    try {
      // Optimistic update
      const previousEvents = [...events];
      setEvents(prev => prev.filter(e => e.id !== eventId));

      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) {
        // Rollback on error
        setEvents(previousEvents);
        throw error;
      }

      // Update cache
      saveToCache(CACHE_KEY, events.filter(e => e.id !== eventId));
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }, [events]);

  const syncEventToGoogle = async (event: CalendarEvent) => {
    try {
      const { data: settings } = await supabase
        .from('user_settings')
        .select('google_calendar_connected')
        .single();

      if (!settings?.google_calendar_connected) return;

      const { data } = await supabase.functions.invoke('google-create-event', {
        body: {
          title: event.title,
          description: event.description || '',
          startDateTime: event.start_time,
          endDateTime: event.end_time,
          location: event.location || '',
          attendees: event.attendees?.map(a => a.email) || [],
        }
      });

      if (data?.eventId) {
        await supabase
          .from('calendar_events')
          .update({ external_id: data.eventId, source: 'google', synced_at: new Date().toISOString() })
          .eq('id', event.id);
      }
    } catch (error) {
      console.error('Error syncing to Google Calendar:', error);
    }
  };

  const syncGoogleCalendar = useCallback(async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-sync-calendar');
      if (error) throw error;
      await fetchEvents();
      await fetchCalendars();
      return data;
    } catch (error) {
      console.error('Error syncing Google Calendar:', error);
      throw error;
    } finally {
      setSyncing(false);
    }
  }, [fetchEvents, fetchCalendars]);

  const navigateDate = useCallback((direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }

    const modifier = direction === 'next' ? 1 : -1;
    switch (view) {
      case 'day':
        setCurrentDate(prev => direction === 'next' ? addDays(prev, 1) : subDays(prev, 1));
        break;
      case 'week':
        setCurrentDate(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1));
        break;
      case 'month':
        setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
        break;
      case 'agenda':
        setCurrentDate(prev => direction === 'next' ? addDays(prev, 30) : subDays(prev, 30));
        break;
    }
  }, [view]);

  const getEventsForDate = useCallback((date: Date) => {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    return events.filter(event => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      return eventStart <= dayEnd && eventEnd >= dayStart;
    });
  }, [events]);

  const toggleCalendarVisibility = useCallback(async (calendarId: string, isVisible: boolean) => {
    try {
      const { error } = await supabase
        .from('user_calendars')
        .update({ is_visible: isVisible })
        .eq('id', calendarId);

      if (error) throw error;
      await fetchCalendars();
    } catch (error) {
      console.error('Error toggling calendar visibility:', error);
    }
  }, [fetchCalendars]);

  useEffect(() => {
    fetchEvents();
    fetchCalendars();
  }, [fetchEvents, fetchCalendars]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('calendar-events')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendar_events' },
        () => fetchEvents()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEvents]);

  return {
    events,
    calendars,
    loading,
    syncing,
    currentDate,
    setCurrentDate,
    view,
    setView,
    createEvent,
    updateEvent,
    deleteEvent,
    navigateDate,
    getEventsForDate,
    syncGoogleCalendar,
    toggleCalendarVisibility,
    refetch: fetchEvents,
    getDateRange,
  };
}
