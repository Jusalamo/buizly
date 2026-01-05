import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Smartphone, Download, ExternalLink } from "lucide-react";

interface OpenAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  profileName?: string;
}

export function OpenAppModal({ open, onOpenChange, profileId, profileName }: OpenAppModalProps) {
  const navigate = useNavigate();
  const [connecting, setConnecting] = useState(false);

  const handleConnect = () => {
    setConnecting(true);
    // Deep link to open the app with this profile
    const deepLink = `buizly://profile/${profileId}`;
    
    // Try to open the app
    window.location.href = deepLink;
    
    // If app doesn't open after 1 second, redirect to web app auth
    setTimeout(() => {
      navigate(`/auth?redirect=/u/${profileId}&action=connect`);
      setConnecting(false);
      onOpenChange(false);
    }, 1500);
  };

  const handleGetApp = () => {
    const userAgent = navigator.userAgent || navigator.vendor;
    
    if (/iPad|iPhone|iPod/.test(userAgent)) {
      window.open("https://apps.apple.com/app/buizly", "_blank");
    } else if (/android/i.test(userAgent)) {
      window.open("https://play.google.com/store/apps/details?id=com.buizly.app", "_blank");
    } else {
      // Desktop - redirect to auth
      navigate(`/auth?redirect=/u/${profileId}`);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm mx-auto">
        <DialogHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl text-foreground">
            {profileName ? `Connect with ${profileName}` : "Open in Buizly"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Choose how you'd like to continue
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {/* Connect / Open App Button */}
          <Button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6 text-base font-medium transition-all active:scale-[0.98]"
          >
            <ExternalLink className="h-5 w-5 mr-2" />
            {connecting ? "Opening..." : "Connect"}
          </Button>

          {/* Get Buizly Button */}
          <Button
            onClick={handleGetApp}
            variant="outline"
            className="w-full border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground py-6 text-base font-medium transition-all active:scale-[0.98]"
          >
            <Download className="h-5 w-5 mr-2" />
            Get Buizly
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-4">
          Don't have the app? Download it to connect with professionals instantly.
        </p>
      </DialogContent>
    </Dialog>
  );
}
