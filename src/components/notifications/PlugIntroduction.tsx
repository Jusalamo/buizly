import { formatDistanceToNow } from 'date-fns';
import { Plug, Check, X, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OptimizedAvatar } from '@/components/OptimizedAvatar';
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
}

export function PlugIntroduction({
  plug,
  currentUserId,
  onAccept,
  onDecline,
  onViewProfile,
}: PlugIntroductionProps) {
  // Filter out current user from participants to show who they're being introduced to
  const otherParticipants = plug.participants.filter(p => p.id !== currentUserId);

  return (
    <div className="p-4 border border-border rounded-lg bg-card mb-4">
      {/* Plug Header */}
      <div className="flex items-center mb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent mr-3">
          <Plug className="h-5 w-5 text-accent-foreground" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-foreground">
            <span 
              className="text-primary cursor-pointer hover:underline"
              onClick={() => onViewProfile?.(plug.sender.id)}
            >
              {plug.sender.name}
            </span>
            {' '}introduced you to
          </p>
          <p className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(plug.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Connection Visualization */}
      <div className="flex items-center justify-around mb-4 py-4 bg-muted/30 rounded-lg">
        {/* Current User */}
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-1">You</div>
          <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
            <span className="text-primary font-semibold">You</span>
          </div>
        </div>

        {/* Connection Line with Plug Icon */}
        <div className="flex-1 px-2 relative max-w-[100px]">
          <div className="h-px bg-border w-full absolute top-1/2 transform -translate-y-1/2" />
          <div className="relative flex justify-center">
            <div className="bg-card p-1.5 rounded-full border border-border">
              <Plug className="h-4 w-4 text-primary" />
            </div>
          </div>
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
      </div>

      {/* Participant Details */}
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
      {plug.status === 'pending' && (
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
    </div>
  );
}
