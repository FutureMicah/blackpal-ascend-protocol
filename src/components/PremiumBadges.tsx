import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Award } from "lucide-react";

interface Achievement {
  id: string;
  name: string;
  icon: string;
  rarity: string;
}

interface PremiumBadgesProps {
  achievements: Achievement[];
}

export const PremiumBadges = ({ achievements }: PremiumBadgesProps) => {
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "mythic":
        return "from-purple-500 to-pink-500";
      case "legendary":
        return "from-amber-500 to-orange-500";
      case "epic":
        return "from-violet-500 to-purple-500";
      case "rare":
        return "from-blue-500 to-cyan-500";
      default:
        return "from-slate-500 to-slate-600";
    }
  };

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case "mythic":
        return <Star className="h-3 w-3" />;
      case "legendary":
        return <Trophy className="h-3 w-3" />;
      default:
        return <Award className="h-3 w-3" />;
    }
  };

  // Show top 3 most impressive achievements
  const featuredAchievements = achievements
    .sort((a, b) => {
      const rarityOrder = { mythic: 4, legendary: 3, epic: 2, rare: 1, common: 0 };
      return (rarityOrder[b.rarity as keyof typeof rarityOrder] || 0) - 
             (rarityOrder[a.rarity as keyof typeof rarityOrder] || 0);
    })
    .slice(0, 3);

  if (featuredAchievements.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Trophy className="h-4 w-4" />
        <span>Featured Achievements</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {featuredAchievements.map((achievement, index) => (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <Badge
              className={`bg-gradient-to-r ${getRarityColor(achievement.rarity)} text-white border-0 px-3 py-1.5 flex items-center gap-2`}
            >
              <span className="text-base">{achievement.icon}</span>
              {getRarityIcon(achievement.rarity)}
              <span className="text-xs font-medium">{achievement.name}</span>
            </Badge>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
