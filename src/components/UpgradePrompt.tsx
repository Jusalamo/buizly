import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, ArrowRight, X } from "lucide-react";

interface UpgradePromptProps {
  title?: string;
  description?: string;
  onDismiss?: () => void;
  showDismiss?: boolean;
}

export function UpgradePrompt({ 
  title = "Upgrade to Pro",
  description = "You've reached your free connection limit. Upgrade for unlimited connections and more features!",
  onDismiss,
  showDismiss = true,
}: UpgradePromptProps) {
  const navigate = useNavigate();

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
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
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
