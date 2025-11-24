import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pin } from "lucide-react";

interface ProfileShowcaseDisplayProps {
  profile: any;
}

export function ProfileShowcaseDisplay({ profile }: ProfileShowcaseDisplayProps) {
  // Parse pinned badges
  const pinnedBadgesData = profile?.profile_badge ? 
    (typeof profile.profile_badge === 'string' ? JSON.parse(profile.profile_badge) : profile.profile_badge) : 
    [];
  
  const pinnedBadges = Array.isArray(pinnedBadgesData) ? pinnedBadgesData : [];

  if (pinnedBadges.length === 0) return null;

  const getBadgeInfo = (badgeId: string) => {
    const badges: Record<string, { label: string; gradient: string }> = {
      getting_started: { label: "Getting Started", gradient: "from-blue-500 to-cyan-500" },
      halfway_hero: { label: "Halfway Hero", gradient: "from-green-500 to-emerald-500" },
      nearly_there: { label: "Nearly There", gradient: "from-orange-500 to-amber-500" },
      profile_master: { label: "Profile Master", gradient: "from-purple-500 to-pink-500" },
      theme_master: { label: "Theme Master", gradient: "from-violet-500 to-purple-500" },
    };
    return badges[badgeId] || { label: badgeId, gradient: "from-gray-500 to-gray-600" };
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Pin className="w-5 h-5 text-primary fill-current" />
          Pinned Achievements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {pinnedBadges.map((badgeId, index) => {
            const badgeInfo = getBadgeInfo(badgeId);
            return (
              <motion.div
                key={badgeId}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Badge
                  className={`bg-gradient-to-r ${badgeInfo.gradient} text-white border-0 px-4 py-2 text-sm shadow-lg`}
                >
                  {badgeInfo.label}
                </Badge>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
