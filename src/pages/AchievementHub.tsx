import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Gift, Hammer, Shield, Sparkles, Book, TrendingUp, Swords, ShoppingCart, Target, Award, Trophy, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ParticleField } from "@/components/ParticleField";
import { DailyLottery } from "@/components/DailyLottery";
import { AchievementCrafting } from "@/components/AchievementCrafting";
import { AchievementGuilds } from "@/components/AchievementGuilds";
import { AchievementTrading } from "@/components/AchievementTrading";
import { AchievementLore } from "@/components/AchievementLore";
import { AchievementEvolution } from "@/components/AchievementEvolution";
import { GuildBossBattles } from "@/components/GuildBossBattles";
import { AchievementMarketplace } from "@/components/AchievementMarketplace";
import { AchievementChallenges } from "@/components/AchievementChallenges";
import { AchievementMilestones } from "@/components/AchievementMilestones";
import { CategoryLeaderboards } from "@/components/CategoryLeaderboards";
import { AchievementCombos } from "@/components/AchievementCombos";

const AchievementHub = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/");
      return;
    }
    setUserId(user.id);
  };

  if (!userId) return null;

  return (
    <div className="min-h-screen bg-background relative">
      <ParticleField />

      {/* Header */}
      <div className="bg-gradient-to-br from-primary/20 to-accent/20 border-b relative z-10">
        <div className="max-w-7xl mx-auto p-6 space-y-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Sparkles className="h-10 w-10 text-primary" />
              Achievement Hub
            </h1>
            <p className="text-muted-foreground">
              Spin, craft, trade, and team up for exclusive achievements
            </p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6 relative z-10">
        <Tabs defaultValue="challenges" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 xl:grid-cols-12 gap-1">
            <TabsTrigger value="challenges" className="flex items-center gap-1 text-xs">
              <Target className="h-3 w-3" />
              Challenges
            </TabsTrigger>
            <TabsTrigger value="milestones" className="flex items-center gap-1 text-xs">
              <Award className="h-3 w-3" />
              Milestones
            </TabsTrigger>
            <TabsTrigger value="leaderboards" className="flex items-center gap-1 text-xs">
              <Trophy className="h-3 w-3" />
              Leaderboards
            </TabsTrigger>
            <TabsTrigger value="combos" className="flex items-center gap-1 text-xs">
              <Zap className="h-3 w-3" />
              Combos
            </TabsTrigger>
            <TabsTrigger value="lottery" className="flex items-center gap-1 text-xs">
              <Gift className="h-3 w-3" />
              Lottery
            </TabsTrigger>
            <TabsTrigger value="crafting" className="flex items-center gap-1 text-xs">
              <Hammer className="h-3 w-3" />
              Crafting
            </TabsTrigger>
            <TabsTrigger value="guilds" className="flex items-center gap-1 text-xs">
              <Shield className="h-3 w-3" />
              Guilds
            </TabsTrigger>
            <TabsTrigger value="trading" className="flex items-center gap-1 text-xs">
              <Sparkles className="h-3 w-3" />
              Trading
            </TabsTrigger>
            <TabsTrigger value="lore" className="flex items-center gap-1 text-xs">
              <Book className="h-3 w-3" />
              Lore
            </TabsTrigger>
            <TabsTrigger value="evolution" className="flex items-center gap-1 text-xs">
              <TrendingUp className="h-3 w-3" />
              Evolution
            </TabsTrigger>
            <TabsTrigger value="boss" className="flex items-center gap-1 text-xs">
              <Swords className="h-3 w-3" />
              Boss
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="flex items-center gap-1 text-xs">
              <ShoppingCart className="h-3 w-3" />
              Market
            </TabsTrigger>
          </TabsList>

          <TabsContent value="challenges">
            <AchievementChallenges userId={userId} />
          </TabsContent>

          <TabsContent value="milestones">
            <AchievementMilestones userId={userId} />
          </TabsContent>

          <TabsContent value="leaderboards">
            <CategoryLeaderboards userId={userId} />
          </TabsContent>

          <TabsContent value="combos">
            <AchievementCombos userId={userId} />
          </TabsContent>

          <TabsContent value="lottery">
            <DailyLottery userId={userId} />
          </TabsContent>

          <TabsContent value="crafting">
            <AchievementCrafting userId={userId} />
          </TabsContent>

          <TabsContent value="guilds">
            <AchievementGuilds userId={userId} />
          </TabsContent>

          <TabsContent value="trading">
            <AchievementTrading userId={userId} />
          </TabsContent>

          <TabsContent value="lore">
            <AchievementLore userId={userId} />
          </TabsContent>

          <TabsContent value="evolution">
            <AchievementEvolution userId={userId} />
          </TabsContent>

          <TabsContent value="boss">
            <GuildBossBattles userId={userId} />
          </TabsContent>

          <TabsContent value="marketplace">
            <AchievementMarketplace userId={userId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AchievementHub;
