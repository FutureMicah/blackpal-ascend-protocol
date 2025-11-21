import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Sword, Shield, Trophy, Users } from "lucide-react";
import { motion } from "framer-motion";

interface BossBattle {
  id: string;
  boss_name: string;
  boss_description: string;
  boss_hp: number;
  current_hp: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  reward_achievement_id: string;
  boss_image: string;
}

interface GuildParticipation {
  guild_id: string;
  damage_dealt: number;
  guild: {
    guild_name: string;
    guild_icon: string;
  };
}

interface GuildBossBattlesProps {
  userId: string;
}

export const GuildBossBattles = ({ userId }: GuildBossBattlesProps) => {
  const [bossBattles, setBossBattles] = useState<BossBattle[]>([]);
  const [userGuildId, setUserGuildId] = useState<string | null>(null);
  const [participations, setParticipations] = useState<Map<string, GuildParticipation[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadBossData();
  }, [userId]);

  const loadBossData = async () => {
    try {
      // Get user's guild
      const { data: guildMember, error: guildError } = await supabase
        .from("guild_members")
        .select("guild_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (guildError) throw guildError;

      setUserGuildId(guildMember?.guild_id || null);

      // Fetch active boss battles
      const { data: battles, error: battlesError } = await supabase
        .from("guild_boss_battles")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (battlesError) throw battlesError;

      // Fetch participations for each battle
      const participationsMap = new Map();
      for (const battle of battles || []) {
        const { data: parts, error: partsError } = await supabase
          .from("guild_boss_participation")
          .select(`
            guild_id,
            damage_dealt,
            guild:achievement_guilds(guild_name, guild_icon)
          `)
          .eq("boss_battle_id", battle.id)
          .order("damage_dealt", { ascending: false })
          .limit(10);

        if (!partsError) {
          participationsMap.set(battle.id, parts);
        }
      }

      setBossBattles(battles || []);
      setParticipations(participationsMap);
    } catch (error) {
      console.error("Error loading boss battles:", error);
    } finally {
      setLoading(false);
    }
  };

  const attackBoss = async (bossId: string) => {
    if (!userGuildId) {
      toast({
        title: "No Guild",
        description: "You need to join a guild to participate in boss battles!",
        variant: "destructive",
      });
      return;
    }

    try {
      const damage = Math.floor(Math.random() * 50) + 10; // 10-60 damage

      // Check if guild already has participation record
      const { data: existing } = await supabase
        .from("guild_boss_participation")
        .select("damage_dealt")
        .eq("boss_battle_id", bossId)
        .eq("guild_id", userGuildId)
        .maybeSingle();

      if (existing) {
        // Update existing participation
        await supabase
          .from("guild_boss_participation")
          .update({ damage_dealt: existing.damage_dealt + damage })
          .eq("boss_battle_id", bossId)
          .eq("guild_id", userGuildId);
      } else {
        // Create new participation
        await supabase.from("guild_boss_participation").insert({
          boss_battle_id: bossId,
          guild_id: userGuildId,
          damage_dealt: damage,
        });
      }

      // Update boss HP
      const boss = bossBattles.find((b) => b.id === bossId);
      if (boss) {
        const newHp = Math.max(0, boss.current_hp - damage);
        await supabase
          .from("guild_boss_battles")
          .update({ current_hp: newHp })
          .eq("id", bossId);

        if (newHp === 0) {
          toast({
            title: "Boss Defeated! 🎉",
            description: "Your guild helped defeat the boss!",
          });
        } else {
          toast({
            title: `${damage} Damage Dealt! ⚔️`,
            description: `Boss HP: ${newHp}/${boss.boss_hp}`,
          });
        }
      }

      loadBossData();
    } catch (error) {
      console.error("Error attacking boss:", error);
      toast({
        title: "Attack Failed",
        description: "Could not register your attack. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!userGuildId && (
        <Card className="p-4 bg-destructive/10 border-destructive">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <p className="text-sm">Join a guild to participate in boss battles!</p>
          </div>
        </Card>
      )}

      {bossBattles.map((boss, index) => {
        const hpPercentage = (boss.current_hp / boss.boss_hp) * 100;
        const isDefeated = boss.current_hp === 0;
        const parts = participations.get(boss.id) || [];

        return (
          <motion.div
            key={boss.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold flex items-center gap-2">
                        <span className="text-4xl">{boss.boss_image}</span>
                        {boss.boss_name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {boss.boss_description}
                      </p>
                    </div>
                    {isDefeated && (
                      <Badge variant="secondary">
                        <Trophy className="h-3 w-3 mr-1" />
                        Defeated
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Boss HP</span>
                      <span>
                        {boss.current_hp.toLocaleString()} / {boss.boss_hp.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={hpPercentage} className="h-3" />
                  </div>

                  <Button
                    onClick={() => attackBoss(boss.id)}
                    disabled={!userGuildId || isDefeated}
                    className="w-full mt-4"
                    size="lg"
                  >
                    <Sword className="h-4 w-4 mr-2" />
                    Attack Boss
                  </Button>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Guild Leaderboard
                  </h4>
                  <div className="space-y-2">
                    {parts.map((part, idx) => (
                      <div
                        key={part.guild_id}
                        className="flex items-center justify-between p-2 rounded-lg bg-secondary/50"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="w-6 h-6 p-0 justify-center">
                            {idx + 1}
                          </Badge>
                          <span className="text-lg">{part.guild.guild_icon || "🛡️"}</span>
                          <span className="text-sm font-medium">{part.guild.guild_name}</span>
                        </div>
                        <span className="text-sm font-bold">
                          {part.damage_dealt.toLocaleString()} dmg
                        </span>
                      </div>
                    ))}
                    {parts.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No guilds have participated yet
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}

      {bossBattles.length === 0 && (
        <Card className="p-12 text-center">
          <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No active boss battles at the moment</p>
        </Card>
      )}
    </div>
  );
};
