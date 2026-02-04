import { useState, useMemo } from 'react';
import { Search, Plus, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { NoteCard } from './NoteCard';
import { NotesEmptyState } from './NotesEmptyState';
import { cn } from '@/lib/utils';

interface Note {
  id: string;
  title: string | null;
  text_note: string | null;
  created_at: string;
  updated_at: string | null;
  is_pinned: boolean | null;
  tags: string[] | null;
  meeting_id: string;
  category: string | null;
}

interface NotesListProps {
  notes: Note[];
  loading: boolean;
  onSelectNote: (noteId: string) => void;
  onCreateNote: () => void;
  onStartRecording?: () => void;
}

export function NotesList({
  notes,
  loading,
  onSelectNote,
  onCreateNote,
  onStartRecording,
}: NotesListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  const filteredNotes = useMemo(() => {
    let filtered = [...notes];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(note =>
        note.title?.toLowerCase().includes(query) ||
        note.text_note?.toLowerCase().includes(query) ||
        note.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filter by pinned
    if (showPinnedOnly) {
      filtered = filtered.filter(note => note.is_pinned);
    }

    // Sort: pinned first, then by updated_at
    return filtered.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      const aDate = new Date(a.updated_at || a.created_at).getTime();
      const bDate = new Date(b.updated_at || b.created_at).getTime();
      return bDate - aDate;
    });
  }, [notes, searchQuery, showPinnedOnly]);

  const pinnedNotes = filteredNotes.filter(n => n.is_pinned);
  const unpinnedNotes = filteredNotes.filter(n => !n.is_pinned);

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-secondary/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Search Header */}
      <div className="sticky top-0 z-10 bg-background p-4 border-b border-border space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            size="icon"
            variant={showPinnedOnly ? 'default' : 'outline'}
            onClick={() => setShowPinnedOnly(!showPinnedOnly)}
            className="shrink-0"
          >
            <Filter className="h-4 w-4" />
          </Button>
          <Button size="icon" onClick={onCreateNote} className="shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto">
        {filteredNotes.length === 0 ? (
          notes.length === 0 ? (
            <NotesEmptyState 
              onCreateNote={onCreateNote} 
              onStartRecording={onStartRecording}
            />
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <p>No notes match your search</p>
            </div>
          )
        ) : (
          <div className="p-4 space-y-4">
            {/* Pinned Section */}
            {pinnedNotes.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  Pinned
                </h3>
                <div className="space-y-2">
                  {pinnedNotes.map(note => (
                    <NoteCard
                      key={note.id}
                      id={note.id}
                      title={note.title}
                      content={note.text_note}
                      createdAt={note.created_at}
                      updatedAt={note.updated_at}
                      isPinned={note.is_pinned || false}
                      tags={note.tags}
                      onClick={() => onSelectNote(note.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* All Notes Section */}
            {unpinnedNotes.length > 0 && (
              <div>
                {pinnedNotes.length > 0 && (
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                    All Notes
                  </h3>
                )}
                <div className="space-y-2">
                  {unpinnedNotes.map(note => (
                    <NoteCard
                      key={note.id}
                      id={note.id}
                      title={note.title}
                      content={note.text_note}
                      createdAt={note.created_at}
                      updatedAt={note.updated_at}
                      isPinned={false}
                      tags={note.tags}
                      onClick={() => onSelectNote(note.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
