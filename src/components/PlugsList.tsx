import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OptimizedAvatar } from "@/components/OptimizedAvatar";
import { usePlugs } from "@/hooks/usePlugs";
import { Zap, Check, X, Clock, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface PlugsListProps {
  type: 'sent' | 'received';
}

export function PlugsList({ type }: PlugsListProps) {
  const { sentPlugs, receivedPlugs, loading, respondToPlug } = usePlugs();
  const plugs = type === 'sent' ? sentPlugs : receivedPlugs;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (plugs.length === 0) {
    return (
      <Card className="bg-card border-border p-8 text-center">
        <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
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
      {plugs.map(plug => (
        <Card key={plug.id} className="bg-card border-border p-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">
                  {type === 'sent' ? 'You introduced' : (
                    <>
                      <span className="text-foreground font-medium">
                        {plug.sender_profile?.full_name || 'Someone'}
                      </span>
                      {' introduced you to'}
                    </>
                  )}
                </span>
              </div>
              <Badge 
                variant="outline" 
                className={
                  plug.status === 'completed' 
                    ? 'border-green-500/50 text-green-500' 
                    : 'border-yellow-500/50 text-yellow-500'
                }
              >
                {plug.status === 'completed' ? 'Completed' : 'Pending'}
              </Badge>
            </div>

            {/* Participants */}
            <div className="flex items-center gap-2 flex-wrap">
              {plug.participants?.map((participant, index) => (
                <div key={participant.id} className="flex items-center gap-1">
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
                  <div className="ml-1">
                    <p className="text-sm font-medium text-foreground">
                      {participant.user_profile?.full_name || 'Unknown'}
                    </p>
                    {participant.user_profile?.job_title && (
                      <p className="text-xs text-muted-foreground">
                        {participant.user_profile.job_title}
                      </p>
                    )}
                  </div>
                  {index < (plug.participants?.length || 0) - 1 && (
                    <Zap className="h-3 w-3 text-primary mx-2" />
                  )}
                </div>
              ))}
            </div>

            {/* Message */}
            {plug.message && (
              <p className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">
                "{plug.message}"
              </p>
            )}

            {/* Actions for received plugs */}
            {type === 'received' && plug.status === 'pending' && (
              <div className="flex gap-2 pt-2 border-t border-border">
                <Button
                  onClick={() => respondToPlug(plug.id, true)}
                  className="flex-1 bg-primary text-primary-foreground"
                  size="sm"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Accept
                </Button>
                <Button
                  onClick={() => respondToPlug(plug.id, false)}
                  variant="outline"
                  className="flex-1 border-destructive text-destructive"
                  size="sm"
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
      ))}
    </div>
  );
}
