import { formatDistanceToNow } from 'date-fns';
import { Plug, Check, X, MessageSquare, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OptimizedAvatar } from '@/components/OptimizedAvatar';
import { SwipeableCard } from './SwipeableCard';
import { cn } from '@/lib/utils';

interface PlugParticipant {
  id: string;
  name: string;
  avatar_url?: string | null;
  job_title?: string | null;
  company?: string | null;
}

interface PlugIntroductionProps {
  plug: {
    id: string;
    sender: PlugParticipant;
    participants: PlugParticipant[];
    message?: string | null;
    created_at: string;
    status: 'pending' | 'accepted' | 'declined';
  };
  currentUserId: string;
  onAccept?: (plugId: string) => Promise<void>;
  onDecline?: (plugId: string) => Promise<void>;
  onViewProfile?: (userId: string) => void;
  onDelete?: (plugId: string) => void;
  isSentPlug?: boolean;
}

export function PlugIntroduction({
  plug,
  currentUserId,
  onAccept,
  onDecline,
  onViewProfile,
  onDelete,
  isSentPlug = false,
}: PlugIntroductionProps) {
  // Filter out current user from participants to show who they're being introduced to
  const otherParticipants = plug.participants.filter(p => p.id !== currentUserId);
  
  // For sent plugs, show all participants being introduced
  const displayParticipants = isSentPlug ? plug.participants : otherParticipants;

  const content = (
    <div className="p-4 border border-border rounded-lg bg-card mb-4">
      {/* Plug Header */}
      <div className="flex items-center mb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent mr-3">
          <Plug className="h-5 w-5 text-accent-foreground" />
        </div>
        <div className="flex-1">
          {isSentPlug ? (
            <p className="font-medium text-foreground">
              You introduced {displayParticipants.map(p => p.name).join(' and ')}
            </p>
          ) : (
            <p className="font-medium text-foreground">
              <span 
                className="text-primary cursor-pointer hover:underline"
                onClick={() => onViewProfile?.(plug.sender.id)}
              >
                {plug.sender.name}
              </span>
              {' '}wants to introduce you to
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(plug.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Connection Visualization - Shows introducer connecting two people */}
      <div className="flex items-center justify-around mb-4 py-4 bg-muted/30 rounded-lg">
        {isSentPlug ? (
          // Sent plug: Show all participants being connected
          <>
            {displayParticipants.map((participant, index) => (
              <div key={participant.id} className="flex items-center">
                <div 
                  className="text-center cursor-pointer"
                  onClick={() => onViewProfile?.(participant.id)}
                >
                  <OptimizedAvatar
                    src={participant.avatar_url || undefined}
                    fallback={participant.name?.charAt(0) || '?'}
                    className="h-12 w-12 border-2 border-card mx-auto"
                  />
                  <p className="text-xs font-medium mt-1 truncate max-w-[80px]">{participant.name}</p>
                </div>
                {index < displayParticipants.length - 1 && (
                  <div className="flex items-center px-2">
                    <div className="h-px w-8 bg-border" />
                    <div className="bg-card p-1.5 rounded-full border border-border mx-1">
                      <Plug className="h-3 w-3 text-primary" />
                    </div>
                    <div className="h-px w-8 bg-border" />
                  </div>
                )}
              </div>
            ))}
          </>
        ) : (
          // Received plug: Show sender -> you -> other person
          <>
            {/* Sender (Introducer) */}
            <div 
              className="text-center cursor-pointer"
              onClick={() => onViewProfile?.(plug.sender.id)}
            >
              <OptimizedAvatar
                src={plug.sender.avatar_url || undefined}
                fallback={plug.sender.name?.charAt(0) || '?'}
                className="h-10 w-10 border-2 border-card mx-auto"
              />
              <p className="text-xs text-muted-foreground mt-1">Introducer</p>
            </div>

            {/* Arrow */}
            <ArrowRight className="h-4 w-4 text-muted-foreground" />

            {/* Current User */}
            <div className="text-center">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center mx-auto border-2 border-primary">
                <span className="text-primary text-xs font-semibold">You</span>
              </div>
            </div>

            {/* Connection Line with Plug Icon */}
            <div className="flex items-center px-2">
              <div className="h-px w-6 bg-border" />
              <div className="bg-card p-1.5 rounded-full border border-border">
                <Plug className="h-3 w-3 text-primary" />
              </div>
              <div className="h-px w-6 bg-border" />
            </div>

            {/* Other Participants */}
            <div className="flex -space-x-2">
              {otherParticipants.map((participant, index) => (
                <div 
                  key={participant.id} 
                  className="text-center cursor-pointer"
                  onClick={() => onViewProfile?.(participant.id)}
                  style={{ zIndex: otherParticipants.length - index }}
                >
                  <OptimizedAvatar
                    src={participant.avatar_url || undefined}
                    fallback={participant.name?.charAt(0) || '?'}
                    className="h-12 w-12 border-2 border-card"
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Participant Details */}
      {!isSentPlug && (
        <div className="space-y-2 mb-4">
          {otherParticipants.map((participant) => (
            <div 
              key={participant.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
              onClick={() => onViewProfile?.(participant.id)}
            >
              <OptimizedAvatar
                src={participant.avatar_url || undefined}
                fallback={participant.name?.charAt(0) || '?'}
                className="h-10 w-10"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">
                  {participant.name}
                </p>
                {(participant.job_title || participant.company) && (
                  <p className="text-xs text-muted-foreground truncate">
                    {[participant.job_title, participant.company].filter(Boolean).join(' at ')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Plug Message */}
      {plug.message && (
        <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border">
          <div className="flex items-start gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-foreground italic">"{plug.message}"</p>
              <p className="text-xs text-muted-foreground mt-1">- {plug.sender.name}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {plug.status === 'pending' && !isSentPlug && (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => onAccept?.(plug.id)}
            className="flex-1"
          >
            <Check className="h-4 w-4 mr-1" />
            Accept Introduction
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDecline?.(plug.id)}
          >
            <X className="h-4 w-4 mr-1" />
            Decline
          </Button>
        </div>
      )}

      {/* Status badges for accepted/declined */}
      {plug.status === 'accepted' && (
        <div className="flex items-center justify-center gap-2 py-2 bg-primary/10 rounded-lg text-primary">
          <Check className="h-4 w-4" />
          <span className="text-sm font-medium">Introduction Accepted</span>
        </div>
      )}

      {plug.status === 'declined' && (
        <div className="flex items-center justify-center gap-2 py-2 bg-muted rounded-lg text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="text-sm font-medium">Introduction Declined</span>
        </div>
      )}

      {/* Pending status for sent plugs */}
      {plug.status === 'pending' && isSentPlug && (
        <div className="flex items-center justify-center gap-2 py-2 bg-status-warning/10 rounded-lg text-status-warning">
          <span className="text-sm font-medium">Pending Response</span>
        </div>
      )}
    </div>
  );

  // Wrap with swipeable card if delete is available
  if (onDelete) {
    return (
      <SwipeableCard onDelete={() => onDelete(plug.id)}>
        {content}
      </SwipeableCard>
    );
  }

  return content;
}