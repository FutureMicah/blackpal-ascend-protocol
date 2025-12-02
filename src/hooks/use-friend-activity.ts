import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

type ActivityType = 'achievement' | 'level_up' | 'streak' | 'profile_update' | 'payment' | 'milestone';

interface ActivityData {
  title?: string;
  description?: string;
  icon?: string;
  xp_earned?: number;
  level?: number;
  streak?: number;
  achievement_name?: string;
  milestone_name?: string;
}

export const useFriendActivity = () => {
  const postActivity = async (
    userId: string,
    activityType: ActivityType,
    activityData: ActivityData = {}
  ) => {
    try {
      const { error } = await supabase
        .from('friend_activities')
        .insert([{
          user_id: userId,
          activity_type: activityType,
          activity_data: activityData as Json
        }]);

      if (error) {
        console.error('Error posting activity:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Failed to post activity:', err);
      return false;
    }
  };

  const postAchievementActivity = async (
    userId: string,
    achievementName: string,
    xpEarned?: number
  ) => {
    return postActivity(userId, 'achievement', {
      achievement_name: achievementName,
      xp_earned: xpEarned,
      description: `Unlocked "${achievementName}"`
    });
  };

  const postLevelUpActivity = async (
    userId: string,
    newLevel: number
  ) => {
    return postActivity(userId, 'level_up', {
      level: newLevel,
      description: `Reached level ${newLevel}`
    });
  };

  const postStreakActivity = async (
    userId: string,
    streakDays: number
  ) => {
    return postActivity(userId, 'streak', {
      streak: streakDays,
      description: `On a ${streakDays} day streak`
    });
  };

  const postMilestoneActivity = async (
    userId: string,
    milestoneName: string,
    xpEarned?: number
  ) => {
    return postActivity(userId, 'milestone', {
      milestone_name: milestoneName,
      xp_earned: xpEarned,
      description: `Achieved "${milestoneName}"`
    });
  };

  const postProfileUpdateActivity = async (userId: string) => {
    return postActivity(userId, 'profile_update', {
      description: 'Updated their profile'
    });
  };

  const postPaymentActivity = async (userId: string) => {
    return postActivity(userId, 'payment', {
      description: 'Completed payment activation'
    });
  };

  return {
    postActivity,
    postAchievementActivity,
    postLevelUpActivity,
    postStreakActivity,
    postMilestoneActivity,
    postProfileUpdateActivity,
    postPaymentActivity
  };
};
