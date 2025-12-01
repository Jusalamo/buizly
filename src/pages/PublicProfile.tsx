import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, Briefcase, Globe, Download, Send, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default function PublicProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [connectForm, setConnectForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: ""
  });

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const downloadVCard = () => {
    if (!profile) return;

    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${profile.full_name}
EMAIL:${profile.email}
TEL:${profile.phone || ''}
TITLE:${profile.job_title || ''}
ORG:${profile.company || ''}
URL:${profile.website || ''}
NOTE:${profile.bio || ''}
END:VCARD`;

    const blob = new Blob([vcard], { type: 'text/vcard' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${profile.full_name.replace(/\s+/g, '_')}.vcf`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleConnect = async () => {
    if (!profile || !connectForm.name || !connectForm.email) {
      toast({
        title: "Missing information",
        description: "Please provide your name and email",
        variant: "destructive"
      });
      return;
    }

    try {
      // Send notification to profile owner
      await supabase.from("notifications").insert({
        user_id: profile.id,
        type: "new_connection",
        title: "New Connection Request",
        message: `${connectForm.name} wants to connect with you`,
        data: {
          name: connectForm.name,
          email: connectForm.email,
          phone: connectForm.phone,
          message: connectForm.message
        }
      });

      toast({
        title: "Connection sent!",
        description: `${profile.full_name} will receive your details`
      });

      setIsConnectOpen(false);
      setConnectForm({ name: "", email: "", phone: "", message: "" });
    } catch (error: any) {
      toast({
        title: "Error sending connection",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="bg-card border-border p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-foreground mb-4">Profile Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This profile doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate("/")} className="bg-primary text-primary-foreground">
            Go to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="bg-card border-border p-8 max-w-lg w-full space-y-6">
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center space-y-4">
          {profile.avatar_url ? (
            <img 
              src={profile.avatar_url} 
              alt={profile.full_name}
              className="w-24 h-24 rounded-full object-cover border-4 border-primary"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center border-4 border-primary">
              <span className="text-primary text-3xl font-bold">
                {profile.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          
          <div>
            <h1 className="text-2xl font-bold text-foreground">{profile.full_name}</h1>
            {profile.job_title && (
              <p className="text-primary font-medium mt-1">{profile.job_title}</p>
            )}
            {profile.company && (
              <p className="text-muted-foreground text-sm">{profile.company}</p>
            )}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-foreground text-center leading-relaxed px-4">{profile.bio}</p>
        )}

        {/* Contact Info */}
        <div className="space-y-3">
          {profile.email && (
            <a
              href={`mailto:${profile.email}`}
              className="flex items-center gap-3 p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
            >
              <Mail className="h-5 w-5 text-primary" />
              <span className="text-foreground">{profile.email}</span>
            </a>
          )}

          {profile.phone && (
            <a
              href={`tel:${profile.phone}`}
              className="flex items-center gap-3 p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
            >
              <Phone className="h-5 w-5 text-primary" />
              <span className="text-foreground">{profile.phone}</span>
            </a>
          )}

          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
            >
              <Globe className="h-5 w-5 text-primary" />
              <span className="text-foreground truncate">{profile.website}</span>
            </a>
          )}

          {profile.company && (
            <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
              <Building className="h-5 w-5 text-primary" />
              <span className="text-foreground">{profile.company}</span>
            </div>
          )}

          {profile.job_title && (
            <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
              <Briefcase className="h-5 w-5 text-primary" />
              <span className="text-foreground">{profile.job_title}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4">
          <Dialog open={isConnectOpen} onOpenChange={setIsConnectOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                <Send className="h-4 w-4 mr-2" />
                Connect with {profile.full_name.split(' ')[0]}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Send Your Details</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {profile.full_name} will receive your contact information
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="name" className="text-foreground">Your Name *</Label>
                  <Input
                    id="name"
                    value={connectForm.name}
                    onChange={(e) => setConnectForm(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-background border-border text-foreground"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-foreground">Your Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={connectForm.email}
                    onChange={(e) => setConnectForm(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-background border-border text-foreground"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-foreground">Your Phone (Optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={connectForm.phone}
                    onChange={(e) => setConnectForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="bg-background border-border text-foreground"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <div>
                  <Label htmlFor="message" className="text-foreground">Message (Optional)</Label>
                  <Textarea
                    id="message"
                    value={connectForm.message}
                    onChange={(e) => setConnectForm(prev => ({ ...prev, message: e.target.value }))}
                    className="bg-background border-border text-foreground"
                    placeholder="I'd love to connect..."
                    rows={3}
                  />
                </div>
                <Button 
                  onClick={handleConnect} 
                  className="w-full bg-primary text-primary-foreground"
                >
                  Send Connection Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            onClick={downloadVCard}
            variant="outline"
            className="w-full border-primary text-primary hover:bg-primary/10"
          >
            <Download className="h-4 w-4 mr-2" />
            Save Contact
          </Button>
        </div>

        {/* App Download CTA */}
        <div className="pt-4 border-t border-border text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Want your own digital business card?
          </p>
          <Button
            onClick={() => navigate("/auth")}
            variant="ghost"
            className="text-primary hover:bg-primary/10"
          >
            Get Buizly
          </Button>
        </div>
      </Card>
    </div>
  );
}
