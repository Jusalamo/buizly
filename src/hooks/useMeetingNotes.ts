import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { MeetingNote, ActionItem, NotesCategory, Bookmark } from '@/types/calendar';

const NOTES_CACHE_KEY = 'meeting_notes_cache';
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

export function useMeetingNotes() {
  const [notes, setNotes] = useState<MeetingNote[]>([]);
  const [categories, setCategories] = useState<NotesCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load from cache on mount
  useEffect(() => {
    const cachedNotes = loadFromCache<MeetingNote[]>(NOTES_CACHE_KEY);
    if (cachedNotes) {
      setNotes(cachedNotes);
      setLoading(false);
    }
  }, []);

  const fetchNotes = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('meeting_notes')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedNotes: MeetingNote[] = (data || []).map(n => ({
        ...n,
        tags: Array.isArray(n.tags) ? n.tags : [],
        ai_action_items: Array.isArray(n.ai_action_items) ? n.ai_action_items as unknown as ActionItem[] : [],
        ai_decisions: Array.isArray(n.ai_decisions) ? n.ai_decisions as unknown as string[] : [],
        ai_highlights: Array.isArray(n.ai_highlights) ? n.ai_highlights as unknown as string[] : [],
        transcript_speakers: Array.isArray(n.transcript_speakers) ? n.transcript_speakers as unknown as MeetingNote['transcript_speakers'] : [],
        bookmarks: Array.isArray(n.bookmarks) ? n.bookmarks as unknown as Bookmark[] : [],
        linked_contact_ids: Array.isArray(n.linked_contact_ids) ? n.linked_contact_ids : [],
        category: n.category || 'general',
        is_pinned: n.is_pinned || false,
        is_standalone: n.is_standalone || false,
      }));

      setNotes(typedNotes);
      saveToCache(NOTES_CACHE_KEY, typedNotes);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('notes_categories')
        .select('*')
        .eq('user_id', session.user.id)
        .order('sort_order');

      if (error) throw error;
      setCategories((data || []) as NotesCategory[]);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  const createNote = useCallback(async (noteData: Partial<MeetingNote>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');
      const user = session.user;

      // Determine if this is a standalone note (no meeting_id provided)
      const isStandalone = !noteData.meeting_id;

      // Optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticNote: MeetingNote = {
        id: tempId,
        user_id: user.id,
        meeting_id: isStandalone ? undefined : noteData.meeting_id,
        title: noteData.title || 'Untitled Note',
        text_note: noteData.text_note || null,
        category: noteData.category || 'general',
        tags: noteData.tags || [],
        is_standalone: isStandalone,
        is_pinned: noteData.is_pinned || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ai_summary: null,
        ai_action_items: [],
        ai_decisions: [],
        ai_highlights: [],
        transcript: noteData.transcript || null,
        transcript_speakers: [],
        bookmarks: [],
        audio_note_url: null,
        photo_urls: null,
        linked_contact_ids: [],
        linked_company: null,
        linked_project: null,
      };
      
      setNotes(prev => [optimisticNote, ...prev]);

      // Build insert object - use null for meeting_id on standalone notes
      const insertData: Record<string, unknown> = {
        user_id: user.id,
        title: noteData.title || 'Untitled Note',
        text_note: noteData.text_note,
        category: noteData.category || 'general',
        tags: noteData.tags || [],
        is_standalone: isStandalone,
        is_pinned: noteData.is_pinned || false,
        transcript: noteData.transcript,
      };

      // Only include meeting_id if it's a valid UUID (not standalone)
      if (!isStandalone && noteData.meeting_id) {
        insertData.meeting_id = noteData.meeting_id;
      }

      const { data, error } = await supabase
        .from('meeting_notes')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        // Rollback
        setNotes(prev => prev.filter(n => n.id !== tempId));
        throw error;
      }

      // Replace temp with real note
      const typedNote: MeetingNote = {
        ...data,
        tags: Array.isArray(data.tags) ? data.tags : [],
        ai_action_items: [],
        ai_decisions: [],
        ai_highlights: [],
        transcript_speakers: [],
        bookmarks: [],
        linked_contact_ids: [],
        category: data.category || 'general',
        is_pinned: data.is_pinned || false,
        is_standalone: data.is_standalone || false,
      };
      
      setNotes(prev => prev.map(n => n.id === tempId ? typedNote : n));
      saveToCache(NOTES_CACHE_KEY, notes.map(n => n.id === tempId ? typedNote : n));

      // If linked to a calendar event (not standalone), update has_notes flag
      if (noteData.meeting_id && !noteData.meeting_id.startsWith('standalone')) {
        await supabase
          .from('calendar_events')
          .update({ has_notes: true, meeting_notes_id: data.id })
          .eq('id', noteData.meeting_id);
      }

      return typedNote;
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  }, [notes]);

  const updateNote = useCallback(async (noteId: string, updates: Partial<MeetingNote>) => {
    try {
      // Optimistic update
      const previousNotes = [...notes];
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, ...updates, updated_at: new Date().toISOString() } : n));

      // Convert to database-compatible types
      const dbUpdates: Record<string, unknown> = { 
        ...updates,
        updated_at: new Date().toISOString(),
      };
      if (updates.ai_action_items) {
        dbUpdates.ai_action_items = updates.ai_action_items as unknown as Record<string, unknown>[];
      }
      if (updates.bookmarks) {
        dbUpdates.bookmarks = updates.bookmarks as unknown as Record<string, unknown>[];
      }
      if (updates.transcript_speakers) {
        dbUpdates.transcript_speakers = updates.transcript_speakers as unknown as Record<string, unknown>[];
      }

      const { error } = await supabase
        .from('meeting_notes')
        .update(dbUpdates)
        .eq('id', noteId);

      if (error) {
        // Rollback
        setNotes(previousNotes);
        throw error;
      }
      
      // Update cache
      saveToCache(NOTES_CACHE_KEY, notes.map(n => n.id === noteId ? { ...n, ...updates } : n));
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  }, [notes]);

  const deleteNote = useCallback(async (noteId: string) => {
    try {
      // Optimistic update
      const previousNotes = [...notes];
      setNotes(prev => prev.filter(n => n.id !== noteId));

      const { error } = await supabase
        .from('meeting_notes')
        .delete()
        .eq('id', noteId);

      if (error) {
        // Rollback
        setNotes(previousNotes);
        throw error;
      }
      
      // Update cache
      saveToCache(NOTES_CACHE_KEY, notes.filter(n => n.id !== noteId));
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  }, [notes]);

  const togglePinNote = useCallback(async (noteId: string, isPinned: boolean) => {
    // Immediate optimistic update
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, is_pinned: isPinned } : n));
    await updateNote(noteId, { is_pinned: isPinned });
  }, [updateNote]);

  const addBookmark = useCallback(async (noteId: string, bookmark: Omit<Bookmark, 'id' | 'created_at'>) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const newBookmark: Bookmark = {
      id: crypto.randomUUID(),
      ...bookmark,
      created_at: new Date().toISOString(),
    };

    await updateNote(noteId, {
      bookmarks: [...note.bookmarks, newBookmark],
    });
  }, [notes, updateNote]);

  const removeBookmark = useCallback(async (noteId: string, bookmarkId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    await updateNote(noteId, {
      bookmarks: note.bookmarks.filter(b => b.id !== bookmarkId),
    });
  }, [notes, updateNote]);

  const updateActionItem = useCallback(async (noteId: string, actionId: string, updates: Partial<ActionItem>) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const updatedItems = note.ai_action_items.map(item => 
      item.id === actionId ? { ...item, ...updates } : item
    );

    await updateNote(noteId, { ai_action_items: updatedItems });
  }, [notes, updateNote]);

  const createCategory = useCallback(async (name: string, color: string = '#00ff4d') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');
      

      const { error } = await supabase
        .from('notes_categories')
        .insert({
          user_id: session.user.id,
          name,
          color,
          sort_order: categories.length,
        });

      if (error) throw error;
      await fetchCategories();
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }, [categories.length, fetchCategories]);

  const searchNotes = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) return notes;

    const lowerQuery = query.toLowerCase();
    return notes.filter(note => 
      note.title?.toLowerCase().includes(lowerQuery) ||
      note.text_note?.toLowerCase().includes(lowerQuery) ||
      note.transcript?.toLowerCase().includes(lowerQuery) ||
      note.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      note.category.toLowerCase().includes(lowerQuery)
    );
  }, [notes]);

  const getNotesForMeeting = useCallback((meetingId: string) => {
    return notes.filter(note => note.meeting_id === meetingId);
  }, [notes]);

  const getPinnedNotes = useCallback(() => {
    return notes.filter(note => note.is_pinned);
  }, [notes]);

  const getNotesByCategory = useCallback((category: string) => {
    return notes.filter(note => note.category === category);
  }, [notes]);

  // Generate AI summary (calls edge function)
  const generateAISummary = useCallback(async (noteId: string) => {
    try {
      const note = notes.find(n => n.id === noteId);
      if (!note || !note.text_note && !note.transcript) {
        throw new Error('No content to summarize');
      }

      const { data, error } = await supabase.functions.invoke('generate-note-summary', {
        body: {
          noteId,
          content: note.transcript || note.text_note,
        }
      });

      if (error) throw error;

      await updateNote(noteId, {
        ai_summary: data.summary,
        ai_action_items: data.actionItems || [],
        ai_decisions: data.decisions || [],
        ai_highlights: data.highlights || [],
      });

      return data;
    } catch (error) {
      console.error('Error generating AI summary:', error);
      throw error;
    }
  }, [notes, updateNote]);

  useEffect(() => {
    fetchNotes();
    fetchCategories();
  }, [fetchNotes, fetchCategories]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('meeting-notes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meeting_notes' },
        () => fetchNotes()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotes]);

  const getNote = useCallback((noteId: string) => {
    return notes.find(n => n.id === noteId) || null;
  }, [notes]);

  // Link a note to a calendar event
  const linkNoteToEvent = useCallback(async (noteId: string, eventId: string) => {
    try {
      // Optimistic update
      setNotes(prev => prev.map(n => 
        n.id === noteId ? { ...n, meeting_id: eventId, is_standalone: false } : n
      ));

      // Update note
      const { error: noteError } = await supabase
        .from('meeting_notes')
        .update({ meeting_id: eventId, is_standalone: false })
        .eq('id', noteId);

      if (noteError) throw noteError;

      // Update calendar event
      const { error: eventError } = await supabase
        .from('calendar_events')
        .update({ has_notes: true, meeting_notes_id: noteId })
        .eq('id', eventId);

      if (eventError) throw eventError;

      // Update cache
      saveToCache(NOTES_CACHE_KEY, notes.map(n => 
        n.id === noteId ? { ...n, meeting_id: eventId, is_standalone: false } : n
      ));
    } catch (error) {
      console.error('Error linking note to event:', error);
      // Rollback
      await fetchNotes();
      throw error;
    }
  }, [notes, fetchNotes]);

  // Unlink a note from its calendar event
  const unlinkNoteFromEvent = useCallback(async (noteId: string) => {
    try {
      // Get the current meeting_id before unlinking
      const note = notes.find(n => n.id === noteId);
      const previousEventId = note?.meeting_id;

      // Optimistic update
      setNotes(prev => prev.map(n => 
        n.id === noteId ? { ...n, meeting_id: undefined, is_standalone: true } : n
      ));

      // Update note
      const { error: noteError } = await supabase
        .from('meeting_notes')
        .update({ meeting_id: null, is_standalone: true })
        .eq('id', noteId);

      if (noteError) throw noteError;

      // Update calendar event if there was one
      if (previousEventId) {
        const { error: eventError } = await supabase
          .from('calendar_events')
          .update({ has_notes: false, meeting_notes_id: null })
          .eq('id', previousEventId);

        if (eventError) console.error('Error updating calendar event:', eventError);
      }

      // Update cache
      saveToCache(NOTES_CACHE_KEY, notes.map(n => 
        n.id === noteId ? { ...n, meeting_id: undefined, is_standalone: true } : n
      ));
    } catch (error) {
      console.error('Error unlinking note from event:', error);
      // Rollback
      await fetchNotes();
      throw error;
    }
  }, [notes, fetchNotes]);

  return {
    notes,
    categories,
    loading,
    searchQuery,
    createNote,
    updateNote,
    deleteNote,
    togglePinNote,
    addBookmark,
    removeBookmark,
    updateActionItem,
    createCategory,
    searchNotes,
    getNotesForMeeting,
    getPinnedNotes,
    getNotesByCategory,
    generateAISummary,
    getNote,
    linkNoteToEvent,
    unlinkNoteFromEvent,
    refetch: fetchNotes,
  };
}
