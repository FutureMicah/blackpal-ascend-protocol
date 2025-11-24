import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pin, PinOff, Trophy, Star, Award, Crown, Sparkles } from "lucide-react";
import { calculateProfileCompletion } from "@/lib/profile-utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ProfileShowcaseProps {
  profile: any;
  userId: string;
  onUpdate?: () => void;
}

interface MilestoneBadge {
  id: string;
  threshold: number;
  label: string;
  icon: React.ComponentType<any>;
  gradient: string;
  isPinned: boolean;
}

export function ProfileShowcase({ profile, userId, onUpdate }: ProfileShowcaseProps) {
  const completion = calculateProfileCompletion(profile);
  const { toast } = useToast();
  
  // Parse pinned badges from profile (stored as array in profile_badge field)
  const pinnedBadgesData = profile?.profile_badge ? 
    (typeof profile.profile_badge === 'string' ? JSON.parse(profile.profile_badge) : profile.profile_badge) : 
    [];
  
  const [pinnedBadges, setPinnedBadges] = useState<string[]>(Array.isArray(pinnedBadgesData) ? pinnedBadgesData : []);

  const milestones: MilestoneBadge[] = [
    {
      id: "getting_started",
      threshold: 25,
      label: "Getting Started",
      icon: Star,
      gradient: "from-blue-500 to-cyan-500",
      isPinned: pinnedBadges.includes("getting_started"),
    },
    {
      id: "halfway_hero",
      threshold: 50,
      label: "Halfway Hero",
      icon: Sparkles,
      gradient: "from-green-500 to-emerald-500",
      isPinned: pinnedBadges.includes("halfway_hero"),
    },
    {
      id: "nearly_there",
      threshold: 75,
      label: "Nearly There",
      icon: Award,
      gradient: "from-orange-500 to-amber-500",
      isPinned: pinnedBadges.includes("nearly_there"),
    },
    {
      id: "profile_master",
      threshold: 100,
      label: "Profile Master",
      icon: Crown,
      gradient: "from-purple-500 to-pink-500",
      isPinned: pinnedBadges.includes("profile_master"),
    },
  ];

  const themeMaster = {
    id: "theme_master",
    label: "Theme Master",
    icon: Sparkles,
    gradient: "from-violet-500 to-purple-500",
    isPinned: pinnedBadges.includes("theme_master"),
  };

  const earnedMilestones = milestones.filter((m) => completion.percentage >= m.threshold);
  const allAvailableBadges = [
    ...earnedMilestones,
    ...(completion.hasCustomTheme ? [themeMaster] : []),
  ];

  const togglePin = async (badgeId: string) => {
    const isCurrentlyPinned = pinnedBadges.includes(badgeId);
    
    // Limit to 3 pinned badges
    if (!isCurrentlyPinned && pinnedBadges.length >= 3) {
      toast({
        title: "Maximum Pins Reached",
        description: "You can pin up to 3 badges. Unpin one first.",
        variant: "destructive",
      });
      return;
    }

    const newPinnedBadges = isCurrentlyPinned
      ? pinnedBadges.filter((id) => id !== badgeId)
      : [...pinnedBadges, badgeId];

    try {
      // Update in database
      const { error } = await supabase
        .from("profiles")
        .update({ profile_badge: JSON.stringify(newPinnedBadges) })
        .eq("id", userId);

      if (error) throw error;

      setPinnedBadges(newPinnedBadges);
      toast({
        title: isCurrentlyPinned ? "Badge Unpinned" : "Badge Pinned",
        description: isCurrentlyPinned
          ? "Badge removed from your showcase"
          : "Badge added to your showcase!",
      });
      
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (allAvailableBadges.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6 text-center">
          <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <h3 className="font-bold text-lg mb-2">No Badges Yet</h3>
          <p className="text-sm text-muted-foreground">
            Complete your profile to unlock milestone badges!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Achievement Showcase
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Pin up to 3 badges to display on your public profile
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pinned Badges */}
        {pinnedBadges.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Pinned Badges</h4>
            <div className="flex flex-wrap gap-2">
              {allAvailableBadges
                .filter((badge) => pinnedBadges.includes(badge.id))
                .map((badge, index) => {
                  const Icon = badge.icon;
                  return (
                    <motion.div
                      key={badge.id}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Badge
                        className={`bg-gradient-to-r ${badge.gradient} text-white border-0 px-3 py-2 text-sm flex items-center gap-2 shadow-lg cursor-pointer`}
                        onClick={() => togglePin(badge.id)}
                      >
                        <Pin className="w-3 h-3 fill-current" />
                        <Icon className="w-4 h-4" />
                        {badge.label}
                      </Badge>
                    </motion.div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Available Badges */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">
            Available Badges ({allAvailableBadges.length})
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {allAvailableBadges.map((badge, index) => {
              const Icon = badge.icon;
              const isPinned = pinnedBadges.includes(badge.id);
              
              return (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={`border-border/50 hover:border-primary/50 transition-all ${isPinned ? 'ring-2 ring-primary' : ''}`}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${badge.gradient} flex items-center justify-center`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{badge.label}</p>
                          {'threshold' in badge && (
                            <p className="text-xs text-muted-foreground">
                              {badge.threshold}% Profile Completion
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        variant={isPinned ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => togglePin(badge.id)}
                      >
                        {isPinned ? (
                          <>
                            <PinOff className="w-3 h-3 mr-1" />
                            Unpin
                          </>
                        ) : (
                          <>
                            <Pin className="w-3 h-3 mr-1" />
                            Pin
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
