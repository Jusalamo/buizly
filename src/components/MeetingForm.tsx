import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X, Mail, CalendarIcon, Clock, MapPin, Image, FileText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMeetings } from "@/hooks/useMeetings";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Connection, Meeting } from "@/types/database";

const timeSlots = [
  "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM",
  "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM"
];

interface MeetingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editMeeting?: Meeting | null;
  prefillData?: {
    title?: string;
    description?: string;
    location?: string;
    connection_id?: string;
    parent_meeting_id?: string;
  };
}

interface Participant {
  email: string;
  name: string;
}

export function MeetingForm({ open, onOpenChange, editMeeting, prefillData }: MeetingFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newParticipantEmail, setNewParticipantEmail] = useState("");
  const [newParticipantName, setNewParticipantName] = useState("");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [meetingPhotos, setMeetingPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);

  const { createMeeting, updateMeeting } = useMeetings();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchConnections();
  }, []);

  useEffect(() => {
    if (editMeeting) {
      setTitle(editMeeting.title || "");
      setDescription(editMeeting.description || "");
      setDate(new Date(editMeeting.meeting_date));
      setTime(editMeeting.meeting_time);
      setLocation(editMeeting.location || "");
      setSelectedConnection(editMeeting.connection_id || "");
    } else if (prefillData) {
      setTitle(prefillData.title || "");
      setDescription(prefillData.description || "");
      setLocation(prefillData.location || "");
      setSelectedConnection(prefillData.connection_id || "");
    }
  }, [editMeeting, prefillData]);

  const fetchConnections = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("connections")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      console.error("Error fetching connections:", error);
    }
  };

  const addParticipant = () => {
    if (!newParticipantEmail.trim()) return;

    setParticipants(prev => [...prev, {
      email: newParticipantEmail.trim(),
      name: newParticipantName.trim()
    }]);
    setNewParticipantEmail("");
    setNewParticipantName("");
    setShowAddParticipant(false);
  };

  const addConnectionAsParticipant = (connection: Connection) => {
    if (!connection.connection_email) {
      toast({
        title: "No email",
        description: "This connection doesn't have an email address",
        variant: "destructive"
      });
      return;
    }

    if (participants.find(p => p.email === connection.connection_email)) {
      toast({
        title: "Already added",
        description: "This participant is already in the list",
        variant: "destructive"
      });
      return;
    }

    setParticipants(prev => [...prev, {
      email: connection.connection_email!,
      name: connection.connection_name
    }]);
  };

  const removeParticipant = (email: string) => {
    setParticipants(prev => prev.filter(p => p.email !== email));
  };

  const handlePhotoUpload = (urls: string[]) => {
    setMeetingPhotos(prev => [...prev, ...urls]);
  };

  const removePhoto = (index: number) => {
    setMeetingPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: "Missing title",
        description: "Please enter a meeting title",
        variant: "destructive"
      });
      return;
    }

    if (!date || !time) {
      toast({
        title: "Missing date/time",
        description: "Please select a date and time",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Combine description, notes, and photos into a structured description
      const fullDescription = JSON.stringify({
        description: description || "",
        notes: notes || "",
        photos: meetingPhotos
      });

      if (editMeeting) {
        await updateMeeting(editMeeting.id, {
          title,
          description: fullDescription,
          meeting_date: date.toISOString().split("T")[0],
          meeting_time: time,
          location: location || null,
          connection_id: selectedConnection || null
        });
        toast({
          title: "Meeting updated",
          description: "Your meeting has been updated successfully"
        });
      } else {
        await createMeeting({
          title,
          description: fullDescription,
          meeting_date: date.toISOString().split("T")[0],
          meeting_time: time,
          location,
          connection_id: selectedConnection || undefined,
          participants,
          parent_meeting_id: prefillData?.parent_meeting_id
        });
        toast({
          title: "Meeting created",
          description: "Your meeting request has been sent"
        });
      }

      onOpenChange(false);
      resetForm();
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

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDate(new Date());
    setTime("");
    setLocation("");
    setParticipants([]);
    setSelectedConnection("");
    setMeetingPhotos([]);
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {editMeeting ? "Edit Meeting" : "Schedule Meeting"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label className="text-foreground">Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meeting title"
              className="bg-secondary border-border text-foreground"
            />
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Date Picker with Popover */}
            <div className="space-y-2">
              <Label className="text-foreground flex items-center gap-1">
                <CalendarIcon className="h-3.5 w-3.5" />
                Date *
              </Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-secondary border-border",
                      !date && "text-muted-foreground"
                    )}
                  >
                    {date ? format(date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(selectedDate) => {
                      setDate(selectedDate);
                      setCalendarOpen(false);
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Picker */}
            <div className="space-y-2">
              <Label className="text-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Time *
              </Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger className="bg-secondary border-border text-foreground">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border max-h-[200px]">
                  {timeSlots.map((slot) => (
                    <SelectItem key={slot} value={slot} className="text-foreground">
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              Location
            </Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Meeting location or video link"
              className="bg-secondary border-border text-foreground"
            />
          </div>

          {/* Participants */}
          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              Participants
            </Label>
            
            {/* Participant list */}
            {participants.length > 0 && (
              <div className="space-y-2 mb-2">
                {participants.map((p) => (
                  <div 
                    key={p.email} 
                    className="flex items-center justify-between p-2 bg-card-surface rounded-lg"
                  >
                    <div>
                      <p className="text-sm text-foreground">{p.name || "No name"}</p>
                      <p className="text-xs text-muted-foreground">{p.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeParticipant(p.email)}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add from connections */}
            {connections.length > 0 && (
              <Select onValueChange={(id) => {
                const conn = connections.find(c => c.id === id);
                if (conn) addConnectionAsParticipant(conn);
              }}>
                <SelectTrigger className="bg-secondary border-border text-foreground">
                  <SelectValue placeholder="Add from your network" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {connections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id} className="text-foreground">
                      {conn.connection_name} {conn.connection_email ? `(${conn.connection_email})` : "(No email)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Add by email */}
            {showAddParticipant ? (
              <div className="space-y-2 p-3 bg-card-surface rounded-lg">
                <Input
                  value={newParticipantName}
                  onChange={(e) => setNewParticipantName(e.target.value)}
                  placeholder="Name (optional)"
                  className="bg-secondary border-border text-foreground"
                />
                <Input
                  type="email"
                  value={newParticipantEmail}
                  onChange={(e) => setNewParticipantEmail(e.target.value)}
                  placeholder="Email address"
                  className="bg-secondary border-border text-foreground"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddParticipant(false)}
                    className="flex-1 border-border"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={addParticipant}
                    className="flex-1 bg-primary text-primary-foreground"
                  >
                    Add
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowAddParticipant(true)}
                className="w-full border-border text-foreground"
              >
                <Mail className="h-4 w-4 mr-2" />
                Add by email
              </Button>
            )}
          </div>

          {/* Description & Notes (Consolidated) */}
          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              Description & Notes
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Meeting description and agenda..."
              className="bg-secondary border-border text-foreground min-h-[80px]"
            />
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes for participants..."
              className="bg-secondary border-border text-foreground min-h-[60px]"
            />
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-1">
              <Image className="h-3.5 w-3.5" />
              Photos & Media
            </Label>
            
            {/* Existing photos */}
            {meetingPhotos.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {meetingPhotos.map((url, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={url} 
                      alt={`Meeting photo ${index + 1}`}
                      className="h-16 w-16 object-cover rounded-lg border border-border"
                    />
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute -top-1 -right-1 p-1 bg-destructive rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3 text-destructive-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {meetingPhotos.length < 5 && (
              <div className="flex gap-2">
                <input
                  type="file"
                  accept="image/*"
                  id="meeting-photo-upload"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) throw new Error("Not authenticated");
                      
                      const fileName = `${user.id}/temp/photo-${Date.now()}.${file.name.split(".").pop()}`;
                      
                      const { error: uploadError } = await supabase.storage
                        .from("meeting-media")
                        .upload(fileName, file, { contentType: file.type });
                      
                      if (uploadError) throw uploadError;
                      
                      const { data: signedUrlData } = await supabase.storage
                        .from("meeting-media")
                        .createSignedUrl(fileName, 31536000);
                      
                      if (signedUrlData?.signedUrl) {
                        setMeetingPhotos(prev => [...prev, signedUrlData.signedUrl]);
                      }
                    } catch (error: any) {
                      toast({
                        title: "Upload failed",
                        description: error.message,
                        variant: "destructive"
                      });
                    }
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('meeting-photo-upload')?.click()}
                  className="flex-1 border-border text-foreground"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Photo ({meetingPhotos.length}/5)
                </Button>
              </div>
            )}
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-6"
          >
            {loading ? "Saving..." : (editMeeting ? "Update Meeting" : "Send Meeting Request")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
