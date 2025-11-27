import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Phone, Globe, Building, Briefcase, Download, UserPlus, Smartphone, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default function Connect() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state for saving contact without app
  const [visitorName, setVisitorName] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");

  useEffect(() => {
    loadProfile();
  }, [id]);

  const loadProfile = async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadApp = () => {
    // In a real app, this would link to app stores
    toast({
      title: "Coming Soon",
      description: "The Buizly app will be available on iOS and Android soon!",
    });
  };

  const handleContinueWithoutApp = () => {
    setShowForm(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setSaving(true);
    
    try {
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Save as connection
        const { error } = await supabase
          .from("connections")
          .insert({
            user_id: user.id,
            connection_name: profile.full_name,
            connection_title: profile.job_title,
            connection_email: profile.email,
            connection_phone: profile.phone,
            connection_company: profile.company,
          });

        if (error) throw error;

        toast({
          title: "Connection saved!",
          description: `${profile.full_name} has been added to your network`,
        });
        navigate("/network");
      } else {
        // Create vCard for download
        const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${profile.full_name}
${profile.job_title ? `TITLE:${profile.job_title}` : ''}
${profile.company ? `ORG:${profile.company}` : ''}
${profile.email ? `EMAIL:${profile.email}` : ''}
${profile.phone ? `TEL:${profile.phone}` : ''}
${profile.website ? `URL:${profile.website}` : ''}
END:VCARD`;

        const blob = new Blob([vcard], { type: 'text/vcard' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${profile.full_name.replace(/\s+/g, '_')}.vcf`;
        a.click();
        URL.revokeObjectURL(url);

        toast({
          title: "Contact downloaded!",
          description: "The contact file has been saved to your device",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="bg-card border-border p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-foreground mb-4">Profile Not Found</h1>
          <p className="text-muted-foreground mb-6">This profile doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/")} className="bg-primary text-primary-foreground">
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/20 to-background pt-12 pb-20 px-6">
        <div className="max-w-md mx-auto text-center">
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 border-4 border-primary">
            <span className="text-primary text-4xl font-bold">
              {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">{profile.full_name}</h1>
          {profile.job_title && (
            <p className="text-primary font-medium mt-1">{profile.job_title}</p>
          )}
          {profile.company && (
            <p className="text-muted-foreground">{profile.company}</p>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-8 space-y-6 pb-12">
        {!showForm ? (
          <>
            {/* Connection Prompt Card */}
            <Card className="bg-card border-border p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Smartphone className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Connect with {profile.full_name?.split(' ')[0]}</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Download the Buizly app to save this contact and start networking smarter!
              </p>

              <div className="space-y-3">
                <Button
                  onClick={handleDownloadApp}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Download Buizly App
                </Button>

                <Button
                  onClick={handleContinueWithoutApp}
                  variant="outline"
                  className="w-full border-border text-foreground hover:bg-secondary py-6"
                >
                  <ExternalLink className="h-5 w-5 mr-2" />
                  Continue Without App
                </Button>
              </div>
            </Card>

            {/* Contact Preview */}
            <Card className="bg-card border-border p-6 space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Contact Info</h3>
              
              {profile.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <span className="text-foreground">{profile.email}</span>
                </div>
              )}
              
              {profile.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <span className="text-foreground">{profile.phone}</span>
                </div>
              )}
              
              {profile.website && (
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-primary" />
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {profile.website}
                  </a>
                </div>
              )}
            </Card>
          </>
        ) : (
          /* Save Contact Form */
          <Card className="bg-card border-border p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Save Contact</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Download {profile.full_name}'s contact information
            </p>

            <form onSubmit={handleSaveContact} className="space-y-4">
              <Button
                type="submit"
                disabled={saving}
                className="w-full bg-primary text-primary-foreground py-6"
              >
                <UserPlus className="h-5 w-5 mr-2" />
                {saving ? "Saving..." : "Download Contact Card"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowForm(false)}
                className="w-full text-muted-foreground"
              >
                Back
              </Button>
            </form>
          </Card>
        )}

        {/* App Benefits */}
        <div className="text-center pt-6">
          <p className="text-xs text-muted-foreground">
            Powered by <span className="text-primary font-semibold">Buizly</span>
          </p>
        </div>
      </div>
    </div>
  );
}
