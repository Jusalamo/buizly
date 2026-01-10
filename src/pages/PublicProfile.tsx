import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mail, Phone, Briefcase, Globe, Download, Building, Lock, Smartphone, Bell, Instagram } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProfileCardSkeleton } from "@/components/skeletons/ProfileCardSkeleton";
import { OpenAppModal } from "@/components/OpenAppModal";
import { OptimizedAvatar } from "@/components/OptimizedAvatar";
import { GalleryPhotos } from "@/components/GalleryPhotos";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"] & {
  instagram_url?: string;
  gallery_photos?: string[];
};

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
      const { data: { session } } = await supabase.auth.getSession();
      const isAuthenticated = !!session?.user;
      const currentUserId = session?.user?.id || null;

      const [basicResult, settingsResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("user_settings").select("profile_visibility").eq("user_id", userId).maybeSingle()
      ]);

      if (!basicResult.data) {
        setState({ profile: null, isPrivate: false, basicInfo: null, isAuthenticated, currentUserId });
        setLoading(false);
        return;
      }

      const visibility = settingsResult.data?.profile_visibility || 'public';
      const isPrivate = visibility === 'private';

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

      let safeProfile: PublicSafeProfile | null = null;
      if (basicResult.data) {
        safeProfile = {
          ...basicResult.data,
          email: isAuthenticated ? basicResult.data.email : null,
          phone: isAuthenticated ? basicResult.data.phone : null,
        } as PublicSafeProfile;
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
      await supabase.functions.invoke('create-notification', {
        body: {
          user_id: userId,
          type: 'profile_shared',
          title: 'Someone scanned your card',
          message: user 
            ? 'A Buizly user scanned your profile card. Would you like to connect with them?'
            : 'Someone scanned your profile card. Sign in to see who.',
          data: user ? { scanner_id: user.id } : null
        }
      });
      setNotificationSent(true);
      toast({
        title: "Notification sent",
        description: `${state.basicInfo?.name} will be notified`,
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
END:VCARD`;
    const blob = new Blob([vcard], { type: 'text/vcard' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.profile.full_name.replace(/\s+/g, '_')}.vcf`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) return <ProfileCardSkeleton />;

  if (state.isPrivate && state.basicInfo) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-b from-primary/20 to-background pt-12 pb-20 px-4">
          <div className="max-w-lg mx-auto text-center">
            <OptimizedAvatar src={state.basicInfo.avatar_url} alt={state.basicInfo.name} size="xl" className="mx-auto mb-4 border-4 border-primary" />
            <h1 className="text-3xl font-bold text-foreground">{state.basicInfo.name}</h1>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 -mt-8 space-y-6 pb-12">
          <Card className="bg-card border-border p-8 text-center">
            <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground">Private Account</h2>
          </Card>
          {state.isAuthenticated && !notificationSent && (
            <Button onClick={notifyPrivateUser} variant="outline" className="w-full">
              <Bell className="h-5 w-5 mr-2" /> Notify {state.basicInfo.name.split(' ')[0]}
            </Button>
          )}
        </div>
        <OpenAppModal open={showOpenAppModal} onOpenChange={setShowOpenAppModal} profileId={userId || ""} profileName={state.basicInfo?.name} />
      </div>
    );
  }

  if (!state.profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="bg-card border-border p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-foreground mb-4">Profile Not Found</h1>
          <Button onClick={() => navigate("/")} className="bg-primary text-primary-foreground">Go to Home</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-b from-primary/20 to-background pt-12 pb-20 px-4">
        <div className="max-w-lg mx-auto text-center">
          <OptimizedAvatar src={state.profile.avatar_url} alt={state.profile.full_name} size="xl" className="mx-auto mb-4 border-4 border-primary" />
          <h1 className="text-3xl font-bold text-foreground">{state.profile.full_name}</h1>
          {state.profile.job_title && <p className="text-primary font-medium mt-1">{state.profile.job_title}</p>}
          {state.profile.company && <p className="text-muted-foreground">{state.profile.company}</p>}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-8 space-y-6 pb-12">
        {/* Gallery Photos */}
        {state.profile.gallery_photos && state.profile.gallery_photos.length > 0 && (
          <Card className="bg-card border-border p-4">
            <GalleryPhotos photos={state.profile.gallery_photos} onChange={() => {}} editable={false} />
          </Card>
        )}

        {state.profile.bio && (
          <Card className="bg-card border-border p-6">
            <p className="text-foreground leading-relaxed">{state.profile.bio}</p>
          </Card>
        )}

        {/* Social Links */}
        {(state.profile.linkedin_url || state.profile.instagram_url) && (
          <div className="flex justify-center gap-3">
            {state.profile.linkedin_url && (
              <Button variant="outline" size="icon" className="border-[#0077B5] text-[#0077B5]" onClick={() => window.open(state.profile!.linkedin_url!, '_blank')}>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </Button>
            )}
            {state.profile.instagram_url && (
              <Button variant="outline" size="icon" className="border-[#E4405F] text-[#E4405F]" onClick={() => window.open(state.profile!.instagram_url!, '_blank')}>
                <Instagram className="h-5 w-5" />
              </Button>
            )}
          </div>
        )}

        <Card className="bg-card border-border p-6 space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase">Contact Info</h3>
          {state.profile.email && <a href={`mailto:${state.profile.email}`} className="flex items-center gap-3 p-3 bg-secondary rounded-lg"><Mail className="h-5 w-5 text-primary" /><span className="text-foreground">{state.profile.email}</span></a>}
          {state.profile.phone && <a href={`tel:${state.profile.phone}`} className="flex items-center gap-3 p-3 bg-secondary rounded-lg"><Phone className="h-5 w-5 text-primary" /><span className="text-foreground">{state.profile.phone}</span></a>}
          {state.profile.website && <a href={state.profile.website} target="_blank" className="flex items-center gap-3 p-3 bg-secondary rounded-lg"><Globe className="h-5 w-5 text-primary" /><span className="text-foreground truncate">{state.profile.website}</span></a>}
        </Card>

        <Card className="bg-card border-border p-6 space-y-3">
          <Button onClick={() => setShowOpenAppModal(true)} className="w-full bg-primary text-primary-foreground py-6"><Smartphone className="h-5 w-5 mr-2" />{state.isAuthenticated ? 'Open App' : 'Get Buizly'}</Button>
          <Button onClick={downloadVCard} variant="outline" className="w-full border-primary text-primary py-6"><Download className="h-5 w-5 mr-2" />Save Contact</Button>
        </Card>
      </div>
      <OpenAppModal open={showOpenAppModal} onOpenChange={setShowOpenAppModal} profileId={userId || ""} profileName={state.profile?.full_name} />
    </div>
  );
}
