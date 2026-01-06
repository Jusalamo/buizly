import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mail, Phone, Briefcase, Globe, Download, Building, Lock, Smartphone, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProfileCardSkeleton } from "@/components/skeletons/ProfileCardSkeleton";
import { OpenAppModal } from "@/components/OpenAppModal";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface PublicSafeProfile extends Omit<Profile, 'email' | 'phone'> {
  email: string | null;
  phone: string | null;
}

interface ProfileState {
  profile: PublicSafeProfile | null;
  isPrivate: boolean;
  basicInfo: { name: string; avatar_url: string | null } | null;
  isAuthenticated: boolean;
  currentUserId: string | null;
}

export default function PublicProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [state, setState] = useState<ProfileState>({ 
    profile: null, 
    isPrivate: false, 
    basicInfo: null, 
    isAuthenticated: false,
    currentUserId: null
  });
  const [loading, setLoading] = useState(true);
  const [showOpenAppModal, setShowOpenAppModal] = useState(false);
  const [notificationSent, setNotificationSent] = useState(false);

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
      // Check authentication
      const { data: { session } } = await supabase.auth.getSession();
      const isAuthenticated = !!session?.user;
      const currentUserId = session?.user?.id || null;

      // Parallel fetch: basic info + visibility setting
      const [basicResult, settingsResult] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url").eq("id", userId).maybeSingle(),
        supabase.from("user_settings").select("profile_visibility").eq("user_id", userId).maybeSingle()
      ]);

      if (!basicResult.data) {
        setState({ profile: null, isPrivate: false, basicInfo: null, isAuthenticated, currentUserId });
        setLoading(false);
        return;
      }

      const visibility = settingsResult.data?.profile_visibility || 'public';
      const isPrivate = visibility === 'private';

      // For private profiles: only show name and photo, NO additional info
      if (isPrivate && currentUserId !== userId) {
        setState({ 
          profile: null, 
          isPrivate: true, 
          basicInfo: { 
            name: basicResult.data.full_name, 
            avatar_url: basicResult.data.avatar_url
          },
          isAuthenticated,
          currentUserId
        });
        setLoading(false);
        return;
      }

      // Can view full profile - fetch complete data
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      // Strip sensitive PII for unauthenticated viewers
      let safeProfile: PublicSafeProfile | null = null;
      if (profileData) {
        safeProfile = {
          ...profileData,
          email: isAuthenticated ? profileData.email : null,
          phone: isAuthenticated ? profileData.phone : null,
        };
      }

      setState({ profile: safeProfile, isPrivate: false, basicInfo: null, isAuthenticated, currentUserId });
    } catch (error) {
      console.error("Error loading profile:", error);
      setState({ profile: null, isPrivate: false, basicInfo: null, isAuthenticated: false, currentUserId: null });
    } finally {
      setLoading(false);
    }
  };

  const trackView = async () => {
    if (!userId) return;
    
    try {
      await supabase.functions.invoke('track-profile-view', {
        body: { profileId: userId, referrer: document.referrer || null }
      });
    } catch (error) {
      console.error("Error tracking view:", error);
    }
  };

  const notifyPrivateUser = async () => {
    if (!userId || notificationSent) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create notification for the private profile owner
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'profile_shared',
        title: 'Someone scanned your card',
        message: user 
          ? 'A Buizly user scanned your profile card. Would you like to connect with them?'
          : 'Someone scanned your profile card. Sign in to see who.',
        data: user ? { scanner_id: user.id } : null
      });

      setNotificationSent(true);
      toast({
        title: "Notification sent",
        description: `${state.basicInfo?.name} will be notified that you're interested in connecting`,
      });
    } catch (error) {
      console.error("Error sending notification:", error);
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
    setShowOpenAppModal(true);
  };

  // Skeleton loading
  if (loading) {
    return <ProfileCardSkeleton />;
  }

  // Private profile - show only name and photo, NO connect options
  if (state.isPrivate && state.basicInfo) {
    return (
      <div className="min-h-screen bg-background">
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
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 -mt-8 space-y-6 pb-12">
          {/* Private Account Message - NO connect options */}
          <Card className="bg-card border-border p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">This Account is Private</h2>
                <p className="text-muted-foreground text-sm">
                  {state.basicInfo.name.split(' ')[0]} has a private profile
                </p>
              </div>
            </div>
          </Card>

          {/* Notify button - lets the private user know someone scanned their card */}
          {state.isAuthenticated && !notificationSent && (
            <Button 
              onClick={notifyPrivateUser}
              variant="outline"
              className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground py-6"
            >
              <Bell className="h-5 w-5 mr-2" />
              Let {state.basicInfo.name.split(' ')[0]} know you scanned their card
            </Button>
          )}

          {notificationSent && (
            <Card className="bg-primary/10 border-primary/30 p-4 text-center">
              <p className="text-sm text-foreground">
                ✓ {state.basicInfo.name.split(' ')[0]} has been notified
              </p>
            </Card>
          )}

          {/* Download app for non-authenticated */}
          {!state.isAuthenticated && (
            <div className="space-y-4">
              <Card className="bg-card border-border p-6">
                <p className="text-center text-muted-foreground text-sm mb-4">
                  Get Buizly to connect with {state.basicInfo.name.split(' ')[0]}
                </p>
                <Button 
                  onClick={handleOpenApp}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6"
                >
                  <Smartphone className="h-5 w-5 mr-2" />
                  Get Buizly
                </Button>
              </Card>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Already have Buizly?</p>
                <Button onClick={() => navigate("/auth")} variant="ghost" className="text-primary hover:bg-primary/10">
                  Sign In
                </Button>
              </div>
            </div>
          )}
        </div>

        <OpenAppModal
          open={showOpenAppModal}
          onOpenChange={setShowOpenAppModal}
          profileId={userId || ""}
          profileName={state.basicInfo?.name}
        />
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

  // Full public profile view
  return (
    <div className="min-h-screen bg-background">
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
        {state.profile.bio && (
          <Card className="bg-card border-border p-6">
            <p className="text-foreground leading-relaxed">{state.profile.bio}</p>
          </Card>
        )}

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

        {/* CTAs */}
        <Card className="bg-card border-border p-6 space-y-3">
          {state.isAuthenticated ? (
            <Button 
              onClick={handleOpenApp}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6"
            >
              <Smartphone className="h-5 w-5 mr-2" />
              Open App
            </Button>
          ) : (
            <Button 
              onClick={handleOpenApp}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6"
            >
              <Smartphone className="h-5 w-5 mr-2" />
              Get Buizly
            </Button>
          )}

          <Button
            onClick={downloadVCard}
            variant="outline"
            className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground py-6"
          >
            <Download className="h-5 w-5 mr-2" />
            Save Contact to Phone
          </Button>
        </Card>

        {!state.isAuthenticated && (
          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground mb-2">Already have Buizly?</p>
            <Button onClick={() => navigate("/auth")} variant="ghost" className="text-primary hover:bg-primary/10">
              Sign In
            </Button>
          </div>
        )}
      </div>

      <OpenAppModal
        open={showOpenAppModal}
        onOpenChange={setShowOpenAppModal}
        profileId={userId || ""}
        profileName={state.profile?.full_name || state.basicInfo?.name}
      />
    </div>
  );
}
