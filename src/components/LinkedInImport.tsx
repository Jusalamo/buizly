import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Linkedin, Loader2, Download, Check, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LinkedInImportProps {
  onImport?: (data: { full_name?: string; job_title?: string; company?: string; linkedin_url?: string }) => void;
}

export function LinkedInImport({ onImport }: LinkedInImportProps) {
  const [open, setOpen] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentLinkedIn();
  }, []);

  const fetchCurrentLinkedIn = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("linkedin_url")
        .eq("id", user.id)
        .single();

      if (data?.linkedin_url) {
        setSavedUrl(data.linkedin_url);
        setLinkedinUrl(data.linkedin_url);
      }
    } catch (error) {
      console.error("Error fetching LinkedIn:", error);
    } finally {
      setFetchingProfile(false);
    }
  };

  const handleImport = async () => {
    if (!linkedinUrl.trim()) {
      toast({
        title: "LinkedIn URL required",
        description: "Please enter your LinkedIn profile URL",
        variant: "destructive",
      });
      return;
    }

    // Validate LinkedIn URL
    const linkedinPattern = /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/i;
    if (!linkedinPattern.test(linkedinUrl.trim())) {
      toast({
        title: "Invalid LinkedIn URL",
        description: "Please enter a valid LinkedIn profile URL (e.g., https://linkedin.com/in/yourname)",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Save the LinkedIn URL to profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ linkedin_url: linkedinUrl.trim() })
        .eq("id", user.id);

      if (error) throw error;

      setSavedUrl(linkedinUrl.trim());

      if (onImport) {
        onImport({ linkedin_url: linkedinUrl.trim() });
      }

      toast({
        title: "LinkedIn connected!",
        description: "Your LinkedIn profile URL has been saved",
      });

      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ linkedin_url: null })
        .eq("id", user.id);

      if (error) throw error;

      setSavedUrl(null);
      setLinkedinUrl("");

      toast({
        title: "LinkedIn disconnected",
        description: "Your LinkedIn profile has been removed",
      });

      setOpen(false);
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

  if (fetchingProfile) {
    return (
      <Button variant="outline" disabled className="border-[#0077B5] text-[#0077B5]">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading...
      </Button>
    );
  }

  // Show connected state
  if (savedUrl && !open) {
    return (
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          className="border-[#0077B5] bg-[#0077B5]/10 text-[#0077B5]"
          onClick={() => setOpen(true)}
        >
          <Check className="h-4 w-4 mr-2" />
          LinkedIn Connected
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.open(savedUrl, '_blank')}
          className="text-[#0077B5]"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-[#0077B5] text-[#0077B5] hover:bg-[#0077B5]/10">
          <Linkedin className="h-4 w-4 mr-2" />
          {savedUrl ? "Manage LinkedIn" : "Connect LinkedIn"}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Linkedin className="h-5 w-5 text-[#0077B5]" />
            {savedUrl ? "Manage LinkedIn" : "Connect LinkedIn"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {savedUrl 
              ? "Your LinkedIn profile is connected to your business card"
              : "Link your LinkedIn profile to your digital business card"
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="linkedin-url" className="text-foreground">LinkedIn Profile URL</Label>
            <Input
              id="linkedin-url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/yourname"
              className="bg-background border-border text-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Your LinkedIn profile will be linked to your business card
            </p>
          </div>

          <div className="flex gap-2">
            {savedUrl && (
              <Button 
                onClick={handleDisconnect}
                variant="destructive"
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Disconnect
              </Button>
            )}
            <Button 
              onClick={handleImport} 
              className={`bg-[#0077B5] text-white hover:bg-[#0077B5]/90 ${savedUrl ? 'flex-1' : 'w-full'}`}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {savedUrl ? "Update" : "Connect LinkedIn"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
