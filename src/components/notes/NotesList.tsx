import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Pin, ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SwipeableCard } from '@/components/notifications/SwipeableCard';
import { NoteCard } from './NoteCard';
import { NotesEmptyState } from './NotesEmptyState';
import { useMeetingNotes } from '@/hooks/useMeetingNotes';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function NotesList() {
  const navigate = useNavigate();
  const { notes, loading, createNote, deleteNote, togglePinNote } = useMeetingNotes();
  const [searchQuery, setSearchQuery] = useState('');
  const [pinnedOpen, setPinnedOpen] = useState(true);

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const query = searchQuery.toLowerCase();
    return notes.filter(note =>
      note.title?.toLowerCase().includes(query) ||
      note.text_note?.toLowerCase().includes(query) ||
      note.transcript?.toLowerCase().includes(query) ||
      note.ai_summary?.toLowerCase().includes(query)
    );
  }, [notes, searchQuery]);

  const pinnedNotes = filteredNotes.filter(n => n.is_pinned);
  const unpinnedNotes = filteredNotes.filter(n => !n.is_pinned);

  const handleCreateNote = async () => {
    try {
      const newNote = await createNote({
        title: '',
        text_note: '',
        is_standalone: true,
      });
      if (newNote) {
        navigate(`/notes?note=${newNote.id}`);
      }
    } catch (error) {
      toast.error('Failed to create note');
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      toast.success('Note deleted');
    } catch (error) {
      toast.error('Failed to delete note');
    }
  };

  const handlePin = async (noteId: string, isPinned: boolean) => {
    try {
      await togglePinNote(noteId, !isPinned);
      toast.success(isPinned ? 'Note unpinned' : 'Note pinned');
    } catch (error) {
      toast.error('Failed to update note');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full animate-pulse">
        <div className="p-4 border-b border-border">
          <div className="h-10 bg-muted rounded-lg" />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const isEmpty = notes.length === 0;
  const noResults = filteredNotes.length === 0 && searchQuery;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground">Notes</h1>
        <Button size="icon" variant="ghost" onClick={handleCreateNote}>
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/50 border-0"
          />
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 pt-2 pb-24 space-y-4">
          {isEmpty ? (
            <NotesEmptyState onCreateNote={handleCreateNote} />
          ) : noResults ? (
            <NotesEmptyState onCreateNote={handleCreateNote} searchQuery={searchQuery} />
          ) : (
            <>
              {/* Pinned Section */}
              {pinnedNotes.length > 0 && (
                <Collapsible open={pinnedOpen} onOpenChange={setPinnedOpen}>
                  <CollapsibleTrigger className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 hover:text-foreground transition-colors">
                    {pinnedOpen ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    <Pin className="h-3 w-3" />
                    Pinned ({pinnedNotes.length})
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2">
                    {pinnedNotes.map(note => (
                      <SwipeableCard
                        key={note.id}
                        onDelete={() => handleDelete(note.id)}
                        onPin={() => handlePin(note.id, true)}
                        isPinned={true}
                      >
                        <NoteCard
                          note={note}
                          onClick={() => navigate(`/notes?note=${note.id}`)}
                        />
                      </SwipeableCard>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* All Notes Section */}
              {unpinnedNotes.length > 0 && (
                <div>
                  {pinnedNotes.length > 0 && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      All Notes ({unpinnedNotes.length})
                    </div>
                  )}
                  <div className="space-y-2">
                    {unpinnedNotes.map(note => (
                      <SwipeableCard
                        key={note.id}
                        onDelete={() => handleDelete(note.id)}
                        onPin={() => handlePin(note.id, false)}
                        isPinned={false}
                      >
                        <NoteCard
                          note={note}
                          onClick={() => navigate(`/notes?note=${note.id}`)}
                        />
                      </SwipeableCard>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Floating Action Button */}
      {!isEmpty && (
        <Button
          size="lg"
          className={cn(
            "fixed bottom-24 right-4 h-14 w-14 rounded-full shadow-lg",
            "bg-primary hover:bg-primary/90"
          )}
          onClick={handleCreateNote}
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}
