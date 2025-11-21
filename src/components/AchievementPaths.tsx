import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PathNode {
  achievement_id: string;
  name: string;
  icon: string;
  description: string;
  unlocked: boolean;
  unlocks: string[];
  position: { x: number; y: number };
}

interface AchievementPathsProps {
  userId: string;
}

export const AchievementPaths = ({ userId }: AchievementPathsProps) => {
  const [paths, setPaths] = useState<PathNode[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPaths();
  }, [userId]);

  const loadPaths = async () => {
    try {
      // Get all achievements with unlock conditions
      const { data: achievements, error: achievementsError } = await supabase
        .from("achievements")
        .select("*")
        .order("category");

      if (achievementsError) throw achievementsError;

      // Get user's unlocked achievements
      const { data: userAchievements, error: userError } = await supabase
        .from("user_achievements")
        .select("achievement_id")
        .eq("user_id", userId);

      if (userError) throw userError;

      const unlockedIds = new Set(userAchievements?.map(ua => ua.achievement_id) || []);

      // Build path structure with dependencies
      const pathNodes: PathNode[] = achievements?.map((achievement, index) => {
        const condition = achievement.unlock_condition as any;
        const unlocks = condition?.requires ? [condition.requires] : [];
        
        return {
          achievement_id: achievement.id,
          name: achievement.name,
          icon: achievement.icon,
          description: achievement.description,
          unlocked: unlockedIds.has(achievement.id),
          unlocks,
          position: {
            x: (index % 4) * 250,
            y: Math.floor(index / 4) * 200,
          },
        };
      }) || [];

      setPaths(pathNodes);
    } catch (error) {
      console.error("Error loading paths:", error);
      toast({
        title: "Error",
        description: "Failed to load achievement paths",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <div className="animate-pulse">Loading achievement paths...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Achievement Paths
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Unlock achievements to reveal new paths and progression routes
          </p>
        </div>
      </div>

      <div className="relative overflow-x-auto pb-4">
        <div className="min-w-[900px] relative h-[600px]">
          {/* Connection Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
            {paths.map((node) =>
              node.unlocks.map((unlocksId) => {
                const targetNode = paths.find((n) => n.achievement_id === unlocksId);
                if (!targetNode) return null;

                const isUnlocked = node.unlocked && targetNode.unlocked;
                
                return (
                  <line
                    key={`${node.achievement_id}-${unlocksId}`}
                    x1={node.position.x + 100}
                    y1={node.position.y + 60}
                    x2={targetNode.position.x + 100}
                    y2={targetNode.position.y + 60}
                    stroke={isUnlocked ? "hsl(var(--primary))" : "hsl(var(--border))"}
                    strokeWidth="2"
                    strokeDasharray={isUnlocked ? "0" : "4"}
                    className="transition-all duration-300"
                  />
                );
              })
            )}
          </svg>

          {/* Achievement Nodes */}
          {paths.map((node, index) => (
            <motion.div
              key={node.achievement_id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              style={{
                position: "absolute",
                left: node.position.x,
                top: node.position.y,
                zIndex: 1,
              }}
            >
              <Card
                className={`w-48 p-4 transition-all hover:scale-105 ${
                  node.unlocked
                    ? "bg-gradient-to-br from-primary/20 to-accent/20 border-primary/50"
                    : "bg-card/50 border-border/30"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{node.icon}</span>
                  {node.unlocked ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                
                <h3 className="font-bold text-sm mb-1 line-clamp-2">
                  {node.name}
                </h3>
                
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {node.description}
                </p>

                {node.unlocks.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ArrowRight className="h-3 w-3" />
                    <span>Unlocks next</span>
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span className="text-muted-foreground">Unlocked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-border" />
          <span className="text-muted-foreground">Locked</span>
        </div>
      </div>
    </div>
  );
};
