import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Award, Star, Sparkles, Crown } from "lucide-react";
import { calculateProfileCompletion } from "@/lib/profile-utils";

interface ProfileMilestoneBadgesProps {
  profile: any;
  size?: "sm" | "md" | "lg";
}

export function ProfileMilestoneBadges({ profile, size = "md" }: ProfileMilestoneBadgesProps) {
  const completion = calculateProfileCompletion(profile);
  
  const milestones = [
    {
      threshold: 25,
      label: "Getting Started",
      icon: Star,
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      threshold: 50,
      label: "Halfway Hero",
      icon: Sparkles,
      gradient: "from-green-500 to-emerald-500",
    },
    {
      threshold: 75,
      label: "Nearly There",
      icon: Award,
      gradient: "from-orange-500 to-amber-500",
    },
    {
      threshold: 100,
      label: "Profile Master",
      icon: Crown,
      gradient: "from-purple-500 to-pink-500",
    },
  ];

  const earnedMilestones = milestones.filter(
    (m) => completion.percentage >= m.threshold
  );

  if (earnedMilestones.length === 0) return null;

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <div className="flex flex-wrap gap-2">
      {earnedMilestones.map((milestone, index) => {
        const Icon = milestone.icon;
        return (
          <motion.div
            key={milestone.threshold}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: index * 0.1, type: "spring" }}
          >
            <Badge
              className={`bg-gradient-to-r ${milestone.gradient} text-white border-0 ${sizeClasses[size]} flex items-center gap-1.5 shadow-lg`}
            >
              <Icon className={iconSizes[size]} />
              {milestone.label}
            </Badge>
          </motion.div>
        );
      })}
      
      {completion.hasCustomTheme && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: earnedMilestones.length * 0.1, type: "spring" }}
        >
          <Badge
            className={`bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0 ${sizeClasses[size]} flex items-center gap-1.5 shadow-lg`}
          >
            <Sparkles className={iconSizes[size]} />
            Theme Master
          </Badge>
        </motion.div>
      )}
    </div>
  );
}
