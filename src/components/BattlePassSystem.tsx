import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Sword, Star, Crown, Lock, Gift, Sparkles, 
  ChevronRight, Zap, Trophy, Medal
} from "lucide-react";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface BattlePassReward {
  id: string;
  level_required: number;
  is_premium: boolean;
  reward_type: string;
  reward_value: any;
  reward_name: string;
  reward_description: string;
  reward_icon: string;
}

interface UserBattlePass {
  id: string;
  current_level: number;
  current_xp: number;
  is_premium: boolean;
  claimed_rewards: string[];
}

// Mock rewards for display
const mockRewards: BattlePassReward[] = Array.from({ length: 100 }, (_, i) => ({
  id: `reward-${i + 1}`,
  level_required: i + 1,
  is_premium: i % 3 === 0,
  reward_type: ["xp", "currency", "badge", "title", "avatar"][i % 5],
  reward_value: { amount: (i + 1) * 100 },
  reward_name: `Level ${i + 1} Reward`,
  reward_description: `Unlock at level ${i + 1}`,
  reward_icon: ["⚡", "💰", "🏆", "👑", "🎨"][i % 5],
}));

export const BattlePassSystem = () => {
  const [userPass, setUserPass] = useState<UserBattlePass | null>(null);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const XP_PER_LEVEL = 1000;

  useEffect(() => {
    fetchUserBattlePass();
  }, []);

  const fetchUserBattlePass = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // For demo, create mock user pass
    setUserPass({
      id: "mock",
      current_level: 15,
      current_xp: 450,
      is_premium: false,
      claimed_rewards: ["reward-1", "reward-2", "reward-3"],
    });
    setLoading(false);
  };

  const claimReward = async (reward: BattlePassReward) => {
    if (!userPass) return;
    
    if (userPass.current_level < reward.level_required) {
      toast({
        title: "Level Required",
        description: `Reach level ${reward.level_required} to claim this reward`,
        variant: "destructive",
      });
      return;
    }

    if (reward.is_premium && !userPass.is_premium) {
      toast({
        title: "Premium Required",
        description: "Upgrade to Premium Pass to claim this reward",
        variant: "destructive",
      });
      return;
    }

    if (userPass.claimed_rewards.includes(reward.id)) {
      toast({
        title: "Already Claimed",
        description: "You've already claimed this reward",
      });
      return;
    }

    // Mock claim
    setUserPass({
      ...userPass,
      claimed_rewards: [...userPass.claimed_rewards, reward.id],
    });

    toast({
      title: "Reward Claimed! 🎉",
      description: `You received: ${reward.reward_name}`,
    });
  };

  const upgradeToPremium = () => {
    setUserPass(prev => prev ? { ...prev, is_premium: true } : null);
    toast({
      title: "Premium Unlocked! 👑",
      description: "You now have access to all premium rewards!",
    });
  };

  const currentLevelProgress = userPass ? (userPass.current_xp / XP_PER_LEVEL) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading Battle Pass...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Season Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600/20 via-primary/20 to-blue-600/20 border border-primary/30 p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-transparent to-blue-600/10" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-primary/20">
              <Sword className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Season 1: Genesis</h2>
              <p className="text-muted-foreground">The journey begins...</p>
            </div>
            <Badge className="ml-auto" variant="outline">
              45 days left
            </Badge>
          </div>

          {/* Level Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                Level {userPass?.current_level || 1}
              </span>
              <span className="text-muted-foreground">
                {userPass?.current_xp || 0} / {XP_PER_LEVEL} XP
              </span>
            </div>
            <Progress value={currentLevelProgress} className="h-3" />
          </div>

          {/* Premium Upgrade */}
          {userPass && !userPass.is_premium && (
            <Button 
              onClick={upgradeToPremium}
              className="mt-4 bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-500 hover:to-amber-400"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Premium - $19.99
            </Button>
          )}
          {userPass?.is_premium && (
            <Badge className="mt-4 bg-gradient-to-r from-yellow-600 to-amber-500">
              <Crown className="w-3 h-3 mr-1" />
              Premium Active
            </Badge>
          )}
        </div>
      </div>

      {/* Rewards Track */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {mockRewards.slice(0, 30).map((reward, index) => {
            const isUnlocked = (userPass?.current_level || 0) >= reward.level_required;
            const isClaimed = userPass?.claimed_rewards.includes(reward.id);
            const canClaim = isUnlocked && !isClaimed && (!reward.is_premium || userPass?.is_premium);

            return (
              <motion.div
                key={reward.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => setSelectedLevel(reward.level_required)}
                className={cn(
                  "relative w-20 flex-shrink-0 cursor-pointer",
                  selectedLevel === reward.level_required && "scale-110"
                )}
              >
                {/* Level Number */}
                <div className="text-center text-xs font-medium mb-1">
                  {reward.level_required}
                </div>

                {/* Reward Card */}
                <div
                  className={cn(
                    "aspect-square rounded-xl border-2 flex flex-col items-center justify-center transition-all",
                    reward.is_premium 
                      ? "border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-amber-500/10"
                      : "border-border bg-card/50",
                    isUnlocked && "ring-2 ring-primary/50",
                    isClaimed && "opacity-50",
                    canClaim && "animate-pulse ring-2 ring-green-500"
                  )}
                >
                  {!isUnlocked ? (
                    <Lock className="w-6 h-6 text-muted-foreground" />
                  ) : isClaimed ? (
                    <span className="text-2xl opacity-50">{reward.reward_icon}</span>
                  ) : (
                    <span className="text-2xl">{reward.reward_icon}</span>
                  )}
                  
                  {reward.is_premium && (
                    <Crown className="absolute top-1 right-1 w-3 h-3 text-yellow-500" />
                  )}
                </div>

                {/* Claim indicator */}
                {canClaim && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                    <Gift className="w-2.5 h-2.5" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Selected Reward Details */}
      <Card className="border-primary/20">
        <CardContent className="p-6">
          {(() => {
            const reward = mockRewards.find(r => r.level_required === selectedLevel);
            if (!reward) return null;

            const isUnlocked = (userPass?.current_level || 0) >= reward.level_required;
            const isClaimed = userPass?.claimed_rewards.includes(reward.id);
            const canClaim = isUnlocked && !isClaimed && (!reward.is_premium || userPass?.is_premium);

            return (
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-16 h-16 rounded-xl flex items-center justify-center text-3xl",
                  reward.is_premium 
                    ? "bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border-2 border-yellow-500/30"
                    : "bg-muted"
                )}>
                  {reward.reward_icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{reward.reward_name}</h3>
                    {reward.is_premium && (
                      <Badge variant="outline" className="border-yellow-500/50 text-yellow-500">
                        <Crown className="w-3 h-3 mr-1" />
                        Premium
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {reward.reward_type === "xp" && `+${reward.reward_value.amount} XP`}
                    {reward.reward_type === "currency" && `+${reward.reward_value.amount} Coins`}
                    {reward.reward_type === "badge" && "Exclusive Badge"}
                    {reward.reward_type === "title" && "Unique Title"}
                    {reward.reward_type === "avatar" && "Avatar Item"}
                  </p>
                </div>
                <Button 
                  onClick={() => claimReward(reward)}
                  disabled={!canClaim}
                  variant={canClaim ? "default" : "outline"}
                >
                  {isClaimed ? "Claimed" : isUnlocked ? "Claim" : `Level ${reward.level_required}`}
                </Button>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
          <CardContent className="p-4 text-center">
            <Trophy className="w-6 h-6 mx-auto mb-2 text-purple-400" />
            <p className="text-2xl font-bold">{userPass?.claimed_rewards.length || 0}</p>
            <p className="text-xs text-muted-foreground">Claimed</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
          <CardContent className="p-4 text-center">
            <Gift className="w-6 h-6 mx-auto mb-2 text-green-400" />
            <p className="text-2xl font-bold">
              {mockRewards.filter(r => 
                (userPass?.current_level || 0) >= r.level_required && 
                !userPass?.claimed_rewards.includes(r.id) &&
                (!r.is_premium || userPass?.is_premium)
              ).length}
            </p>
            <p className="text-xs text-muted-foreground">Available</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500/10 to-transparent border-yellow-500/20">
          <CardContent className="p-4 text-center">
            <Medal className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
            <p className="text-2xl font-bold">{100 - (userPass?.current_level || 1)}</p>
            <p className="text-xs text-muted-foreground">To Max</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
