import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserSettings } from "@/hooks/useUserSettings";
import { cn } from "@/lib/utils";

interface TourStep {
  title: string;
  description: string;
  target: string;
  route: string;
  position: "top" | "bottom" | "center";
  icon?: string;
}

const tourSteps: TourStep[] = [
  {
    title: "Welcome to Buizly! 👋",
    description: "Your digital business card and networking CRM. Let's take a quick tour of all the powerful features!",
    target: "body",
    route: "/",
    position: "center",
    icon: "✨"
  },
  {
    title: "Your Dashboard",
    description: "See your upcoming meetings, recent connections, and networking activity at a glance. Your QR code lets others instantly save your contact info!",
    target: "[data-tour='dashboard']",
    route: "/",
    position: "top",
    icon: "🏠"
  },
  {
    title: "Your Network",
    description: "All your professional connections in one place. Search, filter by date or company, and manage relationships. Create 'Plugs' to introduce contacts!",
    target: "[data-tour='network']",
    route: "/network",
    position: "top",
    icon: "👥"
  },
  {
    title: "Add Connections",
    description: "Discover new people or capture contacts you meet. Send connection requests and grow your professional network!",
    target: "[data-tour='capture']",
    route: "/discover",
    position: "top",
    icon: "➕"
  },
  {
    title: "Schedule Meetings",
    description: "Book meetings with your connections, add participants, notes, and photos. Get automatic reminders and sync with Google Calendar!",
    target: "[data-tour='schedule']",
    route: "/schedule",
    position: "top",
    icon: "📅"
  },
  {
    title: "Your Profile & QR Code",
    description: "Customize your digital business card. Share your unique QR code at events - people can scan it to instantly save your contact info!",
    target: "[data-tour='profile']",
    route: "/profile",
    position: "top",
    icon: "📇"
  },
  {
    title: "Settings & Preferences",
    description: "Manage your account, notifications, privacy settings, and subscription. Connect your calendar and customize your experience!",
    target: "[data-tour='settings']",
    route: "/settings",
    position: "top",
    icon: "⚙️"
  },
  {
    title: "You're All Set! 🎉",
    description: "Start building your network! Add connections, schedule meetings, and share your digital business card. Happy networking!",
    target: "body",
    route: "/",
    position: "center",
    icon: "🚀"
  }
];

export function OnboardingTour() {
  const { settings, completeOnboarding, loading } = useUserSettings();
  const [currentStep, setCurrentStep] = useState(0);
  const [showTour, setShowTour] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && settings && !settings.onboarding_completed) {
      // Small delay to let the app render first
      const timer = setTimeout(() => setShowTour(true), 500);
      return () => clearTimeout(timer);
    }
  }, [settings, loading]);

  // Navigate to the correct route for the current step
  useEffect(() => {
    if (!showTour || isNavigating) return;
    
    const step = tourSteps[currentStep];
    if (step && location.pathname !== step.route) {
      setIsNavigating(true);
      navigate(step.route);
      // Small delay to let the page render
      setTimeout(() => setIsNavigating(false), 300);
    }
  }, [currentStep, showTour, navigate, location.pathname, isNavigating]);

  const handleNext = useCallback(() => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleComplete = useCallback(async () => {
    setShowTour(false);
    await completeOnboarding();
    navigate("/");
  }, [completeOnboarding, navigate]);

  const handleSkip = useCallback(async () => {
    setShowTour(false);
    await completeOnboarding();
  }, [completeOnboarding]);

  if (!showTour) return null;

  const step = tourSteps[currentStep];
  const isCenterStep = step.position === "center";

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay with spotlight effect */}
      <div 
        className={cn(
          "absolute inset-0 transition-all duration-300",
          isCenterStep 
            ? "bg-background/90 backdrop-blur-md" 
            : "bg-background/70 backdrop-blur-sm"
        )}
        onClick={(e) => e.stopPropagation()}
      />
      
      {/* Spotlight effect for non-center steps */}
      {!isCenterStep && (
        <div className="absolute bottom-16 left-0 right-0 h-20 bg-gradient-to-t from-transparent via-primary/10 to-transparent animate-pulse" />
      )}
      
      {/* Tour Card */}
      <div 
        className={cn(
          "absolute transition-all duration-500 ease-out",
          isCenterStep 
            ? "inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[420px]"
            : step.position === "top"
              ? "inset-x-4 bottom-24 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[400px]"
              : "inset-x-4 top-20 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[400px]"
        )}
      >
        <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
          
          {/* Close button */}
          <button 
            onClick={handleSkip}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground z-10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Step indicator */}
          <div className="flex gap-1 mb-5">
            {tourSteps.map((_, index) => (
              <div 
                key={index}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all duration-300",
                  index < currentStep 
                    ? "bg-primary" 
                    : index === currentStep 
                      ? "bg-primary animate-pulse" 
                      : "bg-border"
                )}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="text-4xl mb-3">{step.icon}</div>

          {/* Content */}
          <h3 className="text-xl font-bold text-foreground mb-3 relative z-10">
            {step.title}
          </h3>
          <p className="text-muted-foreground mb-6 relative z-10 leading-relaxed">
            {step.description}
          </p>

          {/* Navigation */}
          <div className="flex items-center justify-between relative z-10">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            <span className="text-sm text-muted-foreground font-medium">
              {currentStep + 1} / {tourSteps.length}
            </span>

            <Button 
              onClick={handleNext} 
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {currentStep === tourSteps.length - 1 ? (
                <>
                  <Sparkles className="h-4 w-4 mr-1" />
                  Get Started
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>

          {/* Skip link */}
          {currentStep < tourSteps.length - 1 && (
            <button 
              onClick={handleSkip}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground mt-4 transition-colors"
            >
              Skip tour
            </button>
          )}
        </div>
      </div>
    </div>
  );
}