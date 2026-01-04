import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mail, Phone, Briefcase, Globe, Download, Building, Lock, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProfileCardSkeleton } from "@/components/skeletons/ProfileCardSkeleton";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// Public-safe profile type that excludes sensitive PII for unauthenticated viewers
interface PublicSafeProfile extends Omit<Profile, 'email' | 'phone'> {
  email: string | null;
  phone: string | null;
}

interface ProfileState {
  profile: PublicSafeProfile | null;
  isPrivate: boolean;
  basicInfo: { name: string; avatar_url: string | null; job_title?: string | null; company?: string | null } | null;
  isAuthenticated: boolean;
}

export default function PublicProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [state, setState] = useState<ProfileState>({ profile: null, isPrivate: false, basicInfo: null, isAuthenticated: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
    trackView();
  }, [userId]);

  const loadProfile = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      // Check if the current user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      const isAuthenticated = !!session?.user;

      // First fetch basic info (always accessible)
      const { data: basicData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, job_title, company")
        .eq("id", userId)
        .maybeSingle();

      if (!basicData) {
        // Profile truly doesn't exist
        setState({ profile: null, isPrivate: false, basicInfo: null, isAuthenticated });
        setLoading(false);
        return;
      }

      // Check if user can view full profile using can_view_profile function
      const { data: canView } = await supabase.rpc("can_view_profile", {
        profile_id: userId
      });

      if (canView) {
        // User can view full profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        // Strip sensitive PII (email, phone) for unauthenticated viewers
        // to prevent scraping attacks
        let safeProfile: PublicSafeProfile | null = null;
        if (profileData) {
          safeProfile = {
            ...profileData,
            // Only expose email/phone to authenticated users
            email: isAuthenticated ? profileData.email : null,
            phone: isAuthenticated ? profileData.phone : null,
          };
        }

        setState({ profile: safeProfile, isPrivate: false, basicInfo: null, isAuthenticated });
      } else {
        // Profile exists but is private - show limited info (like Instagram)
        setState({ 
          profile: null, 
          isPrivate: true, 
          basicInfo: { 
            name: basicData.full_name, 
            avatar_url: basicData.avatar_url,
            job_title: basicData.job_title,
            company: basicData.company
          },
          isAuthenticated
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      setState({ profile: null, isPrivate: false, basicInfo: null, isAuthenticated: false });
    } finally {
      setLoading(false);
    }
  };

  const trackView = async () => {
    if (!userId) return;
    
    try {
      await supabase.functions.invoke('track-profile-view', {
        body: {
          profileId: userId,
          referrer: document.referrer || null,
        }
      });
    } catch (error) {
      console.error("Error tracking view:", error);
    }
  };

  const downloadVCard = () => {
    if (!state.profile) return;

    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${state.profile.full_name}
${state.profile.email ? `EMAIL:${state.profile.email}` : ''}
TEL:${state.profile.phone || ''}
TITLE:${state.profile.job_title || ''}
ORG:${state.profile.company || ''}
URL:${state.profile.website || ''}
NOTE:${state.profile.bio || ''}
END:VCARD`;

    const blob = new Blob([vcard], { type: 'text/vcard' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.profile.full_name.replace(/\s+/g, '_')}.vcf`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleOpenApp = () => {
    // Deep link to open the app with this profile
    const deepLink = `buizly://profile/${userId}`;
    const appStoreUrl = "https://apps.apple.com/app/buizly";
    const playStoreUrl = "https://play.google.com/store/apps/details?id=com.buizly.app";
    
    // Try to open the app, fallback to store
    const userAgent = navigator.userAgent || navigator.vendor;
    
    if (/iPad|iPhone|iPod/.test(userAgent)) {
      // iOS: try deep link, then app store
      window.location.href = deepLink;
      setTimeout(() => {
        window.location.href = appStoreUrl;
      }, 500);
    } else if (/android/i.test(userAgent)) {
      // Android: try deep link, then play store
      window.location.href = deepLink;
      setTimeout(() => {
        window.location.href = playStoreUrl;
      }, 500);
    } else {
      // Desktop: redirect to web app
      if (state.isAuthenticated) {
        navigate(`/network`);
      } else {
        navigate(`/auth?redirect=/connect/${userId}`);
      }
    }
  };

  const handleGetApp = () => {
    const userAgent = navigator.userAgent || navigator.vendor;
    
    if (/iPad|iPhone|iPod/.test(userAgent)) {
      window.location.href = "https://apps.apple.com/app/buizly";
    } else if (/android/i.test(userAgent)) {
      window.location.href = "https://play.google.com/store/apps/details?id=com.buizly.app";
    } else {
      toast({
        title: "Download on Mobile",
        description: "Visit this page on your phone to download the Buizly app!",
      });
    }
  };

  // Skeleton loading state
  if (loading) {
    return <ProfileCardSkeleton />;
  }

  // Profile is private - show limited info (Instagram style)
  if (state.isPrivate && state.basicInfo) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header with gradient */}
        <div className="bg-gradient-to-b from-primary/20 to-background pt-12 pb-20 px-4">
          <div className="max-w-lg mx-auto text-center">
            {state.basicInfo.avatar_url ? (
              <img 
                src={state.basicInfo.avatar_url} 
                alt={state.basicInfo.name}
                className="w-28 h-28 rounded-full object-cover mx-auto mb-4 border-4 border-primary"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 border-4 border-primary">
                <span className="text-primary text-4xl font-bold">
                  {state.basicInfo.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            
            <h1 className="text-3xl font-bold text-foreground">{state.basicInfo.name}</h1>
            {state.basicInfo.job_title && (
              <p className="text-primary font-medium mt-1">{state.basicInfo.job_title}</p>
            )}
            {state.basicInfo.company && (
              <p className="text-muted-foreground">{state.basicInfo.company}</p>
            )}
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 -mt-8 space-y-6 pb-12">
          {/* Private Account Message */}
          <Card className="bg-card border-border p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">This Account is Private</h2>
                <p className="text-muted-foreground text-sm">
                  Sign in to Buizly to request to connect with {state.basicInfo.name.split(' ')[0]}
                </p>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <Card className="bg-card border-border p-6 space-y-3">
            {state.isAuthenticated ? (
              <Button 
                onClick={handleOpenApp}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6"
              >
                <ExternalLink className="h-5 w-5 mr-2" />
                Open App
              </Button>
            ) : (
              <Button 
                onClick={handleGetApp}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6"
              >
                <ExternalLink className="h-5 w-5 mr-2" />
                Get Buizly
              </Button>
            )}
          </Card>

          {/* App Download CTA */}
          {!state.isAuthenticated && (
            <div className="text-center pt-4">
              <p className="text-sm text-muted-foreground mb-2">
                Already have Buizly?
              </p>
              <Button
                onClick={() => navigate("/auth")}
                variant="ghost"
                className="text-primary hover:bg-primary/10"
              >
                Sign In
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Profile not found
  if (!state.profile) {
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

  // Full profile view - Digital Business Card
  return (
    <div className="min-h-screen bg-background">
      {/* Header with gradient */}
      <div className="bg-gradient-to-b from-primary/20 to-background pt-12 pb-20 px-4">
        <div className="max-w-lg mx-auto text-center">
          {state.profile.avatar_url ? (
            <img 
              src={state.profile.avatar_url} 
              alt={state.profile.full_name}
              className="w-28 h-28 rounded-full object-cover mx-auto mb-4 border-4 border-primary"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 border-4 border-primary">
              <span className="text-primary text-4xl font-bold">
                {state.profile.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          
          <h1 className="text-3xl font-bold text-foreground">{state.profile.full_name}</h1>
          {state.profile.job_title && (
            <p className="text-primary font-medium mt-1">{state.profile.job_title}</p>
          )}
          {state.profile.company && (
            <p className="text-muted-foreground">{state.profile.company}</p>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-8 space-y-6 pb-12">
        {/* Bio */}
        {state.profile.bio && (
          <Card className="bg-card border-border p-6">
            <p className="text-foreground leading-relaxed">{state.profile.bio}</p>
          </Card>
        )}

        {/* Contact Info */}
        <Card className="bg-card border-border p-6 space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Contact Info</h3>
          
          {state.profile.email && (
            <a
              href={`mailto:${state.profile.email}`}
              className="flex items-center gap-3 p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
            >
              <Mail className="h-5 w-5 text-primary" />
              <span className="text-foreground">{state.profile.email}</span>
            </a>
          )}

          {state.profile.phone && (
            <a
              href={`tel:${state.profile.phone}`}
              className="flex items-center gap-3 p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
            >
              <Phone className="h-5 w-5 text-primary" />
              <span className="text-foreground">{state.profile.phone}</span>
            </a>
          )}

          {state.profile.website && (
            <a
              href={state.profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
            >
              <Globe className="h-5 w-5 text-primary" />
              <span className="text-foreground truncate">{state.profile.website}</span>
            </a>
          )}

          {state.profile.company && (
            <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
              <Building className="h-5 w-5 text-primary" />
              <span className="text-foreground">{state.profile.company}</span>
            </div>
          )}

          {state.profile.job_title && (
            <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
              <Briefcase className="h-5 w-5 text-primary" />
              <span className="text-foreground">{state.profile.job_title}</span>
            </div>
          )}
        </Card>

        {/* Action Buttons - Based on user state */}
        <Card className="bg-card border-border p-6 space-y-3">
          {/* Primary CTA: Open App (if logged in) or Get Buizly (if not) */}
          {state.isAuthenticated ? (
            <Button 
              onClick={handleOpenApp}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6"
            >
              <ExternalLink className="h-5 w-5 mr-2" />
              Open App
            </Button>
          ) : (
            <Button 
              onClick={handleGetApp}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6"
            >
              <ExternalLink className="h-5 w-5 mr-2" />
              Get Buizly
            </Button>
          )}

          {/* Secondary CTA: Save Contact to Phone */}
          <Button
            onClick={downloadVCard}
            variant="outline"
            className="w-full border-primary text-primary hover:bg-primary/10 py-6"
          >
            <Download className="h-5 w-5 mr-2" />
            Save Contact to Phone
          </Button>
        </Card>

        {/* Sign in prompt for non-authenticated users */}
        {!state.isAuthenticated && (
          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground mb-2">
              Already have Buizly?
            </p>
            <Button
              onClick={() => navigate("/auth")}
              variant="ghost"
              className="text-primary hover:bg-primary/10"
            >
              Sign In
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
