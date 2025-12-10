import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Crown, ArrowRight, X, Zap, Users, BarChart3 } from "lucide-react";

interface UpgradePromptProps {
  title?: string;
  description?: string;
  onDismiss?: () => void;
  showDismiss?: boolean;
  // Dialog mode props
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  feature?: "connections" | "analytics" | "qr_customization" | "general";
}

const featureMessages = {
  connections: {
    title: "Connection Limit Reached",
    description: "You've used all 5 free connections this month. Upgrade to Pro for unlimited connections!",
  },
  analytics: {
    title: "Unlock Analytics",
    description: "Track who views your digital business card with detailed analytics.",
  },
  qr_customization: {
    title: "Custom QR Codes",
    description: "Personalize your QR code with custom colors and branding.",
  },
  general: {
    title: "Upgrade to Pro",
    description: "Unlock unlimited connections and premium features!",
  },
};

export function UpgradePrompt({ 
  title,
  description,
  onDismiss,
  showDismiss = true,
  open,
  onOpenChange,
  feature = "general",
}: UpgradePromptProps) {
  const navigate = useNavigate();
  
  const displayTitle = title || featureMessages[feature].title;
  const displayDescription = description || featureMessages[feature].description;

  // Dialog mode
  if (open !== undefined && onOpenChange) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-primary/20 p-3 rounded-full">
                <Crown className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-xl text-foreground">{displayTitle}</DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground">
              {displayDescription}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Pro Features */}
            <div className="bg-secondary rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">Pro includes:</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Unlimited connections</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span>Profile view analytics</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>Custom QR code colors</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 border-border"
              >
                Maybe Later
              </Button>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  navigate("/subscription");
                }}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                View Plans
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Card mode (inline)
  return (
    <Card className="bg-gradient-to-r from-primary/20 to-primary/5 border-primary/30 p-6 relative">
      {showDismiss && onDismiss && (
        <button 
          onClick={onDismiss}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      
      <div className="flex items-start gap-4">
        <div className="bg-primary/20 p-3 rounded-full">
          <Crown className="h-6 w-6 text-primary" />
        </div>
        
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{displayTitle}</h3>
            <p className="text-sm text-muted-foreground">{displayDescription}</p>
          </div>
          
          <Button
            onClick={() => navigate("/subscription")}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            View Plans
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
