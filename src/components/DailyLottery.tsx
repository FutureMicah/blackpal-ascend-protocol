import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Gift, Star, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DailyLotteryProps {
  userId: string;
}

export const DailyLottery = ({ userId }: DailyLotteryProps) => {
  const [spinsRemaining, setSpinsRemaining] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wonPrize, setWonPrize] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkDailySpins();
  }, [userId]);

  const checkDailySpins = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      let { data: spinData, error } = await supabase
        .from("daily_lottery_spins")
        .select("*")
        .eq("user_id", userId)
        .eq("last_spin_date", today)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (!spinData) {
        // Create new daily spin entry
        const { data: newSpin } = await supabase
          .from("daily_lottery_spins")
          .insert({
            user_id: userId,
            last_spin_date: today,
            spins_remaining: 3,
          })
          .select()
          .single();

        setSpinsRemaining(newSpin?.spins_remaining || 3);
      } else {
        setSpinsRemaining(spinData.spins_remaining);
      }
    } catch (error) {
      console.error("Error checking spins:", error);
    } finally {
      setLoading(false);
    }
  };

  const performSpin = async () => {
    if (spinsRemaining <= 0) {
      toast({
        title: "No spins left",
        description: "Come back tomorrow for more spins!",
        variant: "destructive",
      });
      return;
    }

    setIsSpinning(true);
    setWonPrize(null);

    try {
      // Get lottery prizes with weights
      const { data: prizes } = await supabase
        .from("lottery_prizes")
        .select(`
          *,
          achievements (
            id,
            name,
            icon,
            rarity,
            xp_reward
          )
        `)
        .eq("is_active", true);

      if (!prizes || prizes.length === 0) {
        toast({
          title: "No prizes available",
          description: "Check back later!",
          variant: "destructive",
        });
        setIsSpinning(false);
        return;
      }

      // Weighted random selection
      const totalWeight = prizes.reduce((sum, p) => sum + p.rarity_weight, 0);
      let random = Math.random() * totalWeight;
      let selectedPrize = prizes[0];

      for (const prize of prizes) {
        random -= prize.rarity_weight;
        if (random <= 0) {
          selectedPrize = prize;
          break;
        }
      }

      // Simulate spin animation delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Award the achievement
      const { error: awardError } = await supabase
        .from("user_achievements")
        .insert({
          user_id: userId,
          achievement_id: selectedPrize.achievements.id,
        });

      if (awardError && awardError.code !== '23505') {
        throw awardError;
      }

      // Update XP
      const { data: profile } = await supabase
        .from("profiles")
        .select("xp_points")
        .eq("id", userId)
        .single();

      await supabase
        .from("profiles")
        .update({ 
          xp_points: (profile?.xp_points || 0) + selectedPrize.achievements.xp_reward 
        })
        .eq("id", userId);

      // Update spins remaining
      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from("daily_lottery_spins")
        .update({ spins_remaining: spinsRemaining - 1 })
        .eq("user_id", userId)
        .eq("last_spin_date", today);

      setWonPrize(selectedPrize.achievements);
      setSpinsRemaining(prev => prev - 1);

      toast({
        title: "🎉 You won!",
        description: `${selectedPrize.achievements.icon} ${selectedPrize.achievements.name}`,
        duration: 5000,
      });
    } catch (error: any) {
      console.error("Error spinning:", error);
      if (error.code === '23505') {
        toast({
          title: "Already unlocked",
          description: "You already have this achievement! Better luck next time.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to perform spin",
          variant: "destructive",
        });
      }
    } finally {
      setIsSpinning(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "legendary": return "from-amber-500 to-orange-500";
      case "epic": return "from-violet-500 to-purple-500";
      case "rare": return "from-blue-500 to-cyan-500";
      default: return "from-slate-500 to-slate-600";
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">Loading lottery...</div>
      </Card>
    );
  }

  return (
    <Card className="p-8 bg-gradient-to-br from-primary/10 to-accent/10">
      <div className="text-center space-y-6">
        <div className="flex items-center justify-center gap-3">
          <Gift className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-bold">Daily Lucky Draw</h2>
        </div>

        <p className="text-muted-foreground">
          Spin for a chance to win rare achievements!
        </p>

        <div className="flex items-center justify-center gap-2">
          <Badge variant="secondary" className="text-lg px-4 py-2">
            <Sparkles className="h-4 w-4 mr-2" />
            {spinsRemaining} spins remaining
          </Badge>
        </div>

        {/* Spinning Animation */}
        <div className="relative h-64 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {isSpinning ? (
              <motion.div
                key="spinning"
                initial={{ scale: 0, rotate: 0 }}
                animate={{ scale: 1, rotate: 360 }}
                exit={{ scale: 0 }}
                transition={{ duration: 2, ease: "easeInOut" }}
                className="absolute"
              >
                <div className="w-32 h-32 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
                  <Sparkles className="h-16 w-16 text-white animate-pulse" />
                </div>
              </motion.div>
            ) : wonPrize ? (
              <motion.div
                key="prize"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
                className={`absolute bg-gradient-to-r ${getRarityColor(wonPrize.rarity)} p-8 rounded-2xl text-white`}
              >
                <div className="text-center space-y-3">
                  <div className="text-6xl">{wonPrize.icon}</div>
                  <div className="font-bold text-xl">{wonPrize.name}</div>
                  <Badge className="bg-white/20">+{wonPrize.xp_reward} XP</Badge>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-6xl"
              >
                <Gift className="h-32 w-32 text-primary/30" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Button
          size="lg"
          onClick={performSpin}
          disabled={isSpinning || spinsRemaining <= 0}
          className="w-full max-w-sm text-lg h-14"
        >
          {isSpinning ? (
            <>
              <Sparkles className="mr-2 h-5 w-5 animate-spin" />
              Spinning...
            </>
          ) : spinsRemaining > 0 ? (
            <>
              <Star className="mr-2 h-5 w-5" />
              Spin Now!
            </>
          ) : (
            "Come Back Tomorrow"
          )}
        </Button>

        {spinsRemaining === 0 && (
          <p className="text-sm text-muted-foreground">
            Daily spins reset at midnight. Check back tomorrow!
          </p>
        )}
      </div>
    </Card>
  );
};
