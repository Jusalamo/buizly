import { Mic, MicOff, Square, Bookmark, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TranscriptionSegment {
  id: string;
  text: string;
  timestamp: number;
  speaker?: string;
  bookmark?: string;
}

interface TranscriptionPanelProps {
  isConnected: boolean;
  isConnecting: boolean;
  segments: TranscriptionSegment[];
  partialText: string;
  onStart: () => void;
  onStop: () => void;
  onBookmark?: (segmentId: string) => void;
}

export function TranscriptionPanel({
  isConnected,
  isConnecting,
  segments,
  partialText,
  onStart,
  onStop,
  onBookmark,
}: TranscriptionPanelProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Control Bar */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className={cn(
            'h-3 w-3 rounded-full',
            isConnected ? 'bg-status-success animate-pulse' : 'bg-muted-foreground'
          )} />
          <span className="text-sm font-medium">
            {isConnected ? 'Recording...' : isConnecting ? 'Connecting...' : 'Ready to record'}
          </span>
        </div>
        
        {isConnected ? (
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={onStop}
            className="gap-2"
          >
            <Square className="h-4 w-4" />
            Stop
          </Button>
        ) : (
          <Button 
            size="sm" 
            onClick={onStart}
            disabled={isConnecting}
            className="gap-2"
          >
            {isConnecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
            {isConnecting ? 'Connecting...' : 'Start Recording'}
          </Button>
        )}
      </div>

      {/* Transcript Display */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {segments.length === 0 && !partialText ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MicOff className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm">Start recording to see the transcript here</p>
          </div>
        ) : (
          <>
            {segments.map((segment) => (
              <div 
                key={segment.id}
                className={cn(
                  'group relative p-3 rounded-lg border border-border bg-card',
                  segment.bookmark && 'border-primary/50 bg-primary/5'
                )}
              >
                {segment.speaker && (
                  <span className="text-xs font-medium text-primary mb-1 block">
                    {segment.speaker}
                  </span>
                )}
                <p className="text-sm text-foreground">{segment.text}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(segment.timestamp).toLocaleTimeString()}
                  </span>
                  {onBookmark && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'opacity-0 group-hover:opacity-100 transition-opacity h-6 px-2',
                        segment.bookmark && 'opacity-100'
                      )}
                      onClick={() => onBookmark(segment.id)}
                    >
                      <Bookmark className={cn(
                        'h-3 w-3',
                        segment.bookmark && 'fill-primary text-primary'
                      )} />
                    </Button>
                  )}
                </div>
                {segment.bookmark && (
                  <span className="absolute -top-2 left-3 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                    {segment.bookmark}
                  </span>
                )}
              </div>
            ))}
            
            {/* Partial/Live Text */}
            {partialText && (
              <div className="p-3 rounded-lg border border-dashed border-primary/50 bg-primary/5">
                <p className="text-sm text-foreground italic">{partialText}</p>
                <span className="text-xs text-muted-foreground">Speaking...</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
