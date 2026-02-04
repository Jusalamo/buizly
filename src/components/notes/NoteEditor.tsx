import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Pin, MoreVertical, Mic, Trash2, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TranscriptionPanel } from './TranscriptionPanel';
import { AIActionsMenu } from './AIActionsMenu';
import { useRealtimeTranscription } from '@/hooks/useRealtimeTranscription';
import { cn } from '@/lib/utils';

interface NoteData {
  id: string;
  title: string | null;
  text_note: string | null;
  is_pinned: boolean | null;
  tags: string[] | null;
  ai_summary: string | null;
  ai_action_items: any | null;
  transcript: string | null;
}

interface NoteEditorProps {
  note: NoteData | null;
  isNew: boolean;
  onBack: () => void;
  onSave: (data: Partial<NoteData>) => Promise<void>;
  onDelete?: () => Promise<void>;
  saving?: boolean;
}

export function NoteEditor({
  note,
  isNew,
  onBack,
  onSave,
  onDelete,
  saving,
}: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.text_note || '');
  const [isPinned, setIsPinned] = useState(note?.is_pinned || false);
  const [showTranscription, setShowTranscription] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const transcription = useRealtimeTranscription();

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  // Track changes
  useEffect(() => {
    const originalTitle = note?.title || '';
    const originalContent = note?.text_note || '';
    const originalPinned = note?.is_pinned || false;

    setHasChanges(
      title !== originalTitle ||
      content !== originalContent ||
      isPinned !== originalPinned
    );
  }, [title, content, isPinned, note]);

  // Auto-save with debounce
  useEffect(() => {
    if (!hasChanges || isNew) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      setAutoSaving(true);
      try {
        await onSave({
          id: note?.id,
          title: title || null,
          text_note: content || null,
          is_pinned: isPinned,
        });
        setLastSaved(new Date());
        setHasChanges(false);
      } finally {
        setAutoSaving(false);
      }
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [hasChanges, title, content, isPinned, note?.id, isNew, onSave]);

  // Append transcription to content
  useEffect(() => {
    if (transcription.fullTranscript && !transcription.isConnected) {
      setContent(prev => {
        if (prev.includes(transcription.fullTranscript)) return prev;
        return prev + (prev ? '\n\n---\n\n' : '') + transcription.fullTranscript;
      });
    }
  }, [transcription.fullTranscript, transcription.isConnected]);

  const handleSave = async () => {
    setAutoSaving(true);
    try {
      await onSave({
        id: note?.id,
        title: title || null,
        text_note: content || null,
        is_pinned: isPinned,
        transcript: transcription.fullTranscript || note?.transcript,
      });
      setLastSaved(new Date());
      setHasChanges(false);
      if (isNew) {
        onBack();
      }
    } finally {
      setAutoSaving(false);
    }
  };

  const handleTogglePin = () => {
    setIsPinned(!isPinned);
  };

  const handleSummaryGenerated = (summary: string) => {
    setContent(prev => prev + '\n\n## AI Summary\n\n' + summary);
  };

  const handleActionItemsExtracted = (items: Array<{ task: string; assignee?: string }>) => {
    const formatted = items.map((item, i) => 
      `- [ ] ${item.task}${item.assignee ? ` (@${item.assignee})` : ''}`
    ).join('\n');
    setContent(prev => prev + '\n\n## Action Items\n\n' + formatted);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {autoSaving && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </>
            )}
            {!autoSaving && lastSaved && (
              <>
                <Check className="h-3 w-3 text-primary" />
                <span>Saved</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleTogglePin}
            className={cn(isPinned && 'text-primary')}
          >
            <Pin className={cn('h-5 w-5', isPinned && 'fill-current')} />
          </Button>
          
          <AIActionsMenu
            noteContent={content}
            onSummaryGenerated={handleSummaryGenerated}
            onActionItemsExtracted={handleActionItemsExtracted}
            disabled={!content.trim()}
          />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onDelete && (
                <DropdownMenuItem 
                  onClick={onDelete}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Note
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        {showTranscription ? (
          <TranscriptionPanel
            isConnected={transcription.isConnected}
            isConnecting={transcription.isConnecting}
            segments={transcription.segments}
            partialText={transcription.partialText}
            onStart={transcription.startTranscription}
            onStop={transcription.stopTranscription}
            onBookmark={transcription.addBookmark}
          />
        ) : (
          <div className="p-4 space-y-4">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title..."
              className="text-xl font-semibold border-0 px-0 focus-visible:ring-0 bg-transparent"
            />
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start typing your notes..."
              className="min-h-[300px] border-0 px-0 focus-visible:ring-0 bg-transparent resize-none text-foreground"
            />
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-between p-4 border-t border-border bg-card">
        <Button
          variant={showTranscription ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowTranscription(!showTranscription)}
          className="gap-2"
        >
          <Mic className={cn('h-4 w-4', transcription.isConnected && 'text-destructive animate-pulse')} />
          {transcription.isConnected ? 'Recording' : 'Transcribe'}
        </Button>
        
        {isNew && (
          <Button 
            onClick={handleSave}
            disabled={(!title.trim() && !content.trim()) || saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Create Note
          </Button>
        )}
      </div>
    </div>
  );
}
