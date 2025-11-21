import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Hammer, Plus, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Recipe {
  id: string;
  recipe_name: string;
  description: string;
  required_achievement_ids: string[];
  result_achievement_id: string;
  xp_cost: number;
  requiredAchievements?: any[];
  resultAchievement?: any;
  canCraft?: boolean;
}

interface AchievementCraftingProps {
  userId: string;
}

export const AchievementCrafting = ({ userId }: AchievementCraftingProps) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [userAchievements, setUserAchievements] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadRecipes();
  }, [userId]);

  const loadRecipes = async () => {
    try {
      // Get user's unlocked achievements
      const { data: userAchs } = await supabase
        .from("user_achievements")
        .select("achievement_id")
        .eq("user_id", userId);

      const unlockedIds = new Set(userAchs?.map(ua => ua.achievement_id) || []);
      setUserAchievements(unlockedIds);

      // Get all crafting recipes
      const { data: recipesData, error } = await supabase
        .from("crafting_recipes")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;

      // Load achievement details for each recipe
      const enrichedRecipes = await Promise.all(
        (recipesData || []).map(async (recipe) => {
          const { data: requiredAchs } = await supabase
            .from("achievements")
            .select("id, name, icon, rarity")
            .in("id", recipe.required_achievement_ids);

          const { data: resultAch } = await supabase
            .from("achievements")
            .select("id, name, icon, rarity, xp_reward")
            .eq("id", recipe.result_achievement_id)
            .single();

          const canCraft = recipe.required_achievement_ids.every((id: string) =>
            unlockedIds.has(id)
          );

          return {
            ...recipe,
            requiredAchievements: requiredAchs,
            resultAchievement: resultAch,
            canCraft,
          };
        })
      );

      setRecipes(enrichedRecipes);
    } catch (error) {
      console.error("Error loading recipes:", error);
    } finally {
      setLoading(false);
    }
  };

  const craftAchievement = async (recipe: Recipe) => {
    if (!recipe.canCraft) {
      toast({
        title: "Cannot craft",
        description: "You don't have all required achievements",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check XP
      const { data: profile } = await supabase
        .from("profiles")
        .select("xp_points")
        .eq("id", userId)
        .single();

      if (!profile || profile.xp_points < recipe.xp_cost) {
        toast({
          title: "Not enough XP",
          description: `You need ${recipe.xp_cost} XP to craft this`,
          variant: "destructive",
        });
        return;
      }

      // Craft the achievement
      const { error: craftError } = await supabase
        .from("crafted_achievements")
        .insert({
          user_id: userId,
          recipe_id: recipe.id,
          achievement_id: recipe.result_achievement_id,
        });

      if (craftError) throw craftError;

      // Award the achievement
      const { error: awardError } = await supabase
        .from("user_achievements")
        .insert({
          user_id: userId,
          achievement_id: recipe.result_achievement_id,
        });

      if (awardError && awardError.code !== '23505') throw awardError;

      // Deduct XP cost
      await supabase
        .from("profiles")
        .update({ xp_points: profile.xp_points - recipe.xp_cost })
        .eq("id", userId);

      toast({
        title: "🎉 Achievement Crafted!",
        description: `You created ${recipe.resultAchievement?.icon} ${recipe.resultAchievement?.name}`,
        duration: 5000,
      });

      loadRecipes();
    } catch (error: any) {
      console.error("Error crafting:", error);
      if (error.code === '23505') {
        toast({
          title: "Already crafted",
          description: "You already have this achievement!",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to craft achievement",
          variant: "destructive",
        });
      }
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">Loading crafting recipes...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Hammer className="h-6 w-6 text-primary" />
          Achievement Crafting
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Combine badges to create exclusive rare achievements
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {recipes.map((recipe, index) => (
          <motion.div
            key={recipe.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`p-6 ${recipe.canCraft ? "ring-2 ring-primary" : "opacity-75"}`}>
              <div className="space-y-4">
                {/* Recipe Header */}
                <div>
                  <h3 className="text-xl font-bold">{recipe.recipe_name}</h3>
                  <p className="text-sm text-muted-foreground">{recipe.description}</p>
                </div>

                {/* Required Achievements */}
                <div>
                  <p className="text-sm font-semibold mb-2">Required:</p>
                  <div className="flex flex-wrap gap-2">
                    {recipe.requiredAchievements?.map((ach) => (
                      <Badge
                        key={ach.id}
                        variant={userAchievements.has(ach.id) ? "default" : "secondary"}
                        className="flex items-center gap-1"
                      >
                        <span className="text-base">{ach.icon}</span>
                        <span className="text-xs">{ach.name}</span>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </div>

                {/* Result */}
                {recipe.resultAchievement && (
                  <div className="p-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg text-center">
                    <div className="text-4xl mb-2">{recipe.resultAchievement.icon}</div>
                    <div className="font-bold">{recipe.resultAchievement.name}</div>
                    <Badge variant="secondary" className="mt-2">
                      {recipe.resultAchievement.rarity}
                    </Badge>
                  </div>
                )}

                {/* Cost & Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Crafting Cost:</span>
                    <span className="font-bold text-primary">{recipe.xp_cost} XP</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress:</span>
                    <span className="font-bold">
                      {recipe.requiredAchievements?.filter(a => userAchievements.has(a.id)).length}/
                      {recipe.requiredAchievements?.length}
                    </span>
                  </div>
                  <Progress 
                    value={
                      (recipe.requiredAchievements?.filter(a => userAchievements.has(a.id)).length || 0) /
                      (recipe.requiredAchievements?.length || 1) * 100
                    } 
                  />
                </div>

                {/* Craft Button */}
                <Button
                  onClick={() => craftAchievement(recipe)}
                  disabled={!recipe.canCraft}
                  className="w-full"
                >
                  {recipe.canCraft ? (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Craft Now
                    </>
                  ) : (
                    "Requirements Not Met"
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {recipes.length === 0 && (
        <Card className="p-12 text-center">
          <Hammer className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-bold mb-2">No Recipes Available</h3>
          <p className="text-muted-foreground">
            Check back later for new crafting recipes!
          </p>
        </Card>
      )}
    </div>
  );
};
