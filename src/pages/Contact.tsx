import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Mail, Phone, Briefcase, Globe, Download, ExternalLink } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default function Contact() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkAuth();
    loadProfile();
  }, [userId]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsLoggedIn(!!user);
  };

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

  const saveConnection = async () => {
    if (!profile) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      await supabase.from("connections").insert({
        user_id: user.id,
        connection_name: profile.full_name,
        connection_email: profile.email,
        connection_phone: profile.phone,
        connection_title: profile.job_title,
        connection_company: profile.company,
      });

      navigate("/network");
    } catch (error) {
      console.error("Error saving connection:", error);
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
          <Avatar className="w-24 h-24">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
              {profile.full_name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <h1 className="text-2xl font-bold text-foreground">{profile.full_name}</h1>
            {profile.job_title && (
              <p className="text-muted-foreground">{profile.job_title}</p>
            )}
            {profile.company && (
              <p className="text-sm text-muted-foreground">{profile.company}</p>
            )}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-foreground text-center leading-relaxed">{profile.bio}</p>
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
              <ExternalLink className="h-4 w-4 text-muted-foreground ml-auto" />
            </a>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4">
          <Button
            onClick={downloadVCard}
            variant="outline"
            className="w-full border-primary text-primary"
          >
            <Download className="h-4 w-4 mr-2" />
            Save Contact
          </Button>

          {isLoggedIn ? (
            <Button
              onClick={saveConnection}
              className="w-full bg-primary text-primary-foreground"
            >
              Add to My Network
            </Button>
          ) : (
            <div className="space-y-2">
              <Button
                onClick={() => navigate("/auth")}
                className="w-full bg-primary text-primary-foreground"
              >
                Get Buizly App
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Download the app to manage all your business connections
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
