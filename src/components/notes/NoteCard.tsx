import { format, formatDistanceToNow } from 'date-fns';
import { Pin, CheckSquare, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MeetingNote } from '@/types/calendar';

interface NoteCardProps {
  note: MeetingNote;
  onClick: () => void;
}

export function NoteCard({ note, onClick }: NoteCardProps) {
  const actionItemCount = note.ai_action_items?.filter(item => !item.completed).length || 0;
  const hasCalendarLink = note.meeting_id && !note.is_standalone;
  
  const getPreview = () => {
    if (note.ai_summary) return note.ai_summary;
    if (note.text_note) return note.text_note.slice(0, 100);
    if (note.transcript) return note.transcript.slice(0, 100);
    return 'No content';
  };

  const getRelativeDate = () => {
    const date = new Date(note.updated_at || note.created_at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return format(date, 'h:mm a');
    } else if (diffDays < 7) {
      return formatDistanceToNow(date, { addSuffix: true });
    } else {
      return format(date, 'MMM d');
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 bg-card rounded-xl border border-border/50",
        "hover:bg-accent/50 active:scale-[0.98] transition-all duration-150",
        "focus:outline-none focus:ring-2 focus:ring-primary/20"
      )}
    >
      {/* Title row */}
      <div className="flex items-start gap-2 mb-1">
        {note.is_pinned && (
          <Pin className="h-3.5 w-3.5 text-primary mt-1 flex-shrink-0 fill-current" />
        )}
        <h3 className="font-semibold text-foreground line-clamp-1 flex-1">
          {note.title || 'Untitled Note'}
        </h3>
      </div>
      
      {/* Metadata row */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <span>{getRelativeDate()}</span>
        
        {actionItemCount > 0 && (
          <>
            <span>·</span>
            <span className="flex items-center gap-1">
              <CheckSquare className="h-3 w-3" />
              {actionItemCount} task{actionItemCount !== 1 ? 's' : ''}
            </span>
          </>
        )}
        
        {hasCalendarLink && (
          <>
            <span>·</span>
            <Calendar className="h-3 w-3" />
          </>
        )}
      </div>
      
      {/* Preview */}
      <p className="text-sm text-muted-foreground line-clamp-2">
        {getPreview()}
      </p>
    </button>
  );
}
