import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mail, Phone, Briefcase, Globe, Download, Lock, Smartphone, Bell, Instagram, Building, User, CreditCard, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProfileCardSkeleton } from "@/components/skeletons/ProfileCardSkeleton";
import { OpenAppModal } from "@/components/OpenAppModal";
import { OptimizedAvatar } from "@/components/OptimizedAvatar";
import { QRCode } from "@/components/QRCode";
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
  basicInfo: { name: string; avatar_url: string | null; job_title?: string | null; company?: string | null } | null;
  isAuthenticated: boolean;
  currentUserId: string | null;
}

interface ThemeSettings {
  qr_foreground: string;
  qr_background: string;
  accent_color: string;
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
  const [viewMode, setViewMode] = useState<'profile' | 'card'>('profile');
  const [themeSettings, setThemeSettings] = useState<ThemeSettings | null>(null);

  useEffect(() => {
    loadProfile();
    trackView();
    loadThemeSettings();
  }, [userId]);

  const loadProfile = async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const isAuthenticated = !!session?.user;
      const currentUserId = session?.user?.id || null;

      const { data: visibility } = await supabase.rpc('get_profile_visibility', { target_user_id: userId });
      const isPrivate = visibility === 'private';

      if (isPrivate && currentUserId !== userId) {
        const { data: publicProfile } = await supabase.rpc('get_public_profile_safe', { profile_id: userId });
        if (publicProfile && publicProfile.length > 0) {
          setState({ profile: null, isPrivate: true, basicInfo: { name: publicProfile[0].full_name, avatar_url: publicProfile[0].avatar_url, job_title: publicProfile[0].job_title, company: publicProfile[0].company }, isAuthenticated, currentUserId });
        } else {
          setState({ profile: null, isPrivate: true, basicInfo: null, isAuthenticated, currentUserId });
        }
        setLoading(false);
        return;
      }

      if (isAuthenticated) {
        const { data: fullProfile } = await supabase.rpc('get_profile_with_contact', { profile_id: userId });
        if (fullProfile && fullProfile.length > 0) {
          setState({ profile: fullProfile[0] as PublicSafeProfile, isPrivate: false, basicInfo: null, isAuthenticated, currentUserId });
        } else {
          setState({ profile: null, isPrivate: false, basicInfo: null, isAuthenticated, currentUserId });
        }
      } else {
        const { data: publicProfile } = await supabase.rpc('get_public_profile_safe', { profile_id: userId });
        if (publicProfile && publicProfile.length > 0) {
          setState({ profile: { ...publicProfile[0], email: null, phone: null } as PublicSafeProfile, isPrivate: false, basicInfo: null, isAuthenticated, currentUserId });
        } else {
          setState({ profile: null, isPrivate: false, basicInfo: null, isAuthenticated, currentUserId });
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      setState({ profile: null, isPrivate: false, basicInfo: null, isAuthenticated: false, currentUserId: null });
    } finally {
      setLoading(false);
    }
  };

  const loadThemeSettings = async () => {
    if (!userId) return;
    try {
      const { data } = await supabase
        .from('user_settings')
        .select('qr_foreground, qr_background, accent_color')
        .eq('user_id', userId)
        .maybeSingle();
      if (data) setThemeSettings(data as ThemeSettings);
    } catch (error) {
      // Ignore - use defaults
    }
  };

  const trackView = async () => {
    if (!userId) return;
    try {
      await supabase.functions.invoke('track-profile-view', { body: { profileId: userId, referrer: document.referrer || null } });
    } catch (error) { console.error("Error tracking view:", error); }
  };

  const notifyPrivateUser = async () => {
    if (!userId || notificationSent) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.functions.invoke('create-notification', {
        body: {
          user_id: userId, type: 'profile_shared', title: 'Someone scanned your card',
          message: user ? 'A Buizly user scanned your profile card.' : 'Someone scanned your profile card.',
          data: user ? { scanner_id: user.id } : null
        }
      });
      setNotificationSent(true);
      toast({ title: "Notification sent", description: `${state.basicInfo?.name} will be notified` });
    } catch (error) { console.error("Error sending notification:", error); }
  };

  const downloadVCard = () => {
    if (!state.profile) return;
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${state.profile.full_name}\n${state.profile.email ? `EMAIL:${state.profile.email}\n` : ''}TEL:${state.profile.phone || ''}\nTITLE:${state.profile.job_title || ''}\nORG:${state.profile.company || ''}\nURL:${state.profile.website || ''}\nEND:VCARD`;
    const blob = new Blob([vcard], { type: 'text/vcard' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.profile.full_name.replace(/\s+/g, '_')}.vcf`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const accentColor = themeSettings?.accent_color || undefined;
  const qrFg = themeSettings?.qr_foreground || '#00ff4d';
  const qrBg = themeSettings?.qr_background || '#000000';

  if (loading) return <ProfileCardSkeleton />;

  // Private profile
  if (state.isPrivate && state.basicInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="bg-card border-border overflow-hidden">
            <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-6">
              <div className="flex items-center gap-4">
                <OptimizedAvatar src={state.basicInfo.avatar_url} alt={state.basicInfo.name} size="xl" className="border-4 border-card shadow-lg" />
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-foreground truncate">{state.basicInfo.name}</h1>
                  {state.basicInfo.job_title && <p className="text-sm text-primary font-medium truncate">{state.basicInfo.job_title}</p>}
                  {state.basicInfo.company && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                      <Building className="h-3.5 w-3.5 flex-shrink-0" />{state.basicInfo.company}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Lock className="h-5 w-5" />
                <p className="text-sm">This account is private. Contact info is hidden.</p>
              </div>
              {state.isAuthenticated && !notificationSent && (
                <Button onClick={notifyPrivateUser} variant="outline" className="w-full">
                  <Bell className="h-5 w-5 mr-2" /> Notify {state.basicInfo.name.split(' ')[0]}
                </Button>
              )}
            </div>
          </Card>
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'profile' ? 'default' : 'outline'}
            onClick={() => setViewMode('profile')}
            className="flex-1 gap-2"
          >
            <User className="h-4 w-4" />
            Profile
          </Button>
          <Button
            variant={viewMode === 'card' ? 'default' : 'outline'}
            onClick={() => setViewMode('card')}
            className="flex-1 gap-2"
          >
            <CreditCard className="h-4 w-4" />
            Business Card
          </Button>
        </div>

        {/* Profile View */}
        {viewMode === 'profile' && (
          <>
            <Card className="bg-card border-border overflow-hidden shadow-lg">
              <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-6" style={accentColor ? { background: `linear-gradient(to right, ${accentColor}33, ${accentColor}0d)` } : undefined}>
                <div className="flex items-start gap-4">
                  <OptimizedAvatar src={state.profile.avatar_url} alt={state.profile.full_name} size="xl" className="border-4 border-card shadow-lg flex-shrink-0" />
                  <div className="flex-1 min-w-0 pt-1">
                    <h1 className="text-xl font-bold text-foreground truncate">{state.profile.full_name}</h1>
                    {state.profile.job_title && <p className="text-sm font-medium mt-0.5" style={accentColor ? { color: accentColor } : undefined}>{state.profile.job_title}</p>}
                    {state.profile.company && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Building className="h-3.5 w-3.5 flex-shrink-0" />{state.profile.company}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {state.profile.email && (
                  <a href={`mailto:${state.profile.email}`} className="flex items-center gap-3 p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors">
                    <Mail className="h-4 w-4 text-primary flex-shrink-0" /><span className="text-sm text-foreground truncate">{state.profile.email}</span>
                  </a>
                )}
                {state.profile.phone && (
                  <a href={`tel:${state.profile.phone}`} className="flex items-center gap-3 p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors">
                    <Phone className="h-4 w-4 text-primary flex-shrink-0" /><span className="text-sm text-foreground">{state.profile.phone}</span>
                  </a>
                )}
                {state.profile.website && (
                  <a href={state.profile.website} target="_blank" className="flex items-center gap-3 p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors">
                    <Globe className="h-4 w-4 text-primary flex-shrink-0" /><span className="text-sm text-foreground truncate">{state.profile.website}</span>
                  </a>
                )}
              </div>
              {(state.profile.linkedin_url || state.profile.instagram_url) && (
                <div className="flex justify-center gap-3 pb-4 px-4">
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
            </Card>

            {state.profile.bio && (
              <Card className="bg-card border-border p-4">
                <p className="text-sm text-foreground leading-relaxed">{state.profile.bio}</p>
              </Card>
            )}

            {state.profile.gallery_photos && state.profile.gallery_photos.length > 0 && (
              <Card className="bg-card border-border p-4">
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {state.profile.gallery_photos.map((photo, index) => (
                    <img key={index} src={photo} alt={`Gallery photo ${index + 1}`} className="h-24 w-24 object-cover rounded-lg flex-shrink-0" />
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        {/* Business Card View */}
        {viewMode === 'card' && (
          <Card 
            className="overflow-hidden shadow-xl border-border"
            style={{ backgroundColor: qrBg }}
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                {/* Left: Avatar/Logo */}
                <div className="flex-shrink-0">
                  <OptimizedAvatar 
                    src={state.profile.avatar_url} 
                    alt={state.profile.full_name} 
                    size="xl" 
                    className={`border-2 shadow-lg`}
                  />
                </div>

                {/* Right: Details */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold truncate" style={{ color: qrFg }}>{state.profile.full_name}</h2>
                  {state.profile.job_title && (
                    <p className="text-sm font-medium truncate" style={{ color: `${qrFg}cc` }}>{state.profile.job_title}</p>
                  )}
                  {state.profile.company && (
                    <p className="text-sm truncate mt-0.5" style={{ color: `${qrFg}99` }}>{state.profile.company}</p>
                  )}
                  
                  <div className="mt-3 space-y-1.5">
                    {state.profile.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 flex-shrink-0" style={{ color: qrFg }} />
                        <span className="text-xs truncate" style={{ color: `${qrFg}cc` }}>{state.profile.email}</span>
                      </div>
                    )}
                    {state.profile.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 flex-shrink-0" style={{ color: qrFg }} />
                        <span className="text-xs" style={{ color: `${qrFg}cc` }}>{state.profile.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex justify-end mt-4">
                <div className="bg-white rounded-lg p-1.5">
                  <QRCode 
                    url={`https://buizly.lovable.app/u/${userId}`}
                    size={64}
                    customColors={{ foreground: qrFg, background: '#ffffff' }}
                  />
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button onClick={() => setShowOpenAppModal(true)} className="w-full bg-primary text-primary-foreground py-6">
            <Smartphone className="h-5 w-5 mr-2" />
            {state.isAuthenticated ? 'Open App' : 'Get Buizly'}
          </Button>
          <Button onClick={downloadVCard} variant="outline" className="w-full border-primary text-primary py-6">
            <Download className="h-5 w-5 mr-2" />
            Save Contact
          </Button>
        </div>
      </div>
      <OpenAppModal open={showOpenAppModal} onOpenChange={setShowOpenAppModal} profileId={userId || ""} profileName={state.profile?.full_name} />
    </div>
  );
}
