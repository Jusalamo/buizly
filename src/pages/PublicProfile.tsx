import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, Briefcase, Globe, Download, Send, Building, Loader2, Lock, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { connectFormSchema, type ConnectFormData } from "@/lib/validationSchemas";
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
  basicInfo: { name: string; avatar_url: string | null } | null;
  isAuthenticated: boolean;
}

export default function PublicProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [state, setState] = useState<ProfileState>({ profile: null, isPrivate: false, basicInfo: null, isAuthenticated: false });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [connectForm, setConnectForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: ""
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ConnectFormData, string>>>({});

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
        .select("id, full_name, avatar_url")
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
        // Profile exists but is private - show limited info
        setState({ 
          profile: null, 
          isPrivate: true, 
          basicInfo: { name: basicData.full_name, avatar_url: basicData.avatar_url },
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

  const handleDownloadApp = () => {
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

  const handleConnect = async () => {
    if (!state.profile) return;

    const validation = connectFormSchema.safeParse(connectForm);
    if (!validation.success) {
      const errors: Partial<Record<keyof ConnectFormData, string>> = {};
      validation.error.errors.forEach(err => {
        if (err.path[0]) {
          errors[err.path[0] as keyof ConnectFormData] = err.message;
        }
      });
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke('create-notification', {
        body: {
          user_id: state.profile.id,
          type: "new_connection",
          title: "New Connection Request",
          message: `${connectForm.name} wants to connect with you`,
          data: {
            name: connectForm.name,
            email: connectForm.email,
            phone: connectForm.phone || null,
            message: connectForm.message || null
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Connection sent!",
        description: `${state.profile.full_name} will receive your details`
      });

      setIsConnectOpen(false);
      setConnectForm({ name: "", email: "", phone: "", message: "" });
    } catch (error: any) {
      toast({
        title: "Error sending connection",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  // Profile is private - show limited info
  if (state.isPrivate && state.basicInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="bg-card border-border p-8 max-w-lg w-full text-center space-y-6">
          {state.basicInfo.avatar_url ? (
            <img 
              src={state.basicInfo.avatar_url} 
              alt={state.basicInfo.name}
              className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-primary"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto border-4 border-primary">
              <span className="text-primary text-3xl font-bold">
                {state.basicInfo.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          
          <h1 className="text-2xl font-bold text-foreground">{state.basicInfo.name}</h1>
          
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Lock className="h-5 w-5" />
            <p>This account is private and info can't be viewed</p>
          </div>

          <Button onClick={() => navigate("/auth")} className="bg-primary text-primary-foreground">
            Sign in to Connect
          </Button>
        </Card>
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

  // Full profile view
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

        {/* Action Buttons */}
        <Card className="bg-card border-border p-6 space-y-3">
          <Dialog open={isConnectOpen} onOpenChange={setIsConnectOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6">
                <Smartphone className="h-5 w-5 mr-2" />
                Connect on Buizly
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Send Your Details</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {state.profile.full_name} will receive your contact information
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="name" className="text-foreground">Your Name *</Label>
                  <Input
                    id="name"
                    value={connectForm.name}
                    onChange={(e) => setConnectForm(prev => ({ ...prev, name: e.target.value }))}
                    className={`bg-background border-border text-foreground ${formErrors.name ? 'border-destructive' : ''}`}
                    placeholder="John Doe"
                    maxLength={100}
                  />
                  {formErrors.name && (
                    <p className="text-destructive text-sm mt-1">{formErrors.name}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="email" className="text-foreground">Your Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={connectForm.email}
                    onChange={(e) => setConnectForm(prev => ({ ...prev, email: e.target.value }))}
                    className={`bg-background border-border text-foreground ${formErrors.email ? 'border-destructive' : ''}`}
                    placeholder="john@example.com"
                    maxLength={255}
                  />
                  {formErrors.email && (
                    <p className="text-destructive text-sm mt-1">{formErrors.email}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="phone" className="text-foreground">Your Phone (Optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={connectForm.phone}
                    onChange={(e) => setConnectForm(prev => ({ ...prev, phone: e.target.value }))}
                    className={`bg-background border-border text-foreground ${formErrors.phone ? 'border-destructive' : ''}`}
                    placeholder="+1 (555) 000-0000"
                    maxLength={20}
                  />
                  {formErrors.phone && (
                    <p className="text-destructive text-sm mt-1">{formErrors.phone}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="message" className="text-foreground">Message (Optional)</Label>
                  <Textarea
                    id="message"
                    value={connectForm.message}
                    onChange={(e) => setConnectForm(prev => ({ ...prev, message: e.target.value }))}
                    className={`bg-background border-border text-foreground ${formErrors.message ? 'border-destructive' : ''}`}
                    placeholder="I'd love to connect..."
                    rows={3}
                    maxLength={500}
                  />
                  {formErrors.message && (
                    <p className="text-destructive text-sm mt-1">{formErrors.message}</p>
                  )}
                </div>
                <Button 
                  onClick={handleConnect} 
                  className="w-full bg-primary text-primary-foreground"
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Send Connection Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            onClick={downloadVCard}
            variant="outline"
            className="w-full border-primary text-primary hover:bg-primary/10 py-6"
          >
            <Download className="h-5 w-5 mr-2" />
            Save Contact to Phone
          </Button>
        </Card>

        {/* App Download CTA */}
        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground mb-2">
            Want your own digital business card?
          </p>
          <Button
            onClick={handleDownloadApp}
            variant="ghost"
            className="text-primary hover:bg-primary/10"
          >
            Get Buizly
          </Button>
        </div>
      </div>
    </div>
  );
}
