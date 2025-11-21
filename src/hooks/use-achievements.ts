import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AwardAchievementParams {
  user_id: string;
  event_type: 'profile_complete' | 'payment_complete' | 'level_reach' | 'xp_total' | 'trades_complete' | 'referrals' | 'gear_collected' | 'vault_first_access' | 'streak_milestone';
  event_data?: {
    level?: number;
    xp_total?: number;
    trades_count?: number;
    referrals_count?: number;
    gear_count?: number;
    streak_days?: number;
  };
}

export interface AwardedAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  xp_reward: number;
  cinematic_id: string | null;
  combo?: {
    size: number;
    bonus_xp: number;
    category: string;
  } | null;
}

export const useAchievements = () => {
  const { toast } = useToast();

  const checkAndAwardAchievements = async (params: AwardAchievementParams): Promise<AwardedAchievement[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('award-achievement', {
        body: params
      });

      if (error) {
        console.error('Error checking achievements:', error);
        return [];
      }

      if (data?.achievements && data.achievements.length > 0) {
        // Show toast for first achievement (could enhance to show all)
        const firstAchievement = data.achievements[0];
        toast({
          title: `🎉 Achievement Unlocked!`,
          description: `${firstAchievement.icon} ${firstAchievement.name}`,
          duration: 5000,
        });

        console.log(`Awarded ${data.achievements.length} achievements:`, data.achievements);
      }

      return data?.achievements || [];
    } catch (err) {
      console.error('Failed to check achievements:', err);
      return [];
    }
  };

  return {
    checkAndAwardAchievements
  };
};
