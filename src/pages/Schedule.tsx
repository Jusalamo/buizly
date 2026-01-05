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
import { Loader2, MapPin, Users, Plus, X, Search } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Connection = Database["public"]["Tables"]["connections"]["Row"];

const timeSlots = [
  "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"
];

interface Participant {
  email: string;
  name?: string;
}

export default function Schedule() {
  const [searchParams] = useSearchParams();
  const connectionId = searchParams.get("connection");
  
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [sendReminder, setSendReminder] = useState(true);
  const [loading, setLoading] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newParticipantEmail, setNewParticipantEmail] = useState("");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [showContactSearch, setShowContactSearch] = useState(false);
  
  const navigate = useNavigate();
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

      const meeting = await createMeeting({
        title: title.trim(),
        description: description.trim() || undefined,
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

        {/* Calendar */}
        <Card className="bg-card border-border p-6">
          <Label className="text-foreground mb-4 block text-base font-semibold">Select Date</Label>
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="w-full rounded-xl"
            disabled={(date) => date < new Date()}
          />
        </Card>

        {/* Time Slots */}
        <div className="space-y-3">
          <Label className="text-foreground">Select Time</Label>
          <div className="grid grid-cols-3 gap-2">
            {timeSlots.map((time) => (
              <Button
                key={time}
                type="button"
                variant={selectedTime === time ? "default" : "outline"}
                onClick={() => setSelectedTime(time)}
                size="sm"
                className={
                  selectedTime === time
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border-border text-foreground hover:bg-secondary"
                }
              >
                {time}
              </Button>
            ))}
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

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-foreground">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Meeting agenda, topics to discuss..."
            className="bg-secondary border-border text-foreground min-h-[100px]"
          />
        </div>

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
