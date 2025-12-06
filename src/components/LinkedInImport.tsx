import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Linkedin, Loader2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LinkedInImportProps {
  onImport?: (data: { full_name?: string; job_title?: string; company?: string; linkedin_url?: string }) => void;
}

export function LinkedInImport({ onImport }: LinkedInImportProps) {
  const [open, setOpen] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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

      if (onImport) {
        onImport({ linkedin_url: linkedinUrl.trim() });
      }

      toast({
        title: "LinkedIn connected!",
        description: "Your LinkedIn profile URL has been saved",
      });

      setOpen(false);
      setLinkedinUrl("");
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-[#0077B5] text-[#0077B5] hover:bg-[#0077B5]/10">
          <Linkedin className="h-4 w-4 mr-2" />
          Connect LinkedIn
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Linkedin className="h-5 w-5 text-[#0077B5]" />
            Connect LinkedIn
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Link your LinkedIn profile to your digital business card
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

          <Button 
            onClick={handleImport} 
            className="w-full bg-[#0077B5] text-white hover:bg-[#0077B5]/90"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Connect LinkedIn
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}