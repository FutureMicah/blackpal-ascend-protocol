import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Star, Lock, Check } from "lucide-react";
import { motion } from "framer-motion";

interface Combo {
  id: string;
  combo_name: string;
  combo_description: string;
  required_achievement_ids: string[];
  xp_multiplier: number;
  bonus_xp: number;
  bonus_currency: number;
  combo_badge_icon: string;
  combo_rarity: string;
  is_secret: boolean;
  is_unlocked?: boolean;
  achievements?: Array<{ name: string; icon: string }>;
  has_all_achievements?: boolean;
}

interface AchievementCombosProps {
  userId: string;
}

export const AchievementCombos = ({ userId }: AchievementCombosProps) => {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [userAchievements, setUserAchievements] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadCombos();
  }, [userId]);

  const loadCombos = async () => {
    try {
      // Fetch user's achievements
      const { data: userAchievementData } = await supabase
        .from("user_achievements")
        .select("achievement_id")
        .eq("user_id", userId);

      const achievementIds = new Set(
        userAchievementData?.map((ua) => ua.achievement_id) || []
      );
      setUserAchievements(achievementIds);

      // Fetch combos
      const { data: comboData, error: comboError } = await supabase
        .from("achievement_combos")
        .select("*")
        .order("combo_rarity");

      if (comboError) throw comboError;

      // Check which are unlocked
      const { data: unlockedData } = await supabase
        .from("user_combos")
        .select("combo_id")
        .eq("user_id", userId);

      const unlockedIds = new Set(unlockedData?.map((c) => c.combo_id) || []);

      // Enrich with achievement details
      const enrichedCombos = await Promise.all(
        (comboData || []).map(async (combo) => {
          const { data: achievements } = await supabase
            .from("achievements")
            .select("name, icon")
            .in("id", combo.required_achievement_ids);

          const hasAll = combo.required_achievement_ids.every((id) =>
            achievementIds.has(id)
          );

          return {
            ...combo,
            is_unlocked: unlockedIds.has(combo.id),
            achievements: achievements || [],
            has_all_achievements: hasAll,
          };
        })
      );

      setCombos(enrichedCombos);
    } catch (error) {
      console.error("Error loading combos:", error);
    } finally {
      setLoading(false);
    }
  };

  const unlockCombo = async (combo: Combo) => {
    if (!combo.has_all_achievements) {
      toast({
        title: "Missing Achievements",
        description: "You need all required achievements to unlock this combo!",
        variant: "destructive",
      });
      return;
    }

    try {
      // Unlock combo
      await supabase.from("user_combos").insert({
        user_id: userId,
        combo_id: combo.id,
      });

      // Award bonus rewards
      const { data: profile } = await supabase
        .from("profiles")
        .select("xp_points, virtual_currency")
        .eq("id", userId)
        .single();

      if (profile) {
        await supabase
          .from("profiles")
          .update({
            xp_points: profile.xp_points + combo.bonus_xp,
            virtual_currency: profile.virtual_currency + combo.bonus_currency,
          })
          .eq("id", userId);
      }

      toast({
        title: "Combo Unlocked! ✨",
        description: `${combo.combo_badge_icon} ${combo.combo_name} - Earned ${combo.bonus_xp} XP and ${combo.bonus_currency} currency!`,
      });

      loadCombos();
    } catch (error) {
      console.error("Error unlocking combo:", error);
      toast({
        title: "Error",
        description: "Failed to unlock combo",
        variant: "destructive",
      });
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case "common":
        return "bg-slate-500/20 border-slate-500";
      case "rare":
        return "bg-blue-500/20 border-blue-500";
      case "epic":
        return "bg-purple-500/20 border-purple-500";
      case "legendary":
        return "bg-amber-500/20 border-amber-500";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-4 bg-primary/10">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <p className="text-sm">
            Collect specific badge sets to unlock powerful combos with bonus rewards and multipliers!
          </p>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {combos.map((combo, index) => (
          <motion.div
            key={combo.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card
              className={`p-6 ${getRarityColor(combo.combo_rarity)} ${
                combo.is_unlocked ? "opacity-70" : ""
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{combo.combo_badge_icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{combo.combo_name}</h3>
                        {combo.is_unlocked && <Check className="h-5 w-5 text-green-500" />}
                        {combo.is_secret && <Lock className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <Badge variant="outline" className="mt-1">
                        {combo.combo_rarity}
                      </Badge>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">{combo.combo_description}</p>

                <div>
                  <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    Required Achievements ({combo.achievements?.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {combo.achievements?.map((achievement, idx) => (
                      <Badge
                        key={idx}
                        variant={
                          userAchievements.has(combo.required_achievement_ids[idx])
                            ? "default"
                            : "outline"
                        }
                        className="flex items-center gap-1"
                      >
                        <span>{achievement.icon}</span>
                        <span className="text-xs">{achievement.name}</span>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-background/50 space-y-1">
                  <p className="text-xs font-semibold">Rewards:</p>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {combo.xp_multiplier > 1 && (
                      <Badge variant="secondary">×{combo.xp_multiplier} XP Multiplier</Badge>
                    )}
                    {combo.bonus_xp > 0 && (
                      <Badge variant="secondary">+{combo.bonus_xp} Bonus XP</Badge>
                    )}
                    {combo.bonus_currency > 0 && (
                      <Badge variant="secondary">+{combo.bonus_currency} Currency</Badge>
                    )}
                  </div>
                </div>

                <Button
                  onClick={() => unlockCombo(combo)}
                  disabled={!combo.has_all_achievements || combo.is_unlocked}
                  className="w-full"
                >
                  {combo.is_unlocked ? (
                    "Unlocked"
                  ) : combo.has_all_achievements ? (
                    "Unlock Combo"
                  ) : (
                    `Missing ${
                      combo.required_achievement_ids.length -
                      combo.required_achievement_ids.filter((id) => userAchievements.has(id))
                        .length
                    } Achievements`
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}

        {combos.length === 0 && (
          <Card className="p-12 text-center col-span-2">
            <Sparkles className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No combos available yet</p>
          </Card>
        )}
      </div>
    </div>
  );
};
