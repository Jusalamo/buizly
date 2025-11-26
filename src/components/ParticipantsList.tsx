import { useState, useEffect } from "react";
import { Check, X, Clock, UserPlus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMeetings } from "@/hooks/useMeetings";
import type { MeetingParticipant, MeetingStatus } from "@/types/database";

interface ParticipantsListProps {
  meetingId: string;
  isOrganizer: boolean;
  onAddParticipant?: () => void;
}

const statusColors: Record<MeetingStatus, string> = {
  pending: "bg-yellow-500/20 text-yellow-500",
  confirmed: "bg-green-500/20 text-green-500",
  declined: "bg-red-500/20 text-red-500",
  cancelled: "bg-gray-500/20 text-gray-500",
  rescheduled: "bg-blue-500/20 text-blue-500"
};

const statusIcons: Record<MeetingStatus, React.ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  confirmed: <Check className="h-3 w-3" />,
  declined: <X className="h-3 w-3" />,
  cancelled: <X className="h-3 w-3" />,
  rescheduled: <Clock className="h-3 w-3" />
};

export function ParticipantsList({ 
  meetingId, 
  isOrganizer, 
  onAddParticipant 
}: ParticipantsListProps) {
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const { getMeetingParticipants, removeParticipant } = useMeetings();

  useEffect(() => {
    fetchParticipants();
  }, [meetingId]);

  const fetchParticipants = async () => {
    setLoading(true);
    const data = await getMeetingParticipants(meetingId);
    setParticipants(data);
    setLoading(false);
  };

  const handleRemove = async (participantId: string) => {
    await removeParticipant(participantId);
    fetchParticipants();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">
          Participants ({participants.length})
        </h4>
        {isOrganizer && onAddParticipant && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddParticipant}
            className="text-primary"
          >
            <UserPlus className="h-4 w-4 mr-1" />
            Add
          </Button>
        )}
      </div>

      {participants.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          No participants added yet
        </p>
      ) : (
        <div className="space-y-2">
          {participants.map((participant) => (
            <div 
              key={participant.id}
              className="flex items-center justify-between p-3 bg-card-surface rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {participant.name || "No name"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {participant.email}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge className={`${statusColors[participant.response]} border-0`}>
                  <span className="flex items-center gap-1">
                    {statusIcons[participant.response]}
                    {participant.response}
                  </span>
                </Badge>

                {isOrganizer && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-card border-border">
                      <DropdownMenuItem 
                        onClick={() => handleRemove(participant.id)}
                        className="text-red-500 focus:text-red-500"
                      >
                        Remove participant
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {participant.suggested_time && (
                <p className="text-xs text-primary mt-1">
                  Suggested: {participant.suggested_time}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
