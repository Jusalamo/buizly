import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { QRCode } from "@/components/QRCode";
import { Mail, Phone, Globe, Briefcase, Share2, Edit, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default function Profile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      toast({
        title: "Error loading profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!profile) return;
    
    try {
      await navigator.share({
        title: `${profile.full_name}'s Business Card`,
        text: `Connect with ${profile.full_name}`,
        url: window.location.href,
      });
    } catch (error) {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied!",
        description: "Share this link to connect",
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Profile not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        {/* QR Code Section */}
        <div className="flex justify-center">
          <QRCode 
            url={profile.qr_code_url || `${window.location.origin}/profile/${profile.id}`}
            size={250}
            className="shadow-lg shadow-primary/20"
          />
        </div>

        {/* Profile Info */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">{profile.full_name}</h1>
          {profile.job_title && (
            <p className="text-lg text-primary">{profile.job_title}</p>
          )}
          {profile.company && (
            <p className="text-muted-foreground">{profile.company}</p>
          )}
        </div>

        {/* Contact Details */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          {profile.email && (
            <div className="flex items-center gap-3 text-foreground">
              <Mail className="h-5 w-5 text-primary" />
              <span>{profile.email}</span>
            </div>
          )}
          {profile.phone && (
            <div className="flex items-center gap-3 text-foreground">
              <Phone className="h-5 w-5 text-primary" />
              <span>{profile.phone}</span>
            </div>
          )}
          {profile.website && (
            <div className="flex items-center gap-3 text-foreground">
              <Globe className="h-5 w-5 text-primary" />
              <span>{profile.website}</span>
            </div>
          )}
          {profile.bio && (
            <div className="pt-4 border-t border-border">
              <p className="text-muted-foreground">{profile.bio}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-4">
          <Button
            onClick={handleShare}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Connect
          </Button>
          <Button
            onClick={() => navigate("/profile/edit")}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>
    </Layout>
  );
}
