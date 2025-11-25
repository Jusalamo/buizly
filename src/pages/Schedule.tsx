import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const timeSlots = [
  "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"
];

export default function Schedule() {
  const [searchParams] = useSearchParams();
  const connectionId = searchParams.get("connection");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState("");
  const [sendReminder, setSendReminder] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSchedule = async () => {
    if (!date || !selectedTime) {
      toast({
        title: "Missing information",
        description: "Please select both a date and time",
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

      const { error } = await supabase.from("meetings").insert({
        user_id: user.id,
        connection_id: connectionId || undefined,
        meeting_date: date.toISOString().split('T')[0],
        meeting_time: selectedTime,
        follow_up_sent: false,
      });

      if (error) throw error;

      toast({
        title: "Meeting scheduled!",
        description: `Your meeting is set for ${date.toLocaleDateString()} at ${selectedTime}`,
      });

      navigate("/");
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
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Schedule Follow-up</h1>
          <p className="text-muted-foreground">Pick a date and time for your meeting</p>
        </div>

        {/* Calendar */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="mx-auto"
            disabled={(date) => date < new Date()}
          />
        </div>

        {/* Time Slots */}
        <div className="space-y-4">
          <Label className="text-foreground text-lg">Select Time</Label>
          <div className="grid grid-cols-3 gap-3">
            {timeSlots.map((time) => (
              <Button
                key={time}
                type="button"
                variant={selectedTime === time ? "default" : "outline"}
                onClick={() => setSelectedTime(time)}
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

        {/* Reminder Toggle */}
        <div className="flex items-center justify-between bg-card border border-border rounded-2xl p-4">
          <Label htmlFor="reminder" className="text-foreground">
            Send automatic reminder email
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
          disabled={loading || !date || !selectedTime}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6 text-lg"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            "Confirm Follow-up Meeting"
          )}
        </Button>
      </div>
    </Layout>
  );
}
