import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { NotesList } from '@/components/notes/NotesList';
import { NoteEditor } from '@/components/notes/NoteEditor';
import { useMeetingNotes } from '@/hooks/useMeetingNotes';
import { useCalendar } from '@/hooks/useCalendar';
import { useToast } from '@/hooks/use-toast';

export default function Notes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isNew = searchParams.get('new') === 'true';
  const { toast } = useToast();

  const {
    notes,
    loading,
    createNote,
    updateNote,
    deleteNote,
    getNote,
    linkNoteToEvent,
    unlinkNoteFromEvent,
  } = useMeetingNotes();

  const { events } = useCalendar();

  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Create a map of eventId -> eventTitle for quick lookup
  const eventTitleMap = useMemo(() => {
    const map: Record<string, string> = {};
    events.forEach(e => {
      map[e.id] = e.title;
    });
    return map;
  }, [events]);

  // Load note if ID is provided - re-runs when notes finish loading
  useEffect(() => {
    if (id && id !== 'new') {
      const note = getNote(id);
      if (note) {
        setSelectedNote(note);
      }
      // If note is null, don't clear selectedNote - it may still be loading
    } else if (isNew) {
      setSelectedNote(null);
    } else {
      setSelectedNote(null);
    }
  }, [id, isNew, getNote, notes]);

  const handleSelectNote = useCallback((noteId: string) => {
    navigate(`/notes/${noteId}`);
  }, [navigate]);

  const handleCreateNote = useCallback(() => {
    navigate('/notes/new?new=true');
  }, [navigate]);

  const handleBack = useCallback(() => {
    navigate('/notes');
    setSelectedNote(null);
  }, [navigate]);

  const handleSave = useCallback(async (data: any) => {
    setSaving(true);
    try {
      if (isNew || !data.id) {
        // Create new standalone note - no meeting_id needed
        const newNote = await createNote({
          title: data.title,
          text_note: data.text_note,
          is_pinned: data.is_pinned,
          transcript: data.transcript,
          // No meeting_id - hook will handle it as standalone
        });
        if (newNote) {
          navigate(`/notes/${newNote.id}`, { replace: true });
          setSelectedNote(newNote);
          toast({ title: 'Note created' });
        }
      } else {
        // Update existing note
        await updateNote(data.id, {
          title: data.title,
          text_note: data.text_note,
          is_pinned: data.is_pinned,
          transcript: data.transcript,
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  }, [isNew, createNote, updateNote, navigate, toast]);

  const handleDelete = useCallback(async () => {
    if (!selectedNote?.id) return;
    
    try {
      await deleteNote(selectedNote.id);
      toast({ title: 'Note deleted' });
      handleBack();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error.message,
      });
    }
  }, [selectedNote?.id, deleteNote, toast, handleBack]);

  // Handle linking note to calendar event
  const handleLinkEvent = useCallback(async (eventId: string) => {
    if (!selectedNote?.id) return;
    try {
      await linkNoteToEvent(selectedNote.id, eventId);
      setSelectedNote((prev: any) => prev ? { ...prev, meeting_id: eventId } : prev);
      toast({ title: 'Note linked to event' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to link', description: error.message });
    }
  }, [selectedNote?.id, linkNoteToEvent, toast]);

  // Handle unlinking note from calendar event
  const handleUnlinkEvent = useCallback(async () => {
    if (!selectedNote?.id) return;
    try {
      await unlinkNoteFromEvent(selectedNote.id);
      setSelectedNote((prev: any) => prev ? { ...prev, meeting_id: undefined } : prev);
      toast({ title: 'Note unlinked from event' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to unlink', description: error.message });
    }
  }, [selectedNote?.id, unlinkNoteFromEvent, toast]);

  // Show editor if viewing/editing a note
  const showEditor = id || isNew;

  // Transform notes for NotesList component with linked event titles
  const notesForList = notes.map(n => ({
    id: n.id,
    title: n.title || null,
    text_note: n.text_note || null,
    created_at: n.created_at,
    updated_at: n.updated_at || null,
    is_pinned: n.is_pinned,
    tags: n.tags,
    meeting_id: n.meeting_id || null,
    category: n.category,
    linkedEventTitle: n.meeting_id ? eventTitleMap[n.meeting_id] || null : null,
  }));

  // Get linked event title for current note
  const currentLinkedEventTitle = selectedNote?.meeting_id 
    ? eventTitleMap[selectedNote.meeting_id] || null 
    : null;

  return (
    <Layout showNav={!showEditor}>
      <div className="h-[calc(100dvh-4rem)]">
        {showEditor ? (
          <NoteEditor
            note={selectedNote}
            isNew={isNew}
            onBack={handleBack}
            onSave={handleSave}
            onDelete={selectedNote ? handleDelete : undefined}
            onLinkEvent={handleLinkEvent}
            onUnlinkEvent={handleUnlinkEvent}
            linkedEventTitle={currentLinkedEventTitle}
            saving={saving}
          />
        ) : (
          <NotesList
            notes={notesForList}
            loading={loading}
            onSelectNote={handleSelectNote}
            onCreateNote={handleCreateNote}
          />
        )}
      </div>
    </Layout>
  );
}
