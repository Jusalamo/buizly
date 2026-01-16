import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMeetings } from "@/hooks/useMeetings";
import { ContactSearchModal } from "@/components/ContactSearchModal";
import { Loader2, MapPin, Users, Plus, X, Search, Image, FileText, CalendarIcon, Clock } from "lucide-react";
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
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";
import { useAppCache } from "@/hooks/useAppCache";

type Connection = Database["public"]["Tables"]["connections"]["Row"];

const timeSlots = [
  "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM",
  "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM"
];

interface Participant {
  email: string;
  name?: string;
}

export default function Schedule() {
  const [searchParams] = useSearchParams();
  const connectionId = searchParams.get("connection");
  const { isAuthenticated, initialized } = useAppCache();
  const navigate = useNavigate();
  
  // Redirect to auth if not authenticated
  useEffect(() => {
    if (initialized && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [initialized, isAuthenticated, navigate]);
  
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState("");
  const [sendReminder, setSendReminder] = useState(true);
  const [loading, setLoading] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newParticipantEmail, setNewParticipantEmail] = useState("");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [showContactSearch, setShowContactSearch] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [meetingPhotos, setMeetingPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const { toast } = useToast();
  const { createMeeting } = useMeetings();
  

  useEffect(() => {
    loadConnections();
    if (connectionId) {
      loadConnectionDetails();
    }
  }, [connectionId]);

  const loadConnections = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("connections")
      .select("*")
      .eq("user_id", user.id)
      .order("connection_name");
    
    setConnections(data || []);
  };

  const loadConnectionDetails = async () => {
    if (!connectionId) return;
    
    const { data } = await supabase
      .from("connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (data && data.connection_email) {
      setParticipants([{ 
        email: data.connection_email, 
        name: data.connection_name 
      }]);
    }
  };

  const addParticipant = () => {
    if (!newParticipantEmail.trim()) return;
    
    if (participants.some(p => p.email === newParticipantEmail)) {
      toast({
        title: "Already added",
        description: "This participant is already in the list",
        variant: "destructive",
      });
      return;
    }

    setParticipants([...participants, { email: newParticipantEmail.trim() }]);
    setNewParticipantEmail("");
  };

  const addFromNetwork = (connection: Connection) => {
    if (!connection.connection_email) {
      toast({
        title: "No email",
        description: "This contact doesn't have an email address",
        variant: "destructive",
      });
      return;
    }

    if (participants.some(p => p.email === connection.connection_email)) {
      toast({
        title: "Already added",
        description: "This participant is already in the list",
      });
      return;
    }

    setParticipants([...participants, { 
      email: connection.connection_email, 
      name: connection.connection_name 
    }]);
  };

  const removeParticipant = (email: string) => {
    setParticipants(participants.filter(p => p.email !== email));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    if (meetingPhotos.length + files.length > 5) {
      toast({
        title: "Too many photos",
        description: "Maximum 5 photos allowed",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        const fileName = `${user.id}/meeting-photos/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("meeting-attachments")
          .upload(fileName, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("meeting-attachments")
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      setMeetingPhotos(prev => [...prev, ...uploadedUrls]);
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setMeetingPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSchedule = async () => {
    if (!date || !selectedTime) {
      toast({
        title: "Missing information",
        description: "Please select both a date and time",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Missing title",
        description: "Please enter a meeting title",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Combine description, notes, and photos into structured JSON
      const fullDescription = JSON.stringify({
        description: description.trim() || "",
        notes: notes.trim() || "",
        photos: meetingPhotos
      });

      const meeting = await createMeeting({
        title: title.trim(),
        description: fullDescription,
        meeting_date: date.toISOString().split('T')[0],
        meeting_time: selectedTime,
        location: location.trim() || undefined,
        connection_id: connectionId || undefined,
        participants: participants,
      });

      toast({
        title: "Meeting scheduled!",
        description: `Your meeting is set for ${date.toLocaleDateString()} at ${selectedTime}`,
      });

      navigate(`/meeting/${meeting.id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Schedule Meeting</h1>
          <p className="text-muted-foreground text-sm">Set up a new meeting with your connections</p>
        </div>

        {/* Meeting Title */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-foreground">Meeting Title *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Follow-up Discussion"
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
            <Select value={selectedTime} onValueChange={setSelectedTime}>
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
          <Label htmlFor="location" className="text-foreground">Location</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Office, Zoom, Coffee Shop..."
              className="bg-secondary border-border text-foreground pl-10"
            />
          </div>
        </div>

        {/* Participants */}
        <Card className="bg-card border-border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <Label className="text-foreground">Participants</Label>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowContactSearch(true)}
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <Search className="h-4 w-4 mr-2" />
              From Contacts
            </Button>
          </div>

          {/* Current Participants */}
          {participants.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {participants.map((p) => (
                <div
                  key={p.email}
                  className="flex items-center gap-2 bg-secondary rounded-full px-3 py-1"
                >
                  <span className="text-sm text-foreground">{p.name || p.email}</span>
                  <button
                    type="button"
                    onClick={() => removeParticipant(p.email)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add by Email */}
          <div className="flex gap-2">
            <Input
              value={newParticipantEmail}
              onChange={(e) => setNewParticipantEmail(e.target.value)}
              placeholder="Add email manually..."
              type="email"
              className="bg-secondary border-border text-foreground"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addParticipant())}
            />
            <Button
              type="button"
              variant="outline"
              onClick={addParticipant}
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground flex-shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        {/* Description & Notes (Consolidated) */}
        <Card className="bg-card border-border p-4 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <Label className="text-foreground">Description & Notes</Label>
          </div>
          
          <div className="space-y-3">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Meeting agenda, topics to discuss..."
              className="bg-secondary border-border text-foreground min-h-[80px]"
            />
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes for participants..."
              className="bg-secondary border-border text-foreground min-h-[60px]"
            />
          </div>
        </Card>

        {/* Photo Gallery */}
        <Card className="bg-card border-border p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            <Label className="text-foreground">Photos & Media</Label>
          </div>
          
          {/* Existing photos */}
          {meetingPhotos.length > 0 && (
            <div className="flex flex-wrap gap-2">
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
            <div>
              <input
                type="file"
                accept="image/*"
                id="meeting-photo-upload"
                multiple
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <label
                htmlFor="meeting-photo-upload"
                className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Plus className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Add photos (max 5)</span>
                  </>
                )}
              </label>
            </div>
          )}
        </Card>

        {/* Reminder Toggle */}
        <div className="flex items-center justify-between bg-card border border-border rounded-xl p-4">
          <Label htmlFor="reminder" className="text-foreground">
            Send reminder emails
          </Label>
          <Switch
            id="reminder"
            checked={sendReminder}
            onCheckedChange={setSendReminder}
          />
        </div>

        {/* Confirm Button */}
        <Button
          onClick={handleSchedule}
          disabled={loading || !date || !selectedTime || !title.trim()}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6 text-lg"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            "Schedule Meeting"
          )}
        </Button>

        {/* Contact Search Modal */}
        <ContactSearchModal
          open={showContactSearch}
          onOpenChange={setShowContactSearch}
          existingParticipants={participants}
          onSelectContact={(participant) => {
            if (!participants.some(p => p.email === participant.email)) {
              setParticipants([...participants, participant]);
            }
          }}
        />
      </div>
    </Layout>
  );
}
