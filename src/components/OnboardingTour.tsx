import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserSettings } from "@/hooks/useUserSettings";

interface TourStep {
  title: string;
  description: string;
  target: string;
  position: "top" | "bottom" | "left" | "right";
}

const tourSteps: TourStep[] = [
  {
    title: "Welcome to Buizly! 👋",
    description: "Your digital business card and networking CRM. Let's show you around!",
    target: "body",
    position: "bottom"
  },
  {
    title: "Your Dashboard",
    description: "See your upcoming meetings, recent connections, and activity summary at a glance.",
    target: "[data-tour='dashboard']",
    position: "bottom"
  },
  {
    title: "Your Profile & QR Code",
    description: "Share your digital business card instantly using your unique QR code. No more paper cards!",
    target: "[data-tour='profile']",
    position: "top"
  },
  {
    title: "Capture Connections",
    description: "Met someone new? Quickly save their details and add notes about your conversation.",
    target: "[data-tour='capture']",
    position: "top"
  },
  {
    title: "Schedule Follow-ups",
    description: "Never miss a follow-up! Schedule meetings and get automatic reminders.",
    target: "[data-tour='schedule']",
    position: "top"
  },
  {
    title: "Your Network",
    description: "All your professional connections in one place. Search, filter, and manage your network.",
    target: "[data-tour='network']",
    position: "top"
  }
];

export function OnboardingTour() {
  const { settings, completeOnboarding, loading } = useUserSettings();
  const [currentStep, setCurrentStep] = useState(0);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (!loading && settings && !settings.onboarding_completed) {
      setShowTour(true);
    }
  }, [settings, loading]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    setShowTour(false);
    await completeOnboarding();
  };

  const handleSkip = async () => {
    setShowTour(false);
    await completeOnboarding();
  };

  if (!showTour) return null;

  const step = tourSteps[currentStep];

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      
      {/* Tour Card */}
      <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[400px]">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
          {/* Close button */}
          <button 
            onClick={handleSkip}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Step indicator */}
          <div className="flex gap-1 mb-4">
            {tourSteps.map((_, index) => (
              <div 
                key={index}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  index <= currentStep ? "bg-primary" : "bg-border"
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <h3 className="text-xl font-bold text-foreground mb-2">
            {step.title}
          </h3>
          <p className="text-muted-foreground mb-6">
            {step.description}
          </p>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="text-muted-foreground"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            <span className="text-sm text-muted-foreground">
              {currentStep + 1} / {tourSteps.length}
            </span>

            <Button onClick={handleNext} className="bg-primary text-primary-foreground">
              {currentStep === tourSteps.length - 1 ? "Get Started" : "Next"}
              {currentStep < tourSteps.length - 1 && (
                <ChevronRight className="h-4 w-4 ml-1" />
              )}
            </Button>
          </div>

          {/* Skip link */}
          {currentStep < tourSteps.length - 1 && (
            <button 
              onClick={handleSkip}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground mt-4"
            >
              Skip tour
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
