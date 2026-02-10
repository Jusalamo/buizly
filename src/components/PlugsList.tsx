import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OptimizedAvatar } from "@/components/OptimizedAvatar";
import { usePlugs } from "@/hooks/usePlugs";
import { Plug, Check, X, Clock, Trash2, Loader2, Building } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAppCache } from "@/hooks/useAppCache";

interface PlugsListProps {
  type: 'sent' | 'received';
}

export function PlugsList({ type }: PlugsListProps) {
  const { sentPlugs, receivedPlugs, loading, respondToPlug, deletePlug } = usePlugs();
  const { profile } = useAppCache();
  const plugs = type === 'sent' ? sentPlugs : receivedPlugs;
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const visiblePlugs = type === 'received' 
    ? plugs.filter(plug => {
        const myParticipant = plug.participants?.find(p => p.user_id === profile?.id);
        return myParticipant?.status !== 'declined';
      })
    : plugs;

  const handleDelete = async (plugId: string) => {
    setDeletingId(plugId);
    try {
      await deletePlug(plugId, type === 'sent');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRespond = async (plugId: string, accept: boolean) => {
    setRespondingId(plugId);
    try {
      await respondToPlug(plugId, accept);
    } finally {
      setRespondingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (visiblePlugs.length === 0) {
    return (
      <Card className="bg-card border-border p-8 text-center">
        <Plug className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-foreground font-medium mb-1">
          {type === 'sent' ? 'No plugs sent yet' : 'No introductions received'}
        </p>
        <p className="text-muted-foreground text-sm">
          {type === 'sent' 
            ? 'Create a plug to introduce your contacts to each other' 
            : 'When someone introduces you to others, it will appear here'}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {visiblePlugs.map(plug => {
        const otherParticipants = plug.participants?.filter(p => p.user_id !== profile?.id) || [];
        const myParticipant = plug.participants?.find(p => p.user_id === profile?.id);
        const isPending = myParticipant?.status === 'pending';

        return (
          <Card key={plug.id} className="bg-card border-border p-4">
            <div className="space-y-4">
              {/* Header with sender info and delete */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Plug className="h-5 w-5 text-primary flex-shrink-0" />
                  {type === 'received' ? (
                    <div className="flex items-center gap-2 min-w-0">
                      <OptimizedAvatar
                        src={plug.sender_profile?.avatar_url}
                        alt={plug.sender_profile?.full_name || 'Sender'}
                        fallback={(plug.sender_profile?.full_name || 'S').charAt(0)}
                        size="sm"
                      />
                      <span className="text-sm truncate">
                        <span className="text-foreground font-medium">
                          {plug.sender_profile?.full_name || 'Someone'}
                        </span>
                        <span className="text-muted-foreground"> wants to introduce you to</span>
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      You introduced
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge 
                    variant="outline" 
                    className={
                      plug.status === 'completed' 
                        ? 'border-green-500/50 text-green-500' 
                        : myParticipant?.status === 'accepted'
                        ? 'border-green-500/50 text-green-500'
                        : 'border-yellow-500/50 text-yellow-500'
                    }
                  >
                    {plug.status === 'completed' 
                      ? 'Connected' 
                      : myParticipant?.status === 'accepted' 
                      ? 'Accepted' 
                      : 'Pending'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(plug.id)}
                    disabled={deletingId === plug.id}
                  >
                    {deletingId === plug.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Received plugs - show OTHER participants with full details */}
              {type === 'received' && otherParticipants.length > 0 && (
                <div className="space-y-2">
                  {otherParticipants.map((participant) => (
                    <div key={participant.id} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                      <div className="relative">
                        <OptimizedAvatar
                          src={participant.user_profile?.avatar_url}
                          alt={participant.user_profile?.full_name || 'User'}
                          fallback={(participant.user_profile?.full_name || 'U').charAt(0)}
                          size="lg"
                          className="border-2 border-muted"
                        />
                        {participant.status === 'accepted' && (
                          <div className="absolute -bottom-1 -right-1 p-0.5 bg-green-500 rounded-full">
                            <Check className="h-2.5 w-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {participant.user_profile?.full_name || 'Unknown'}
                        </p>
                        {participant.user_profile?.job_title && (
                          <p className="text-xs text-primary truncate">{participant.user_profile.job_title}</p>
                        )}
                        {participant.user_profile?.company && (
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {participant.user_profile.company}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className={
                        participant.status === 'accepted' ? 'border-green-500/50 text-green-500 text-xs' :
                        participant.status === 'declined' ? 'border-destructive/50 text-destructive text-xs' :
                        'border-yellow-500/50 text-yellow-500 text-xs'
                      }>
                        {participant.status === 'accepted' ? 'Accepted' : participant.status === 'declined' ? 'Declined' : 'Pending'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* Sent plugs - show all participants */}
              {type === 'sent' && (
                <div className="space-y-2">
                  {plug.participants?.map((participant) => (
                    <div key={participant.id} className="flex items-center gap-3 p-2 rounded-lg">
                      <div className="relative">
                        <OptimizedAvatar
                          src={participant.user_profile?.avatar_url}
                          alt={participant.user_profile?.full_name || 'User'}
                          fallback={(participant.user_profile?.full_name || 'U').charAt(0)}
                          size="md"
                        />
                        {participant.status === 'accepted' && (
                          <div className="absolute -bottom-1 -right-1 p-0.5 bg-green-500 rounded-full">
                            <Check className="h-2 w-2 text-white" />
                          </div>
                        )}
                        {participant.status === 'declined' && (
                          <div className="absolute -bottom-1 -right-1 p-0.5 bg-red-500 rounded-full">
                            <X className="h-2 w-2 text-white" />
                          </div>
                        )}
                        {participant.status === 'pending' && (
                          <div className="absolute -bottom-1 -right-1 p-0.5 bg-yellow-500 rounded-full">
                            <Clock className="h-2 w-2 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {participant.user_profile?.full_name || 'Unknown'}
                        </p>
                        {participant.user_profile?.job_title && (
                          <p className="text-xs text-muted-foreground truncate">
                            {participant.user_profile.job_title}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Message/Reason */}
              {plug.message && (
                <div className="bg-secondary/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Reason for introduction:</p>
                  <p className="text-sm text-foreground">"{plug.message}"</p>
                </div>
              )}

              {/* Actions for received pending plugs */}
              {type === 'received' && isPending && (
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button
                    onClick={() => handleRespond(plug.id, true)}
                    className="flex-1 bg-primary text-primary-foreground"
                    size="sm"
                    disabled={respondingId === plug.id}
                  >
                    {respondingId === plug.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Accept Introduction
                  </Button>
                  <Button
                    onClick={() => handleRespond(plug.id, false)}
                    variant="outline"
                    className="flex-1 border-destructive text-destructive"
                    size="sm"
                    disabled={respondingId === plug.id}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Decline
                  </Button>
                </div>
              )}

              {/* Timestamp */}
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(plug.created_at), { addSuffix: true })}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
