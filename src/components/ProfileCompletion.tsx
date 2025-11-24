import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Award, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { calculateProfileCompletion, EnhancedProfileCompletion } from "@/lib/profile-utils";
import { useAchievements } from "@/hooks/use-achievements";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";

interface ProfileCompletionProps {
  profile: any;
  onRefresh?: () => void;
}

export function ProfileCompletion({ profile, onRefresh }: ProfileCompletionProps) {
  const [completion, setCompletion] = useState<EnhancedProfileCompletion | null>(null);
  const [hasAwardedCompletion, setHasAwardedCompletion] = useState(false);
  const [hasAwardedTheme, setHasAwardedTheme] = useState(false);
  const [hasFiredConfetti, setHasFiredConfetti] = useState(false);
  const { checkAndAwardAchievements } = useAchievements();

  const fireConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval: any = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  };

  useEffect(() => {
    if (profile) {
      const status = calculateProfileCompletion(profile);
      setCompletion(status);

      // Award achievements for completion
      const awardCompletionAchievements = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Award for 100% profile completion
        if (status.isComplete && !hasAwardedCompletion) {
          await checkAndAwardAchievements({
            user_id: user.id,
            event_type: "profile_complete",
          });
          setHasAwardedCompletion(true);
          if (!hasFiredConfetti) {
            fireConfetti();
            setHasFiredConfetti(true);
          }
          onRefresh?.();
        }

        // Award for theme customization
        if (status.hasCustomTheme && !hasAwardedTheme) {
          await checkAndAwardAchievements({
            user_id: user.id,
            event_type: "profile_complete",
          });
          setHasAwardedTheme(true);
          if (!hasFiredConfetti) {
            fireConfetti();
            setHasFiredConfetti(true);
          }
          onRefresh?.();
        }
      };

      awardCompletionAchievements();
    }
  }, [profile, hasAwardedCompletion, hasAwardedTheme]);

  if (!completion) return null;

  const getMilestoneReward = (percentage: number) => {
    if (percentage === 100) return { xp: 100, badge: "Profile Master" };
    if (percentage >= 75) return { xp: 50, badge: "Nearly There" };
    if (percentage >= 50) return { xp: 25, badge: "Halfway Hero" };
    if (percentage >= 25) return { xp: 10, badge: "Getting Started" };
    return null;
  };

  const reward = getMilestoneReward(completion.percentage);

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Profile Completion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">{completion.percentage}% Complete</span>
            {reward && (
              <Badge variant="outline" className="text-xs">
                +{reward.xp} XP
              </Badge>
            )}
          </div>
          <Progress value={completion.percentage} className="h-3" />
        </div>

        {/* Completion Status */}
        {completion.isComplete ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center"
          >
            <Award className="w-12 h-12 text-primary mx-auto mb-2" />
            <p className="font-bold text-primary">Profile Complete!</p>
            <p className="text-sm text-muted-foreground">
              You've unlocked the Profile Master badge
            </p>
          </motion.div>
        ) : (
          <>
            {/* Completed Fields */}
            {completion.completedFields.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">Completed</p>
                <div className="space-y-1">
                  {completion.completedFields.map((field) => (
                    <motion.div
                      key={field}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2 text-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span>{field}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Fields */}
            {completion.missingFields.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">To Complete</p>
                <div className="space-y-1">
                  {completion.missingFields.slice(0, 5).map((field) => (
                    <div key={field} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Circle className="w-4 h-4" />
                      <span>{field}</span>
                    </div>
                  ))}
                  {completion.missingFields.length > 5 && (
                    <p className="text-xs text-muted-foreground ml-6">
                      +{completion.missingFields.length - 5} more fields
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Theme Customization Bonus */}
        {completion.hasCustomTheme && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="bg-accent/10 border border-accent/20 rounded-lg p-3"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <p className="text-sm font-semibold">Theme Customized</p>
              <Badge variant="outline" className="ml-auto text-xs">+50 XP</Badge>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
