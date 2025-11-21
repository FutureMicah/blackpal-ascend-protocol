import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Book, Lock, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface LoreEntry {
  id: string;
  achievement_id: string;
  lore_title: string;
  lore_content: string;
  chapter_number: number;
  unlock_requirements: any;
  achievement_name?: string;
  achievement_icon?: string;
}

interface AchievementLoreProps {
  userId: string;
}

export const AchievementLore = ({ userId }: AchievementLoreProps) => {
  const [loreEntries, setLoreEntries] = useState<LoreEntry[]>([]);
  const [unlockedLore, setUnlockedLore] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedLore, setSelectedLore] = useState<LoreEntry | null>(null);

  useEffect(() => {
    loadLoreData();
  }, [userId]);

  const loadLoreData = async () => {
    try {
      // Fetch all lore entries
      const { data: loreData, error: loreError } = await supabase
        .from("achievement_lore")
        .select(`
          *,
          achievements!achievement_lore_achievement_id_fkey(name, icon)
        `)
        .order("chapter_number");

      if (loreError) throw loreError;

      // Fetch user's achievements
      const { data: userAchievements, error: userError } = await supabase
        .from("user_achievements")
        .select("achievement_id")
        .eq("user_id", userId);

      if (userError) throw userError;

      const userAchievementIds = new Set(
        userAchievements?.map((ua) => ua.achievement_id) || []
      );

      // Check which lore entries are unlocked
      const unlocked = new Set<string>();
      loreData?.forEach((lore) => {
        const requirements = lore.unlock_requirements as { required_achievements: string[] };
        const isUnlocked = requirements.required_achievements.every((reqId) =>
          userAchievementIds.has(reqId)
        );
        if (isUnlocked) {
          unlocked.add(lore.id);
        }
      });

      setUnlockedLore(unlocked);
      setLoreEntries(
        loreData?.map((lore) => ({
          ...lore,
          achievement_name: lore.achievements?.name,
          achievement_icon: lore.achievements?.icon,
        })) || []
      );
    } catch (error) {
      console.error("Error loading lore:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-4">
          {loreEntries.map((lore, index) => {
            const isUnlocked = unlockedLore.has(lore.id);
            return (
              <motion.div
                key={lore.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
                    selectedLore?.id === lore.id ? "ring-2 ring-primary" : ""
                  } ${!isUnlocked ? "opacity-50" : ""}`}
                  onClick={() => isUnlocked && setSelectedLore(lore)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Book className="h-4 w-4" />
                        <span className="text-sm text-muted-foreground">
                          Chapter {lore.chapter_number}
                        </span>
                        {!isUnlocked && <Lock className="h-3 w-3" />}
                      </div>
                      <h3 className="font-semibold">
                        {isUnlocked ? lore.lore_title : "???"}
                      </h3>
                      {lore.achievement_name && (
                        <div className="flex items-center gap-1 mt-2">
                          <span className="text-lg">{lore.achievement_icon}</span>
                          <span className="text-xs text-muted-foreground">
                            {lore.achievement_name}
                          </span>
                        </div>
                      )}
                    </div>
                    {isUnlocked && (
                      <Sparkles className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>

      <Card className="p-6 h-[600px] overflow-hidden">
        {selectedLore ? (
          <div className="h-full flex flex-col">
            <div className="mb-4">
              <Badge variant="secondary" className="mb-2">
                Chapter {selectedLore.chapter_number}
              </Badge>
              <h2 className="text-2xl font-bold mb-2">{selectedLore.lore_title}</h2>
            </div>
            <ScrollArea className="flex-1">
              <div className="prose prose-sm dark:prose-invert">
                {selectedLore.lore_content.split("\n").map((paragraph, i) => (
                  <p key={i} className="mb-4">
                    {paragraph}
                  </p>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-center">
            <div>
              <Book className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Select a chapter to read its story
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
