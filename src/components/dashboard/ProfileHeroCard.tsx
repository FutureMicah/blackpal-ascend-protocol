import { motion } from "framer-motion";
import { PremiumAvatar } from "@/components/PremiumAvatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, LogOut, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { PremiumBadges } from "@/components/PremiumBadges";
import { ProfileEdit } from "@/components/ProfileEdit";
import { useState, useEffect } from "react";

interface ProfileHeroCardProps {
  profile: any;
  user: any;
  onProfileUpdate?: () => void;
}

export const ProfileHeroCard = ({ profile, user, onProfileUpdate }: ProfileHeroCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [featuredAchievements, setFeaturedAchievements] = useState<any[]>([]);

  useEffect(() => {
    loadFeaturedAchievements();
  }, [user.id]);

  const loadFeaturedAchievements = async () => {
    try {
      const { data, error } = await supabase
        .from("user_achievements")
        .select(`
          achievement_id,
          achievements (
            id,
            name,
            icon,
            rarity
          )
        `)
        .eq("user_id", user.id)
        .limit(5);

      if (error) throw error;

      const achievements = data?.map((ua: any) => ua.achievements).filter(Boolean) || [];
      setFeaturedAchievements(achievements);
    } catch (error) {
      console.error("Error loading featured achievements:", error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully",
    });
    navigate("/");
  };

  const getRankColor = (tier: string) => {
    if (!tier) return "from-violet-500 to-purple-500";
    if (tier === "NIGERIA") return "from-green-500 to-emerald-500";
    if (tier === "AFRICA") return "from-orange-500 to-amber-500";
    return "from-violet-500 to-purple-500";
  };

  return (
    <motion.div
      className="glass-card p-6 space-y-6"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 }}
    >
      {/* Avatar */}
      <div className="flex justify-center">
        <PremiumAvatar
          src={profile.avatar_url || undefined}
          alt={profile.display_name}
          size={140}
        />
      </div>

      {/* Name & Handle */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-foreground">
          {profile.display_name}
        </h1>
        {profile.username && (
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
        )}
      </div>

      {/* Citizenship Badge */}
      <div className="flex justify-center">
        <Badge
          className={`bg-gradient-to-r ${getRankColor(profile.payment_tier)} text-white border-0 px-4 py-2`}
        >
          <span className="font-semibold">
            {profile.citizenship_rank || "Visitor"} • Rank {profile.rank_level || 1}
          </span>
        </Badge>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="text-sm text-muted-foreground text-center line-clamp-3">
          {profile.bio}
        </p>
      )}

      {/* Featured Achievements */}
      {featuredAchievements.length > 0 && (
        <PremiumBadges achievements={featuredAchievements} />
      )}

      {/* Edit Profile Button */}
      <ProfileEdit 
        profile={profile} 
        onUpdate={() => onProfileUpdate?.()} 
      />

      {/* Meta Info */}
      <div className="space-y-2 text-sm">
        {profile.country && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{profile.country}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border">
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">
            {profile.xp_points || 0}
          </div>
          <div className="text-xs text-muted-foreground">XP</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">
            {profile.rank_level || 1}
          </div>
          <div className="text-xs text-muted-foreground">Level</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">
            {profile.streak_days || 0}
          </div>
          <div className="text-xs text-muted-foreground">Streak</div>
        </div>
      </div>

      {/* Connect to Cinematic Core */}
      <Button
        variant="default"
        className="w-full"
        onClick={() => window.open("https://blackpal-cinematic-core.lovable.app/", "_blank")}
      >
        <ExternalLink className="w-4 h-4 mr-2" />
        Cinematic Core
      </Button>

      {/* Sign Out */}
      <Button
        variant="outline"
        className="w-full"
        onClick={handleSignOut}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>
    </motion.div>
  );
};
