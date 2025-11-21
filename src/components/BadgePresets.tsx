import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Check, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BadgePreset {
  id: string;
  preset_name: string;
  achievement_ids: string[];
  is_active: boolean;
  achievements?: Array<{
    id: string;
    name: string;
    icon: string;
    rarity: string;
  }>;
}

interface BadgePresetsProps {
  userId: string;
}

export const BadgePresets = ({ userId }: BadgePresetsProps) => {
  const [presets, setPresets] = useState<BadgePreset[]>([]);
  const [availableAchievements, setAvailableAchievements] = useState<any[]>([]);
  const [newPresetName, setNewPresetName] = useState("");
  const [selectedAchievements, setSelectedAchievements] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPresets();
    loadAvailableAchievements();
  }, [userId]);

  const loadPresets = async () => {
    try {
      const { data, error } = await supabase
        .from("badge_presets")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Load achievement details for each preset
      if (data) {
        const presetsWithDetails = await Promise.all(
          data.map(async (preset) => {
            const { data: achievements } = await supabase
              .from("achievements")
              .select("id, name, icon, rarity")
              .in("id", preset.achievement_ids);

            return {
              ...preset,
              achievements: achievements || [],
            };
          })
        );
        setPresets(presetsWithDetails);
      }
    } catch (error) {
      console.error("Error loading presets:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableAchievements = async () => {
    try {
      const { data: userAchievements } = await supabase
        .from("user_achievements")
        .select(`
          achievement_id,
          achievements (
            id,
            name,
            icon,
            rarity
          )
        `)
        .eq("user_id", userId);

      if (userAchievements) {
        setAvailableAchievements(
          userAchievements.map(ua => ua.achievements).filter(Boolean)
        );
      }
    } catch (error) {
      console.error("Error loading achievements:", error);
    }
  };

  const createPreset = async () => {
    if (!newPresetName.trim() || selectedAchievements.length === 0) {
      toast({
        title: "Invalid preset",
        description: "Please provide a name and select at least one badge",
        variant: "destructive",
      });
      return;
    }

    if (selectedAchievements.length > 5) {
      toast({
        title: "Too many badges",
        description: "You can only showcase up to 5 badges per preset",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("badge_presets")
        .insert({
          user_id: userId,
          preset_name: newPresetName,
          achievement_ids: selectedAchievements,
          is_active: false,
        });

      if (error) throw error;

      toast({
        title: "Preset created",
        description: "Your badge preset has been saved",
      });

      setNewPresetName("");
      setSelectedAchievements([]);
      setIsDialogOpen(false);
      loadPresets();
    } catch (error) {
      console.error("Error creating preset:", error);
      toast({
        title: "Error",
        description: "Failed to create preset",
        variant: "destructive",
      });
    }
  };

  const activatePreset = async (presetId: string) => {
    try {
      // Deactivate all presets
      await supabase
        .from("badge_presets")
        .update({ is_active: false })
        .eq("user_id", userId);

      // Activate selected preset
      const { error } = await supabase
        .from("badge_presets")
        .update({ is_active: true })
        .eq("id", presetId);

      if (error) throw error;

      toast({
        title: "Preset activated",
        description: "Your badge showcase has been updated",
      });

      loadPresets();
    } catch (error) {
      console.error("Error activating preset:", error);
    }
  };

  const deletePreset = async (presetId: string) => {
    try {
      const { error } = await supabase
        .from("badge_presets")
        .delete()
        .eq("id", presetId);

      if (error) throw error;

      toast({
        title: "Preset deleted",
        description: "Your preset has been removed",
      });

      loadPresets();
    } catch (error) {
      console.error("Error deleting preset:", error);
    }
  };

  const toggleAchievement = (achievementId: string) => {
    if (selectedAchievements.includes(achievementId)) {
      setSelectedAchievements(selectedAchievements.filter(id => id !== achievementId));
    } else if (selectedAchievements.length < 5) {
      setSelectedAchievements([...selectedAchievements, achievementId]);
    } else {
      toast({
        title: "Maximum reached",
        description: "You can only select up to 5 badges per preset",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">Loading presets...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Star className="h-6 w-6 text-primary" />
            Badge Presets
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create custom badge loadouts for different contexts
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Preset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Badge Preset</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <Input
                placeholder="Preset name (e.g., 'Professional', 'Competitive')"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
              />

              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  Select up to 5 badges ({selectedAchievements.length}/5)
                </p>
                <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {availableAchievements.map((achievement: any) => (
                    <Card
                      key={achievement.id}
                      className={`p-3 cursor-pointer transition-all ${
                        selectedAchievements.includes(achievement.id)
                          ? "ring-2 ring-primary bg-primary/10"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => toggleAchievement(achievement.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{achievement.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{achievement.name}</div>
                          <Badge variant="secondary" className="text-xs">
                            {achievement.rarity}
                          </Badge>
                        </div>
                        {selectedAchievements.includes(achievement.id) && (
                          <Check className="h-5 w-5 text-primary flex-shrink-0" />
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <Button onClick={createPreset} className="w-full">
                Create Preset
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Presets List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {presets.map((preset, index) => (
          <motion.div
            key={preset.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`p-4 ${preset.is_active ? "ring-2 ring-primary" : ""}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold">{preset.preset_name}</h3>
                  {preset.is_active && (
                    <Badge variant="default" className="text-xs">Active</Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deletePreset(preset.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {preset.achievements?.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded"
                  >
                    <span className="text-lg">{achievement.icon}</span>
                    <span className="text-xs">{achievement.name}</span>
                  </div>
                ))}
              </div>

              {!preset.is_active && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => activatePreset(preset.id)}
                >
                  Activate
                </Button>
              )}
            </Card>
          </motion.div>
        ))}
      </div>

      {presets.length === 0 && (
        <Card className="p-12 text-center">
          <Star className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-bold mb-2">No Presets Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first badge preset to showcase your achievements
          </p>
        </Card>
      )}
    </div>
  );
};
