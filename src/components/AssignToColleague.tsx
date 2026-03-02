import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Flame, HandMetal, Archive, Loader2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTeam } from "@/hooks/useTeam";

interface AssignToColleagueProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string;
  contactCompany?: string | null;
  connectionId?: string;
  cardImageUrl?: string | null;
}

export function AssignToColleague({
  open,
  onOpenChange,
  contactName,
  contactCompany,
  connectionId,
  cardImageUrl,
}: AssignToColleagueProps) {
  const { toast } = useToast();
  const { teamMembers, loading: loadingMembers } = useTeam();
  const [selectedMember, setSelectedMember] = useState("");
  const [note, setNote] = useState("");
  const [priority, setPriority] = useState("warm");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedMember) {
      toast({ title: "Select a colleague", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("handoffs").insert({
        from_user: user.id,
        to_user: selectedMember,
        connection_id: connectionId || null,
        contact_name: contactName,
        contact_company: contactCompany || null,
        note,
        priority,
        card_image_url: cardImageUrl || null,
      });

      if (error) throw error;

      // Send notification
      await supabase.functions.invoke("create-notification", {
        body: {
          userId: selectedMember,
          title: "New handoff assigned",
          message: `${user.email} assigned you a contact: ${contactName}${contactCompany ? ` from ${contactCompany}` : ""}. Context: ${note || "No notes"}`,
          type: "new_connection",
        },
      });

      toast({
        title: "Handoff created!",
        description: `${contactName} assigned to colleague`,
      });
      onOpenChange(false);
      setNote("");
      setPriority("warm");
      setSelectedMember("");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Assign to Colleague
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {cardImageUrl && (
            <img
              src={cardImageUrl}
              alt="Card"
              className="w-full rounded-lg aspect-[3/2] object-cover"
            />
          )}

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Contact</Label>
            <p className="text-foreground font-medium">
              {contactName}
              {contactCompany && (
                <span className="text-muted-foreground font-normal">
                  {" "}
                  · {contactCompany}
                </span>
              )}
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Assign to
            </Label>
            {loadingMembers ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading team...
              </div>
            ) : teamMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No team members found. Create a team first in Team Admin.
              </p>
            ) : (
              <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger>
                  <SelectValue placeholder="Select colleague" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.profile?.full_name || m.user_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Context Notes
            </Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add context for your colleague..."
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Priority</Label>
            <div className="flex gap-2">
              {[
                {
                  v: "hot",
                  l: "Hot",
                  i: <Flame className="h-4 w-4" />,
                  c: "bg-red-500/20 text-red-400 border-red-500/40",
                },
                {
                  v: "warm",
                  l: "Warm",
                  i: <HandMetal className="h-4 w-4" />,
                  c: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
                },
                {
                  v: "cold",
                  l: "Cold",
                  i: <Archive className="h-4 w-4" />,
                  c: "bg-blue-500/20 text-blue-400 border-blue-500/40",
                },
              ].map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setPriority(opt.v)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                    priority === opt.v
                      ? opt.c + " border-current"
                      : "bg-muted/30 text-muted-foreground border-border"
                  }`}
                >
                  {opt.i}
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting || !selectedMember}
            className="w-full gap-2 bg-primary text-primary-foreground"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {submitting ? "Assigning..." : "Assign Handoff"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
