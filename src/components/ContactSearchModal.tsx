import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Users, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import type { Database } from "@/integrations/supabase/types";

type Connection = Database["public"]["Tables"]["connections"]["Row"];

interface Participant {
  email: string;
  name?: string;
}

interface ContactSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectContact: (participant: Participant) => void;
  existingParticipants: Participant[];
}

export function ContactSearchModal({ 
  open, 
  onOpenChange, 
  onSelectContact,
  existingParticipants 
}: ContactSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualEmail, setManualEmail] = useState("");

  useEffect(() => {
    if (open) {
      loadConnections();
    }
  }, [open]);

  const loadConnections = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("connections")
        .select("*")
        .eq("user_id", user.id)
        .order("connection_name");

      setConnections(data || []);
    } catch (error) {
      console.error("Error loading connections:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConnections = useMemo(() => {
    if (!searchQuery.trim()) return connections;
    
    const query = searchQuery.toLowerCase();
    return connections.filter(c => 
      c.connection_name.toLowerCase().includes(query) ||
      c.connection_email?.toLowerCase().includes(query) ||
      c.connection_company?.toLowerCase().includes(query)
    );
  }, [connections, searchQuery]);

  const availableConnections = useMemo(() => {
    return filteredConnections.filter(c => 
      c.connection_email && 
      !existingParticipants.some(p => p.email === c.connection_email)
    );
  }, [filteredConnections, existingParticipants]);

  const handleSelectConnection = (connection: Connection) => {
    if (connection.connection_email) {
      onSelectContact({
        email: connection.connection_email,
        name: connection.connection_name
      });
      setSearchQuery("");
    }
  };

  const handleAddManualEmail = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (manualEmail && emailRegex.test(manualEmail)) {
      if (!existingParticipants.some(p => p.email === manualEmail)) {
        onSelectContact({ email: manualEmail });
        setManualEmail("");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md mx-auto max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Add Participants
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search from Contacts */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your contacts..."
              className="pl-10 bg-secondary border-border text-foreground"
            />
          </div>

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px] max-h-[300px]">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                ))}
              </div>
            ) : availableConnections.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">
                  {searchQuery ? "No contacts found" : "No contacts available"}
                </p>
              </div>
            ) : (
              availableConnections.map((connection) => (
                <button
                  key={connection.id}
                  onClick={() => handleSelectConnection(connection)}
                  className="w-full flex items-center gap-3 p-3 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-semibold">
                      {connection.connection_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {connection.connection_name}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {connection.connection_email}
                    </p>
                  </div>
                  <Plus className="h-5 w-5 text-primary flex-shrink-0" />
                </button>
              ))
            )}
          </div>

          {/* Manual Email Entry */}
          <div className="border-t border-border pt-4">
            <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Or add by email
            </p>
            <div className="flex gap-2">
              <Input
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                placeholder="Enter email address..."
                type="email"
                className="bg-secondary border-border text-foreground"
                onKeyDown={(e) => e.key === 'Enter' && handleAddManualEmail()}
              />
              <Button
                onClick={handleAddManualEmail}
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground flex-shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
