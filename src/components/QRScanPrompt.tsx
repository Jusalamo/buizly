import { useState } from "react";
import { Download, ArrowRight, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface QRScanPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileData: {
    name: string;
    title?: string;
    company?: string;
    email: string;
    phone?: string;
    website?: string;
  };
}

export function QRScanPrompt({ open, onOpenChange, profileData }: QRScanPromptProps) {
  const [showDetails, setShowDetails] = useState(false);

  const handleDownloadApp = () => {
    // In a real app, this would redirect to app store
    window.open("https://apps.apple.com/app/buizly", "_blank");
  };

  const handleContinueWithout = () => {
    setShowDetails(true);
  };

  const handleSaveContact = () => {
    // Create vCard format
    const vCard = `BEGIN:VCARD
VERSION:3.0
FN:${profileData.name}
${profileData.title ? `TITLE:${profileData.title}` : ""}
${profileData.company ? `ORG:${profileData.company}` : ""}
EMAIL:${profileData.email}
${profileData.phone ? `TEL:${profileData.phone}` : ""}
${profileData.website ? `URL:${profileData.website}` : ""}
END:VCARD`;

    const blob = new Blob([vCard], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${profileData.name.replace(/\s+/g, "_")}.vcf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground text-center">
            {showDetails ? profileData.name : "Connect with Buizly"}
          </DialogTitle>
        </DialogHeader>

        {!showDetails ? (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground">
                Get the best experience with the Buizly app
              </p>
            </div>

            <Button
              onClick={handleDownloadApp}
              className="w-full bg-primary text-primary-foreground py-6"
            >
              <Download className="h-5 w-5 mr-2" />
              Download Buizly App
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              onClick={handleContinueWithout}
              variant="outline"
              className="w-full border-border text-foreground"
            >
              Continue without app
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="bg-card-surface rounded-xl p-4 space-y-3">
              {profileData.title && (
                <p className="text-sm text-primary">{profileData.title}</p>
              )}
              {profileData.company && (
                <p className="text-sm text-muted-foreground">{profileData.company}</p>
              )}
              
              <div className="pt-2 border-t border-border space-y-2">
                <p className="text-sm text-foreground">
                  ✉️ {profileData.email}
                </p>
                {profileData.phone && (
                  <p className="text-sm text-foreground">
                    📱 {profileData.phone}
                  </p>
                )}
                {profileData.website && (
                  <p className="text-sm text-foreground">
                    🌐 {profileData.website}
                  </p>
                )}
              </div>
            </div>

            <Button
              onClick={handleSaveContact}
              className="w-full bg-primary text-primary-foreground"
            >
              Save Contact
            </Button>

            <Button
              onClick={handleDownloadApp}
              variant="outline"
              className="w-full border-primary text-primary"
            >
              <Download className="h-4 w-4 mr-2" />
              Get the App for More Features
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
