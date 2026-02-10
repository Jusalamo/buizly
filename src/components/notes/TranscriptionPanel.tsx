import { Mic, MicOff, Square, Bookmark, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  isDiarizing?: boolean;
  segments: TranscriptionSegment[];
  partialText: string;
  numSpeakers?: number;
  onNumSpeakersChange?: (n: number) => void;
  onStart: () => void;
  onStop: () => void;
  onBookmark?: (segmentId: string) => void;
}

const speakerColors: Record<string, string> = {
  'speaker_0': 'text-blue-500',
  'speaker_1': 'text-green-500',
  'speaker_2': 'text-orange-500',
  'speaker_3': 'text-purple-500',
  'speaker_4': 'text-pink-500',
  'speaker_5': 'text-cyan-500',
};

function getSpeakerLabel(speaker: string): string {
  const match = speaker.match(/(\d+)/);
  if (match) return `Speaker ${parseInt(match[1]) + 1}`;
  return speaker;
}

export function TranscriptionPanel({
  isConnected,
  isConnecting,
  isDiarizing,
  segments,
  partialText,
  numSpeakers = 1,
  onNumSpeakersChange,
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
            isConnected ? 'bg-green-500 animate-pulse' : isDiarizing ? 'bg-yellow-500 animate-pulse' : 'bg-muted-foreground'
          )} />
          <span className="text-sm font-medium">
            {isDiarizing ? 'Identifying speakers...' : isConnected ? 'Recording...' : isConnecting ? 'Connecting...' : 'Ready to record'}
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
            disabled={isConnecting || isDiarizing}
            className="gap-2"
          >
            {isConnecting || isDiarizing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
            {isConnecting ? 'Connecting...' : isDiarizing ? 'Processing...' : 'Start Recording'}
          </Button>
        )}
      </div>

      {/* Speaker Count Selector */}
      {!isConnected && !isDiarizing && onNumSpeakersChange && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-secondary/30">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Speakers:</span>
          <Select 
            value={String(numSpeakers)} 
            onValueChange={(v) => onNumSpeakersChange(Number(v))}
          >
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 (No diarization)</SelectItem>
              <SelectItem value="2">2 Speakers</SelectItem>
              <SelectItem value="3">3 Speakers</SelectItem>
              <SelectItem value="4">4 Speakers</SelectItem>
              <SelectItem value="5">5 Speakers</SelectItem>
              <SelectItem value="6">6 Speakers</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Transcript Display */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {segments.length === 0 && !partialText && !isDiarizing ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MicOff className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm">Start recording to see the transcript here</p>
            {numSpeakers > 1 && (
              <p className="text-xs mt-2 text-primary">
                Speaker diarization enabled ({numSpeakers} speakers)
              </p>
            )}
          </div>
        ) : isDiarizing ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Loader2 className="h-12 w-12 mb-4 animate-spin text-primary" />
            <p className="text-sm font-medium">Identifying speakers...</p>
            <p className="text-xs mt-1">This may take a moment</p>
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
                  <span className={cn(
                    'text-xs font-medium mb-1 block',
                    speakerColors[segment.speaker] || 'text-primary'
                  )}>
                    {getSpeakerLabel(segment.speaker)}
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
