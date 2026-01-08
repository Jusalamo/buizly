import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mail, Phone, Globe, Building, Briefcase, Share2, Edit, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProfileSkeleton } from "@/components/skeletons/PageSkeletons";
import { useAppCache } from "@/hooks/useAppCache";

export default function Profile() {
  const { profile, loading, isAuthenticated, initialized } = useAppCache();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (initialized && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [initialized, isAuthenticated, navigate]);

  const handleShare = async () => {
    if (!profile) return;
    
    const shareUrl = `${window.location.origin}/connect/${profile.id}`;
    
    try {
      await navigator.share({
        title: `${profile.full_name}'s Business Card`,
        text: `Connect with ${profile.full_name}`,
        url: shareUrl,
      });
    } catch (error) {
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied!",
        description: "Share this link to connect",
      });
    }
  };

  // Only show skeleton on first load before cache is ready
  if (!initialized) {
    return (
      <Layout>
        <ProfileSkeleton />
      </Layout>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  if (!profile) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <p className="text-muted-foreground">Profile not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/settings")}
          className="text-foreground hover:text-primary -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Settings
        </Button>

        {/* Profile Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
          <Button
            onClick={() => navigate("/profile/edit")}
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        </div>

        {/* Profile Card */}
        <Card className="bg-card border-border p-6">
          <div className="flex items-start gap-4">
            {profile.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt={profile.full_name}
                className="w-20 h-20 rounded-full object-cover flex-shrink-0 border-2 border-primary"
                loading="eager"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 border-2 border-primary">
                <span className="text-primary text-3xl font-bold">
                  {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground">{profile.full_name}</h2>
              {profile.job_title && (
                <p className="text-primary font-medium mt-1">{profile.job_title}</p>
              )}
              {profile.company && (
                <p className="text-muted-foreground">{profile.company}</p>
              )}
            </div>
          </div>

          {profile.bio && (
            <p className="text-muted-foreground mt-4 pt-4 border-t border-border">
              {profile.bio}
            </p>
          )}
        </Card>

        {/* Contact Information */}
        <Card className="bg-card border-border p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground mb-4">Contact Information</h3>
          
          <div className="space-y-4">
            {profile.email && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-foreground">{profile.email}</p>
                </div>
              </div>
            )}
            
            {profile.phone && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-foreground">{profile.phone}</p>
                </div>
              </div>
            )}
            
            {profile.website && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Website</p>
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {profile.website}
                  </a>
                </div>
              </div>
            )}
            
            {profile.company && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Company</p>
                  <p className="text-foreground">{profile.company}</p>
                </div>
              </div>
            )}
            
            {profile.job_title && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Job Title</p>
                  <p className="text-foreground">{profile.job_title}</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Share Button */}
        <Button
          onClick={handleShare}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share Profile
        </Button>
      </div>
    </Layout>
  );
}
