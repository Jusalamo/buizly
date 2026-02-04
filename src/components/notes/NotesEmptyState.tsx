import { FileText, Plus, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NotesEmptyStateProps {
  onCreateNote: () => void;
  onStartRecording?: () => void;
}

export function NotesEmptyState({ onCreateNote, onStartRecording }: NotesEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="p-4 bg-primary/10 rounded-full mb-4">
        <FileText className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        No notes yet
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        Create your first note to capture meeting insights, action items, and important discussions.
      </p>
      <div className="flex gap-3">
        <Button onClick={onCreateNote} className="gap-2">
          <Plus className="h-4 w-4" />
          New Note
        </Button>
        {onStartRecording && (
          <Button variant="outline" onClick={onStartRecording} className="gap-2">
            <Mic className="h-4 w-4" />
            Record Meeting
          </Button>
        )}
      </div>
    </div>
  );
}
