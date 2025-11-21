import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Sparkles, Gem } from "lucide-react";
import { motion } from "framer-motion";

interface Material {
  id: string;
  material_name: string;
  material_description: string;
  rarity: string;
  icon: string;
}

interface EvolutionPath {
  id: string;
  base_achievement_id: string;
  evolved_achievement_id: string;
  required_materials: Array<{ material_id: string; quantity: number }>;
  required_usage_count: number;
  xp_cost: number;
  base_achievement: {
    name: string;
    icon: string;
    rarity: string;
  };
  evolved_achievement: {
    name: string;
    icon: string;
    rarity: string;
  };
}

interface UserMaterial {
  material_id: string;
  quantity: number;
  material: Material;
}

interface AchievementEvolutionProps {
  userId: string;
}

export const AchievementEvolution = ({ userId }: AchievementEvolutionProps) => {
  const [evolutionPaths, setEvolutionPaths] = useState<EvolutionPath[]>([]);
  const [userMaterials, setUserMaterials] = useState<Map<string, number>>(new Map());
  const [userAchievements, setUserAchievements] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadEvolutionData();
  }, [userId]);

  const loadEvolutionData = async () => {
    try {
      // Fetch evolution paths
      const { data: paths, error: pathsError } = await supabase
        .from("achievement_evolution_paths")
        .select(`
          *,
          base_achievement:achievements!achievement_evolution_paths_base_achievement_id_fkey(name, icon, rarity),
          evolved_achievement:achievements!achievement_evolution_paths_evolved_achievement_id_fkey(name, icon, rarity)
        `);

      if (pathsError) throw pathsError;

      // Fetch user materials
      const { data: materials, error: materialsError } = await supabase
        .from("user_materials")
        .select(`
          material_id,
          quantity,
          material:achievement_materials(*)
        `)
        .eq("user_id", userId);

      if (materialsError) throw materialsError;

      // Fetch user achievements
      const { data: achievements, error: achievementsError } = await supabase
        .from("user_achievements")
        .select("achievement_id")
        .eq("user_id", userId);

      if (achievementsError) throw achievementsError;

      const materialsMap = new Map(
        materials?.map((m) => [m.material_id, m.quantity]) || []
      );
      const achievementsSet = new Set(
        achievements?.map((a) => a.achievement_id) || []
      );

      setEvolutionPaths(paths as any || []);
      setUserMaterials(materialsMap);
      setUserAchievements(achievementsSet);
    } catch (error) {
      console.error("Error loading evolution data:", error);
    } finally {
      setLoading(false);
    }
  };

  const canEvolve = (path: EvolutionPath): boolean => {
    if (!userAchievements.has(path.base_achievement_id)) return false;

    return path.required_materials.every((req) => {
      const userQty = userMaterials.get(req.material_id) || 0;
      return userQty >= req.quantity;
    });
  };

  const handleEvolve = async (path: EvolutionPath) => {
    try {
      // Deduct materials
      for (const req of path.required_materials) {
        const currentQty = userMaterials.get(req.material_id) || 0;
        await supabase
          .from("user_materials")
          .update({ quantity: currentQty - req.quantity })
          .eq("user_id", userId)
          .eq("material_id", req.material_id);
      }

      // Create evolution record
      const { error: evolveError } = await supabase
        .from("user_achievement_evolution")
        .insert({
          user_id: userId,
          base_achievement_id: path.base_achievement_id,
          evolved_achievement_id: path.evolved_achievement_id,
        });

      if (evolveError) throw evolveError;

      // Award evolved achievement
      const { error: awardError } = await supabase
        .from("user_achievements")
        .insert({
          user_id: userId,
          achievement_id: path.evolved_achievement_id,
        });

      if (awardError) throw awardError;

      toast({
        title: "Evolution Complete! ✨",
        description: `${path.base_achievement.icon} ${path.base_achievement.name} evolved into ${path.evolved_achievement.icon} ${path.evolved_achievement.name}!`,
      });

      loadEvolutionData();
    } catch (error) {
      console.error("Error evolving achievement:", error);
      toast({
        title: "Evolution Failed",
        description: "Could not complete evolution. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {evolutionPaths.map((path, index) => {
        const eligible = canEvolve(path);
        const hasBase = userAchievements.has(path.base_achievement_id);

        return (
          <motion.div
            key={path.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`p-6 ${!hasBase ? "opacity-50" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  {/* Base Achievement */}
                  <div className="text-center">
                    <div className="text-4xl mb-2">{path.base_achievement.icon}</div>
                    <p className="text-sm font-medium">{path.base_achievement.name}</p>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {path.base_achievement.rarity}
                    </Badge>
                  </div>

                  <ArrowRight className="h-8 w-8 text-muted-foreground" />

                  {/* Evolved Achievement */}
                  <div className="text-center">
                    <div className="text-4xl mb-2">{path.evolved_achievement.icon}</div>
                    <p className="text-sm font-medium">{path.evolved_achievement.name}</p>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {path.evolved_achievement.rarity}
                    </Badge>
                  </div>
                </div>

                <div className="text-right space-y-4">
                  {/* Materials Required */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium flex items-center gap-1">
                      <Gem className="h-4 w-4" /> Materials Required:
                    </p>
                    {path.required_materials.map((req) => {
                      const userQty = userMaterials.get(req.material_id) || 0;
                      const percentage = (userQty / req.quantity) * 100;
                      return (
                        <div key={req.material_id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span>Material #{req.material_id.slice(0, 8)}</span>
                            <span>
                              {userQty}/{req.quantity}
                            </span>
                          </div>
                          <Progress value={Math.min(percentage, 100)} />
                        </div>
                      );
                    })}
                  </div>

                  <Button
                    onClick={() => handleEvolve(path)}
                    disabled={!eligible}
                    className="w-full"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Evolve Badge
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}

      {evolutionPaths.length === 0 && (
        <Card className="p-12 text-center">
          <Sparkles className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No evolution paths available yet</p>
        </Card>
      )}
    </div>
  );
};
