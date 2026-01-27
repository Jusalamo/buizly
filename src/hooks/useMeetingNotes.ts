import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { MeetingNote, ActionItem, NotesCategory, Bookmark } from '@/types/calendar';

export function useMeetingNotes() {
  const [notes, setNotes] = useState<MeetingNote[]>([]);
  const [categories, setCategories] = useState<NotesCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchNotes = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('meeting_notes')
        .select('*')
        .or(`user_id.eq.${user.id}`)
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
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notes_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order');

      if (error) throw error;
      setCategories((data || []) as NotesCategory[]);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  const createNote = useCallback(async (noteData: Partial<MeetingNote>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('meeting_notes')
        .insert({
          user_id: user.id,
          meeting_id: noteData.meeting_id,
          title: noteData.title || 'Untitled Note',
          text_note: noteData.text_note,
          category: noteData.category || 'general',
          tags: noteData.tags || [],
          is_standalone: !noteData.meeting_id,
          is_pinned: false,
        })
        .select()
        .single();

      if (error) throw error;

      // If linked to a calendar event, update has_notes flag
      if (noteData.meeting_id) {
        await supabase
          .from('calendar_events')
          .update({ has_notes: true, meeting_notes_id: data.id })
          .eq('id', noteData.meeting_id);
      }

      await fetchNotes();
      return data;
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  }, [fetchNotes]);

  const updateNote = useCallback(async (noteId: string, updates: Partial<MeetingNote>) => {
    try {
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

      if (error) throw error;
      await fetchNotes();
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  }, [fetchNotes]);

  const deleteNote = useCallback(async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('meeting_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
      await fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  }, [fetchNotes]);

  const togglePinNote = useCallback(async (noteId: string, isPinned: boolean) => {
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notes_categories')
        .insert({
          user_id: user.id,
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
    refetch: fetchNotes,
  };
}
