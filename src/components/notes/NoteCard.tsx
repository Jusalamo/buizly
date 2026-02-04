import { formatDistanceToNow } from 'date-fns';
import { FileText, Pin, Calendar, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NoteCardProps {
  id: string;
  title?: string | null;
  content?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  isPinned?: boolean;
  tags?: string[] | null;
  linkedMeeting?: string | null;
  onClick: () => void;
  className?: string;
}

export function NoteCard({
  title,
  content,
  createdAt,
  updatedAt,
  isPinned,
  tags,
  linkedMeeting,
  onClick,
  className
}: NoteCardProps) {
  const displayDate = updatedAt || createdAt;
  const timeAgo = formatDistanceToNow(new Date(displayDate), { addSuffix: true });
  
  // Get preview text from content (strip markdown/formatting)
  const previewText = content
    ?.replace(/[#*_~`]/g, '')
    ?.replace(/\n/g, ' ')
    ?.slice(0, 100)
    ?.trim();

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 bg-card border border-border rounded-lg cursor-pointer',
        'hover:bg-card/80 hover:border-primary/50 transition-all',
        'active:scale-[0.99]',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isPinned && (
              <Pin className="h-3.5 w-3.5 text-primary shrink-0" />
            )}
            <h3 className="font-medium text-foreground truncate">
              {title || 'Untitled Note'}
            </h3>
          </div>
          
          {previewText && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {previewText}...
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{timeAgo}</span>
            
            {linkedMeeting && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span className="truncate max-w-[100px]">{linkedMeeting}</span>
              </div>
            )}
            
            {tags && tags.length > 0 && (
              <div className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                <span>{tags.length}</span>
              </div>
            )}
          </div>
        </div>
        
        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
      </div>
    </div>
  );
}
