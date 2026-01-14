import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OptimizedAvatar } from "@/components/OptimizedAvatar";
import { useAppCache } from "@/hooks/useAppCache";
import { usePlugs } from "@/hooks/usePlugs";
import { Zap, Plus, X, Search, Users, ArrowRight } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface PlugModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlugModal({ open, onOpenChange }: PlugModalProps) {
  const { connections } = useAppCache();
  const { createPlug } = usePlugs();
  
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [sending, setSending] = useState(false);

  // Filter connections based on search
  const filteredConnections = useMemo(() => {
    if (!searchQuery.trim()) return connections;
    const query = searchQuery.toLowerCase();
    return connections.filter(c => 
      c.connection_name.toLowerCase().includes(query) ||
      c.connection_email?.toLowerCase().includes(query) ||
      c.connection_company?.toLowerCase().includes(query)
    );
  }, [connections, searchQuery]);

  // Get selected contact details
  const selectedContactDetails = useMemo(() => {
    return connections.filter(c => selectedContacts.includes(c.id));
  }, [connections, selectedContacts]);

  const handleSelectContact = (connectionId: string) => {
    if (selectedContacts.includes(connectionId)) {
      setSelectedContacts(prev => prev.filter(id => id !== connectionId));
    } else if (selectedContacts.length < 5) {
      setSelectedContacts(prev => [...prev, connectionId]);
    }
    setShowContactPicker(false);
    setSearchQuery("");
  };

  const handleRemoveContact = (connectionId: string) => {
    setSelectedContacts(prev => prev.filter(id => id !== connectionId));
  };

  const handleSend = async () => {
    if (selectedContacts.length < 2) return;
    
    setSending(true);
    const result = await createPlug(selectedContacts, message || undefined);
    setSending(false);
    
    if (result.success) {
      onOpenChange(false);
      setSelectedContacts([]);
      setMessage("");
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedContacts([]);
    setMessage("");
    setShowContactPicker(false);
    setSearchQuery("");
  };

  const canSend = selectedContacts.length >= 2 && !sending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Zap className="h-5 w-5 text-primary" />
            Create a Plug
          </DialogTitle>
          <DialogDescription>
            Introduce two or more contacts to each other
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Selected Contacts Display */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Select 2-5 contacts
              </span>
              <span className="text-sm text-primary font-medium">
                {selectedContacts.length}/5
              </span>
            </div>

            {/* Contact Slots */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {selectedContactDetails.map((contact, index) => (
                <div key={contact.id} className="flex items-center gap-1">
                  <div className="relative group">
                    <OptimizedAvatar
                      src={(contact as any).connection_avatar_url}
                      alt={contact.connection_name}
                      fallback={contact.connection_name.charAt(0)}
                      size="lg"
                      className="border-2 border-primary"
                    />
                    <button
                      onClick={() => handleRemoveContact(contact.id)}
                      className="absolute -top-1 -right-1 p-1 bg-destructive rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3 text-destructive-foreground" />
                    </button>
                    <p className="text-xs text-center text-foreground mt-1 truncate max-w-[60px]">
                      {contact.connection_name.split(' ')[0]}
                    </p>
                  </div>
                  {index < selectedContactDetails.length - 1 && (
                    <Zap className="h-4 w-4 text-primary mx-1" />
                  )}
                </div>
              ))}

              {/* Add more slots */}
              {selectedContacts.length < 5 && (
                <button
                  onClick={() => setShowContactPicker(true)}
                  className="w-14 h-14 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center hover:border-primary hover:bg-primary/10 transition-all"
                >
                  <Plus className="h-5 w-5 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Contact Picker */}
          {showContactPicker && (
            <div className="space-y-3 border border-border rounded-lg p-3 bg-secondary/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search connections..."
                  className="pl-9 bg-background"
                  autoFocus
                />
              </div>

              <ScrollArea className="h-[200px]">
                {connections.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Connect with more people to create plugs</p>
                  </div>
                ) : filteredConnections.length === 0 ? (
                  <p className="p-4 text-center text-muted-foreground text-sm">
                    No connections found
                  </p>
                ) : (
                  <div className="space-y-1">
                    {filteredConnections.map(connection => {
                      const isSelected = selectedContacts.includes(connection.id);
                      return (
                        <button
                          key={connection.id}
                          onClick={() => handleSelectContact(connection.id)}
                          disabled={isSelected}
                          className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all ${
                            isSelected 
                              ? 'bg-primary/10 opacity-50 cursor-not-allowed' 
                              : 'hover:bg-primary/10'
                          }`}
                        >
                          <OptimizedAvatar
                            src={(connection as any).connection_avatar_url}
                            alt={connection.connection_name}
                            fallback={connection.connection_name.charAt(0)}
                            size="sm"
                          />
                          <div className="flex-1 text-left min-w-0">
                            <p className="font-medium text-foreground text-sm truncate">
                              {connection.connection_name}
                            </p>
                            {connection.connection_company && (
                              <p className="text-xs text-muted-foreground truncate">
                                {connection.connection_company}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <span className="text-xs text-primary">Selected</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowContactPicker(false);
                  setSearchQuery("");
                }}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          )}

          {/* Optional Message */}
          {!showContactPicker && selectedContacts.length >= 2 && (
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">
                Add a note (optional)
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Why do you think these contacts should connect?"
                className="bg-secondary border-border resize-none"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {message.length}/500
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1 border-border"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!canSend}
            className="flex-1 bg-primary text-primary-foreground"
          >
            {sending ? (
              <LoadingSpinner size="sm" className="text-primary-foreground" />
            ) : (
              <>
                Send Plug ({selectedContacts.length})
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
