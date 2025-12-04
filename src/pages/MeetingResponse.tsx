import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, Clock, MapPin, Check, X, Loader2 } from "lucide-react";
import type { Meeting, MeetingStatus } from "@/types/database";

export default function MeetingResponse() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const action = searchParams.get("action");
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMeeting();
    // Auto-process if action is provided
    if (action === "accept" || action === "decline") {
      handleResponse(action === "accept" ? "confirmed" : "declined");
    }
  }, [id, action]);

  const loadMeeting = async () => {
    if (!id) {
      setError("Invalid meeting link");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setError("Meeting not found");
        return;
      }

      setMeeting({
        ...data,
        status: (data.status || "pending") as MeetingStatus
      });
    } catch (err: any) {
      setError("Unable to load meeting details");
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (status: "confirmed" | "declined") => {
    if (!id || processing || completed) return;

    setProcessing(true);
    setError(null);

    try {
      // Update the meeting status
      const { error: updateError } = await supabase
        .from("meetings")
        .update({ status })
        .eq("id", id);

      if (updateError) throw updateError;

      // Find and update participant response if email matches
      const participantEmail = searchParams.get("email");
      if (participantEmail) {
        await supabase
          .from("meeting_participants")
          .update({ 
            response: status,
            responded_at: new Date().toISOString()
          })
          .eq("meeting_id", id)
          .eq("email", participantEmail);
      }

      setCompleted(true);
      if (meeting) {
        setMeeting({ ...meeting, status });
      }
    } catch (err: any) {
      setError("Failed to process your response. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !meeting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="bg-card border-border p-8 text-center max-w-md">
          <h1 className="text-xl font-bold text-foreground mb-4">Oops!</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => navigate("/")} className="bg-primary text-primary-foreground">
            Go to Buizly
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="bg-card border-border p-8 max-w-lg w-full space-y-6">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">Buizly</h1>
        </div>

        {/* Status Message */}
        {completed && (
          <div className={`text-center p-4 rounded-lg ${
            meeting?.status === "confirmed" 
              ? "bg-green-500/20 text-green-500" 
              : "bg-red-500/20 text-red-500"
          }`}>
            <div className="flex items-center justify-center gap-2">
              {meeting?.status === "confirmed" ? (
                <Check className="h-5 w-5" />
              ) : (
                <X className="h-5 w-5" />
              )}
              <span className="font-medium">
                {meeting?.status === "confirmed" 
                  ? "Meeting Accepted!" 
                  : "Meeting Declined"}
              </span>
            </div>
          </div>
        )}

        {/* Meeting Details */}
        {meeting && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">
              {meeting.title || "Meeting"}
            </h2>

            <div className="bg-secondary rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3 text-foreground">
                <Calendar className="h-4 w-4 text-primary" />
                <span>
                  {new Date(meeting.meeting_date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  })}
                </span>
              </div>
              <div className="flex items-center gap-3 text-foreground">
                <Clock className="h-4 w-4 text-primary" />
                <span>{meeting.meeting_time}</span>
              </div>
              {meeting.location && (
                <div className="flex items-center gap-3 text-foreground">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{meeting.location}</span>
                </div>
              )}
            </div>

            {meeting.description && (
              <p className="text-muted-foreground text-sm">{meeting.description}</p>
            )}
          </div>
        )}

        {/* Action Buttons - only show if not completed */}
        {!completed && meeting && meeting.status === "pending" && (
          <div className="flex gap-3">
            <Button
              onClick={() => handleResponse("confirmed")}
              disabled={processing}
              className="flex-1 bg-primary text-primary-foreground"
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Accept
                </>
              )}
            </Button>
            <Button
              onClick={() => handleResponse("declined")}
              disabled={processing}
              variant="outline"
              className="flex-1 border-red-500 text-red-500 hover:bg-red-500/10"
            >
              <X className="h-4 w-4 mr-2" />
              Decline
            </Button>
          </div>
        )}

        {/* Already Responded */}
        {!completed && meeting && meeting.status !== "pending" && (
          <div className="text-center p-4 bg-secondary rounded-lg">
            <p className="text-muted-foreground">
              This meeting is already {meeting.status}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-red-500 text-center text-sm">{error}</p>
        )}

        {/* Download App CTA */}
        <div className="pt-4 border-t border-border text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Manage all your meetings with Buizly
          </p>
          <Button
            onClick={() => navigate("/auth")}
            variant="ghost"
            className="text-primary hover:bg-primary/10"
          >
            Get the App
          </Button>
        </div>
      </Card>
    </div>
  );
}
