import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { NotesList } from '@/components/notes/NotesList';
import { NoteEditor } from '@/components/notes/NoteEditor';
import { useMeetingNotes } from '@/hooks/useMeetingNotes';
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
  } = useMeetingNotes();

  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Load note if ID is provided
  useEffect(() => {
    if (id && id !== 'new') {
      const note = getNote(id);
      setSelectedNote(note);
    } else if (isNew) {
      setSelectedNote(null);
    }
  }, [id, isNew, getNote]);

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
        // Create new note - need a meeting_id for standalone notes
        const standaloneId = `standalone-${Date.now()}`;
        const newNote = await createNote({
          meeting_id: standaloneId,
          title: data.title,
          text_note: data.text_note,
          is_pinned: data.is_pinned,
          transcript: data.transcript,
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

  // Show editor if viewing/editing a note
  const showEditor = id || isNew;

  // Transform notes for NotesList component
  const notesForList = notes.map(n => ({
    id: n.id,
    title: n.title || null,
    text_note: n.text_note || null,
    created_at: n.created_at,
    updated_at: n.updated_at || null,
    is_pinned: n.is_pinned,
    tags: n.tags,
    meeting_id: n.meeting_id,
    category: n.category,
  }));

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
