import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, MoreHorizontal, Share2, Mic, MicOff, Sparkles, 
  CheckSquare, Loader2, Trash2, Copy, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useMeetingNotes } from '@/hooks/useMeetingNotes';
import { useRealtimeTranscription } from '@/hooks/useRealtimeTranscription';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { MeetingNote } from '@/types/calendar';

interface NoteEditorProps {
  noteId: string;
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  const navigate = useNavigate();
  const { 
    notes, updateNote, deleteNote, duplicateNote, 
    generateAISummary, extractActionItems, exportNote 
  } = useMeetingNotes();
  
  const note = notes.find(n => n.id === noteId);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const {
    isConnected,
    partialTranscript,
    transcripts,
    startTranscription,
    stopTranscription,
  } = useRealtimeTranscription();

  // Load note data
  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setContent(note.text_note || '');
    }
  }, [note]);

  // Auto-save with debounce
  const saveNote = useCallback(async (newTitle: string, newContent: string) => {
    if (!noteId) return;
    
    setIsSaving(true);
    try {
      await updateNote(noteId, {
        title: newTitle || 'Untitled Note',
        text_note: newContent,
      });
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [noteId, updateNote]);

  const debouncedSave = useCallback((newTitle: string, newContent: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveNote(newTitle, newContent);
    }, 1000);
  }, [saveNote]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    debouncedSave(value, content);
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    debouncedSave(title, value);
  };

  // Recording handlers
  const handleToggleRecording = async () => {
    if (isConnected) {
      stopTranscription();
      // Merge transcript into content
      const fullTranscript = transcripts.filter(t => t.isFinal).map(t => t.text).join(' ');
      if (fullTranscript) {
        const newContent = content + (content ? '\n\n--- Transcript ---\n' : '') + fullTranscript;
        setContent(newContent);
        await saveNote(title, newContent);
        toast.success('Transcript added to note');
      }
    } else {
      await startTranscription();
    }
  };

  // AI Actions
  const handleGenerateSummary = async () => {
    if (!content && !note?.transcript) {
      toast.error('Add some content first');
      return;
    }
    
    setIsGeneratingAI(true);
    try {
      await generateAISummary(noteId);
      toast.success('Summary generated');
    } catch (error) {
      toast.error('Failed to generate summary');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleExtractTasks = async () => {
    if (!content && !note?.transcript) {
      toast.error('Add some content first');
      return;
    }
    
    setIsGeneratingAI(true);
    try {
      await extractActionItems(noteId);
      toast.success('Tasks extracted');
    } catch (error) {
      toast.error('Failed to extract tasks');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteNote(noteId);
      toast.success('Note deleted');
      navigate('/notes');
    } catch (error) {
      toast.error('Failed to delete note');
    }
  };

  const handleDuplicate = async () => {
    try {
      const newNote = await duplicateNote(noteId);
      if (newNote) {
        navigate(`/notes?note=${newNote.id}`);
        toast.success('Note duplicated');
      }
    } catch (error) {
      toast.error('Failed to duplicate note');
    }
  };

  const handleExport = async () => {
    try {
      await exportNote(noteId, 'text');
      toast.success('Note exported');
    } catch (error) {
      toast.error('Failed to export note');
    }
  };

  if (!note) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const actionItems = note.ai_action_items || [];
  const completedCount = actionItems.filter(item => item.completed).length;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="sm" onClick={() => navigate('/notes')} className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          Notes
        </Button>
        
        <div className="flex items-center gap-1">
          {isSaving && (
            <span className="text-xs text-muted-foreground mr-2">Saving...</span>
          )}
          
          <Button variant="ghost" size="icon" onClick={handleExport}>
            <Share2 className="h-4 w-4" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport}>
                <Share2 className="h-4 w-4 mr-2" />
                Export
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 pb-32 space-y-4">
          {/* Title */}
          <Input
            value={title}
            onChange={e => handleTitleChange(e.target.value)}
            placeholder="Note title"
            className="text-2xl font-bold border-0 px-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/50"
          />
          
          {/* Date & metadata */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{format(new Date(note.created_at), 'MMMM d, yyyy · h:mm a')}</span>
            {note.meeting_id && !note.is_standalone && (
              <Badge variant="secondary" className="gap-1">
                <Calendar className="h-3 w-3" />
                Linked
              </Badge>
            )}
          </div>

          {/* AI Summary */}
          {note.ai_summary && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
              <div className="flex items-center gap-2 text-xs font-medium text-primary mb-1">
                <Sparkles className="h-3 w-3" />
                AI Summary
              </div>
              <p className="text-sm text-foreground">{note.ai_summary}</p>
            </div>
          )}

          {/* Action Items */}
          {actionItems.length > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                <CheckSquare className="h-3 w-3" />
                Tasks ({completedCount}/{actionItems.length})
              </div>
              <div className="space-y-1">
                {actionItems.map((item, index) => (
                  <div key={item.id || index} className="flex items-start gap-2 text-sm">
                    <span className={cn(
                      "mt-0.5",
                      item.completed ? "text-muted-foreground line-through" : "text-foreground"
                    )}>
                      {item.completed ? '☑' : '☐'} {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content textarea */}
          <Textarea
            ref={contentRef}
            value={content}
            onChange={e => handleContentChange(e.target.value)}
            placeholder="Start writing..."
            className="min-h-[300px] border-0 px-0 resize-none focus-visible:ring-0 placeholder:text-muted-foreground/50 text-base leading-relaxed"
          />

          {/* Live transcript */}
          {isConnected && (
            <div className="p-3 bg-destructive/5 rounded-lg border border-destructive/20">
              <div className="flex items-center gap-2 text-xs font-medium text-destructive mb-2">
                <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                Recording...
              </div>
              {partialTranscript && (
                <p className="text-sm text-muted-foreground italic">{partialTranscript}</p>
              )}
              {transcripts.length > 0 && (
                <p className="text-sm text-foreground mt-2">
                  {transcripts.filter(t => t.isFinal).map(t => t.text).join(' ')}
                </p>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Bottom Toolbar */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-border">
        <div className="flex items-center justify-center gap-2 max-w-lg mx-auto">
          <Button
            variant={isConnected ? "destructive" : "outline"}
            size="sm"
            onClick={handleToggleRecording}
            className="gap-2"
          >
            {isConnected ? (
              <>
                <MicOff className="h-4 w-4" />
                Stop
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                Record
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateSummary}
            disabled={isGeneratingAI}
            className="gap-2"
          >
            {isGeneratingAI ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Summary
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExtractTasks}
            disabled={isGeneratingAI}
            className="gap-2"
          >
            {isGeneratingAI ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckSquare className="h-4 w-4" />
            )}
            Tasks
          </Button>
        </div>
      </div>
    </div>
  );
}
