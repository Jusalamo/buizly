import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Infinity, AlertCircle } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

interface ConnectionLimitBadgeProps {
  showUpgradeLink?: boolean;
}

export function ConnectionLimitBadge({ showUpgradeLink = true }: ConnectionLimitBadgeProps) {
  const navigate = useNavigate();
  const { getConnectionsRemaining, getCurrentPlan, loading } = useSubscription();
  
  if (loading) return null;
  
  const remaining = getConnectionsRemaining();
  const plan = getCurrentPlan();
  
  if (remaining === "unlimited") {
    return (
      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
        <Infinity className="h-3 w-3 mr-1" />
        Unlimited
      </Badge>
    );
  }
  
  const isLow = remaining <= 2;
  const isExhausted = remaining === 0;
  
  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant={isExhausted ? "destructive" : isLow ? "secondary" : "outline"}
        className={
          isExhausted 
            ? "bg-destructive/10 text-destructive border-destructive/20" 
            : isLow 
              ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
              : "border-border text-muted-foreground"
        }
      >
        {isExhausted && <AlertCircle className="h-3 w-3 mr-1" />}
        {remaining} / 5 connections left
      </Badge>
      
      {showUpgradeLink && (isLow || isExhausted) && (
        <button
          onClick={() => navigate("/subscription")}
          className="text-xs text-primary hover:underline"
        >
          Upgrade
        </button>
      )}
    </div>
  );
}
