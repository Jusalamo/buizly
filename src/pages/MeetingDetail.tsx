import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ParticipantsList } from "@/components/ParticipantsList";
import { MeetingForm } from "@/components/MeetingForm";
import { MeetingDetailSkeleton } from "@/components/skeletons/PageSkeletons";
import { useToast } from "@/hooks/use-toast";
import { useMeetings } from "@/hooks/useMeetings";
import { 
  ArrowLeft, Calendar, Clock, MapPin, Edit, FileText, Image,
  ExternalLink, X
} from "lucide-react";
import type { Meeting, MeetingStatus } from "@/types/database";

// Use semantic CSS tokens for status colors
const statusColors: Record<MeetingStatus, string> = {
  pending: "bg-status-warning/20 text-status-warning",
  confirmed: "bg-status-success/20 text-status-success",
  declined: "bg-status-error/20 text-status-error",
  cancelled: "bg-muted text-muted-foreground",
  rescheduled: "bg-blue-500/20 text-blue-500"
};

// Helper to parse meeting description JSON
interface ParsedDescription {
  description: string;
  notes: string;
  photos: string[];
}

function parseDescription(descriptionJson: string | null): ParsedDescription {
  if (!descriptionJson) return { description: "", notes: "", photos: [] };
  
  try {
    const parsed = JSON.parse(descriptionJson);
    return {
      description: parsed.description || "",
      notes: parsed.notes || "",
      photos: Array.isArray(parsed.photos) ? parsed.photos : []
    };
  } catch {
    // If not valid JSON, treat as plain text description
    return { description: descriptionJson, notes: "", photos: [] };
  }
}

export default function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { cancelMeeting, deleteMeeting } = useMeetings();
  
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);

  useEffect(() => {
    fetchMeeting();
  }, [id]);

  const fetchMeeting = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !id) return;

      const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        navigate("/");
        return;
      }

      setMeeting({
        ...data,
        status: (data.status || "pending") as MeetingStatus
      });
      setIsOrganizer(data.organizer_id === user.id || data.user_id === user.id);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!meeting) return;
    await cancelMeeting(meeting.id);
    toast({ title: "Meeting cancelled" });
    fetchMeeting();
  };

  const handleDelete = async () => {
    if (!meeting) return;
    await deleteMeeting(meeting.id);
    toast({ title: "Meeting deleted" });
    navigate("/");
  };

  const generateCalendarLink = () => {
    if (!meeting) return "";
    const start = new Date(`${meeting.meeting_date}T${convertTo24Hour(meeting.meeting_time)}`);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: meeting.title || "Meeting",
      dates: `${formatGoogleDate(start)}/${formatGoogleDate(end)}`,
      details: meeting.description || "",
      location: meeting.location || ""
    });
    
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const convertTo24Hour = (time: string) => {
    const [timePart, modifier] = time.split(" ");
    let [hours, minutes] = timePart.split(":");
    if (modifier === "PM" && hours !== "12") hours = String(parseInt(hours) + 12);
    if (modifier === "AM" && hours === "12") hours = "00";
    return `${hours.padStart(2, "0")}:${minutes}:00`;
  };

  const formatGoogleDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  if (loading) {
    return (
      <Layout title="Meeting">
        <MeetingDetailSkeleton />
      </Layout>
    );
  }

  if (!meeting) return null;

  return (
    <Layout title="Meeting Details">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        {/* Meeting Header */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {meeting.title || "Untitled Meeting"}
              </h1>
              <Badge className={`${statusColors[meeting.status]} border-0 mt-2`}>
                {meeting.status}
              </Badge>
            </div>
            {isOrganizer && (
              <Button variant="ghost" size="icon" onClick={() => setShowEditForm(true)}>
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="space-y-3 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{new Date(meeting.meeting_date).toLocaleDateString("en-US", {
                weekday: "long", year: "numeric", month: "long", day: "numeric"
              })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{meeting.meeting_time}</span>
            </div>
            {meeting.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{meeting.location}</span>
              </div>
            )}
          </div>

          {/* Description, Notes & Photos - Consolidated */}
          {(() => {
            const parsed = parseDescription(meeting.description);
            const hasContent = parsed.description || parsed.notes || parsed.photos.length > 0;
            
            if (!hasContent) return null;
            
            return (
              <div className="mt-4 space-y-4">
                {parsed.description && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">Description</span>
                    </div>
                    <p className="text-foreground">{parsed.description}</p>
                  </div>
                )}
                
                {parsed.notes && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">Notes</span>
                    </div>
                    <p className="text-muted-foreground">{parsed.notes}</p>
                  </div>
                )}
                
                {parsed.photos.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Image className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">Photos</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {parsed.photos.map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt={`Meeting photo ${index + 1}`}
                          className="h-20 w-20 object-cover rounded-lg border border-border"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <Button
            onClick={() => window.open(generateCalendarLink(), "_blank")}
            variant="outline"
            className="w-full mt-4 border-primary text-primary"
          >
            <ExternalLink className="h-4 w-4 mr-2" /> Add to Google Calendar
          </Button>
        </div>

        {/* Participants */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <ParticipantsList meetingId={meeting.id} isOrganizer={isOrganizer} />
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={() => setShowFollowUpForm(true)}
            className="w-full bg-primary text-primary-foreground"
          >
            Schedule Follow-Up Meeting
          </Button>

          {isOrganizer && meeting.status !== "cancelled" && (
            <Button onClick={handleCancel} variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive/10">
              Cancel Meeting
            </Button>
          )}
        </div>
      </div>

      <MeetingForm open={showEditForm} onOpenChange={setShowEditForm} editMeeting={meeting} />
      <MeetingForm 
        open={showFollowUpForm} 
        onOpenChange={setShowFollowUpForm}
        prefillData={{
          title: `Follow-up: ${meeting.title}`,
          description: meeting.description || undefined,
          location: meeting.location || undefined,
          parent_meeting_id: meeting.id
        }}
      />
    </Layout>
  );
}
