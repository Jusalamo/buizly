import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame, HandMetal, Archive, Clock, CalendarDays } from "lucide-react";

type PriorityValue = "hot" | "warm" | "cold" | "later";

interface PriorityPopupProps {
  open: boolean;
  onSelect: (priority: PriorityValue, reminderDate?: string) => void;
  onClose: () => void;
  contactName?: string;
}

const OPTIONS: {
  value: PriorityValue;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    value: "hot",
    label: "🔥 Hot",
    description: "Follow up within 24h",
    icon: <Flame className="h-5 w-5" />,
    color: "border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-400",
  },
  {
    value: "warm",
    label: "👋 Warm",
    description: "Follow up this week",
    icon: <HandMetal className="h-5 w-5" />,
    color: "border-yellow-500/40 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400",
  },
  {
    value: "cold",
    label: "📁 Cold",
    description: "Archive for now",
    icon: <Archive className="h-5 w-5" />,
    color: "border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400",
  },
  {
    value: "later",
    label: "⏳ Later",
    description: "Set a custom reminder",
    icon: <Clock className="h-5 w-5" />,
    color: "border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400",
  },
];

export function PriorityPopup({ open, onSelect, onClose, contactName }: PriorityPopupProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reminderDate, setReminderDate] = useState("");

  const handleSelect = (value: PriorityValue) => {
    if (value === "later") {
      setShowDatePicker(true);
      return;
    }
    onSelect(value);
  };

  const handleLaterConfirm = () => {
    if (!reminderDate) return;
    onSelect("later", reminderDate);
    setShowDatePicker(false);
    setReminderDate("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-foreground text-center">
            How hot is this lead?
          </DialogTitle>
          {contactName && (
            <p className="text-sm text-muted-foreground text-center">
              Rate {contactName}'s priority
            </p>
          )}
        </DialogHeader>

        {!showDatePicker ? (
          <div className="space-y-2">
            {OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${opt.color}`}
              >
                {opt.icon}
                <div className="text-left">
                  <p className="font-semibold">{opt.label}</p>
                  <p className="text-xs opacity-80">{opt.description}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Remind me on
              </Label>
              <Input
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDatePicker(false)} className="flex-1">
                Back
              </Button>
              <Button onClick={handleLaterConfirm} disabled={!reminderDate} className="flex-1 bg-primary text-primary-foreground">
                Set Reminder
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
