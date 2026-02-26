import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TourStep {
  title: string;
  description: string;
  target?: string; // CSS selector
  icon: string;
}

const tourSteps: TourStep[] = [
  {
    title: "Welcome to BlackPAL! 🚀",
    description: "Let's take a quick tour of your dashboard. You'll discover powerful tools for trading, achievements, and community.",
    icon: "🏠",
  },
  {
    title: "Your Profile Card",
    description: "View your rank, XP, avatar, and citizenship status. Click to edit your profile anytime.",
    icon: "👤",
  },
  {
    title: "XP Reactor",
    description: "Track your experience points in real-time. Complete challenges and trades to level up faster.",
    icon: "⚡",
  },
  {
    title: "Achievements Carousel",
    description: "Browse your earned badges and discover new ones to unlock. Combine them for bonus multipliers!",
    icon: "🏆",
  },
  {
    title: "Streak Tracker",
    description: "Maintain daily login streaks to earn bonus XP and exclusive rewards.",
    icon: "🔥",
  },
  {
    title: "Navigation Bar",
    description: "Access all BlackPAL features: BlackBoard for learning, BlackVault for your portfolio, BlackArena for competitions, and more.",
    icon: "🧭",
  },
  {
    title: "You're All Set!",
    description: "Explore, trade, and climb the leaderboard. Your journey to the top starts now!",
    icon: "🎉",
  },
];

const TOUR_KEY = "blackpal-tour-completed";

export const OnboardingTour = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_KEY);
    if (!completed) {
      // Delay tour start so dashboard loads first
      const timer = setTimeout(() => setIsActive(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const completeTour = () => {
    setIsActive(false);
    localStorage.setItem(TOUR_KEY, "true");
  };

  const next = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      completeTour();
    }
  };

  const prev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  if (!isActive) return null;

  const step = tourSteps[currentStep];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={completeTour} />

        {/* Tour Card */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative z-10 glass-strong p-6 sm:p-8 rounded-2xl max-w-md w-[90%] border border-primary/30 shadow-depth-xl"
        >
          {/* Close */}
          <Button
            variant="ghost"
            size="icon"
            onClick={completeTour}
            className="absolute top-3 right-3 h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Icon */}
          <div className="text-4xl mb-4">{step.icon}</div>

          {/* Content */}
          <h3 className="text-xl font-bold mb-2 gradient-text-cyber">{step.title}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">{step.description}</p>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5 mb-5">
            {tourSteps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? "w-6 bg-primary"
                    : i < currentStep
                    ? "w-1.5 bg-primary/50"
                    : "w-1.5 bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={prev}
              disabled={currentStep === 0}
              className="text-muted-foreground"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            <Button size="sm" onClick={next} className="gap-1">
              {currentStep === tourSteps.length - 1 ? (
                <>
                  <Sparkles className="h-4 w-4" />
                  Let's Go!
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
