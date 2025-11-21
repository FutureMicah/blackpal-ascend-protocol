import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Gift, Hammer, Shield, Sparkles, Book, TrendingUp, Swords, ShoppingCart } from "lucide-react";
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
        <Tabs defaultValue="lottery" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 gap-2">
            <TabsTrigger value="lottery" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Lottery
            </TabsTrigger>
            <TabsTrigger value="crafting" className="flex items-center gap-2">
              <Hammer className="h-4 w-4" />
              Crafting
            </TabsTrigger>
            <TabsTrigger value="guilds" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Guilds
            </TabsTrigger>
            <TabsTrigger value="trading" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Trading
            </TabsTrigger>
            <TabsTrigger value="lore" className="flex items-center gap-2">
              <Book className="h-4 w-4" />
              Lore
            </TabsTrigger>
            <TabsTrigger value="evolution" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Evolution
            </TabsTrigger>
            <TabsTrigger value="boss" className="flex items-center gap-2">
              <Swords className="h-4 w-4" />
              Boss Battles
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Marketplace
            </TabsTrigger>
          </TabsList>

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
