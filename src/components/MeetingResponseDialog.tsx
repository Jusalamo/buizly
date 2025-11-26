import { useState } from "react";
import { Check, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMeetings } from "@/hooks/useMeetings";
import type { MeetingStatus } from "@/types/database";

interface MeetingResponseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participantId: string;
  meetingTitle: string;
  meetingDate: string;
  meetingTime: string;
}

export function MeetingResponseDialog({
  open,
  onOpenChange,
  participantId,
  meetingTitle,
  meetingDate,
  meetingTime
}: MeetingResponseDialogProps) {
  const [showSuggestTime, setShowSuggestTime] = useState(false);
  const [suggestedDate, setSuggestedDate] = useState("");
  const [suggestedTime, setSuggestedTime] = useState("");
  const [loading, setLoading] = useState(false);

  const { updateParticipantResponse } = useMeetings();
  const { toast } = useToast();

  const handleResponse = async (response: MeetingStatus, suggestedTimeStr?: string) => {
    setLoading(true);
    try {
      await updateParticipantResponse(participantId, response, suggestedTimeStr);
      toast({
        title: response === "confirmed" ? "Meeting accepted" : 
               response === "declined" ? "Meeting declined" : 
               "New time suggested",
        description: response === "confirmed" ? "You've confirmed your attendance" :
                     response === "declined" ? "The organizer has been notified" :
                     "Your suggested time has been sent to the organizer"
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestNewTime = () => {
    if (!suggestedDate || !suggestedTime) {
      toast({
        title: "Missing information",
        description: "Please select both a date and time",
        variant: "destructive"
      });
      return;
    }
    handleResponse("rescheduled", `${suggestedDate} at ${suggestedTime}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Meeting Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-card-surface rounded-lg p-4">
            <h3 className="font-medium text-foreground">{meetingTitle}</h3>
            <p className="text-sm text-muted-foreground">
              {new Date(meetingDate).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
              })}
            </p>
            <p className="text-sm text-muted-foreground">{meetingTime}</p>
          </div>

          {!showSuggestTime ? (
            <div className="space-y-2">
              <Button
                onClick={() => handleResponse("confirmed")}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <Check className="h-4 w-4 mr-2" />
                Accept
              </Button>
              
              <Button
                onClick={() => handleResponse("declined")}
                disabled={loading}
                variant="outline"
                className="w-full border-red-500 text-red-500 hover:bg-red-500/10"
              >
                <X className="h-4 w-4 mr-2" />
                Decline
              </Button>
              
              <Button
                onClick={() => setShowSuggestTime(true)}
                disabled={loading}
                variant="outline"
                className="w-full border-border text-foreground"
              >
                <Clock className="h-4 w-4 mr-2" />
                Suggest New Time
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Suggested Date</Label>
                <Input
                  type="date"
                  value={suggestedDate}
                  onChange={(e) => setSuggestedDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-foreground">Suggested Time</Label>
                <Input
                  type="time"
                  value={suggestedTime}
                  onChange={(e) => setSuggestedTime(e.target.value)}
                  className="bg-secondary border-border text-foreground"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setShowSuggestTime(false)}
                  variant="outline"
                  className="flex-1 border-border"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSuggestNewTime}
                  disabled={loading}
                  className="flex-1 bg-primary text-primary-foreground"
                >
                  Send Suggestion
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
