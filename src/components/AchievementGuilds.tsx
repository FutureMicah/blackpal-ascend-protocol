import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Shield, Trophy, Plus, UserPlus, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Guild {
  id: string;
  guild_name: string;
  guild_description: string;
  guild_icon: string;
  total_guild_xp: number;
  member_count: number;
  founder_id: string;
  is_member?: boolean;
}

interface AchievementGuildsProps {
  userId: string;
}

export const AchievementGuilds = ({ userId }: AchievementGuildsProps) => {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [myGuild, setMyGuild] = useState<Guild | null>(null);
  const [guildMembers, setGuildMembers] = useState<any[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newGuildName, setNewGuildName] = useState("");
  const [newGuildDescription, setNewGuildDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadGuilds();
  }, [userId]);

  const loadGuilds = async () => {
    try {
      // Check if user is in a guild
      const { data: membership } = await supabase
        .from("guild_members")
        .select("guild_id")
        .eq("user_id", userId)
        .maybeSingle();

      // Get all public guilds
      const { data: guildsData, error } = await supabase
        .from("achievement_guilds")
        .select("*")
        .eq("is_public", true)
        .order("total_guild_xp", { ascending: false })
        .limit(20);

      if (error) throw error;

      const enrichedGuilds = guildsData?.map(guild => ({
        ...guild,
        is_member: guild.id === membership?.guild_id,
      })) || [];

      setGuilds(enrichedGuilds);

      // Load user's guild details if they're in one
      if (membership) {
        const userGuild = enrichedGuilds.find(g => g.id === membership.guild_id);
        if (userGuild) {
          setMyGuild(userGuild);
          loadGuildMembers(userGuild.id);
        }
      }
    } catch (error) {
      console.error("Error loading guilds:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadGuildMembers = async (guildId: string) => {
    try {
      const { data, error } = await supabase
        .from("guild_members")
        .select(`
          role,
          contribution_xp,
          profiles (
            display_name,
            avatar_url
          )
        `)
        .eq("guild_id", guildId)
        .order("contribution_xp", { ascending: false });

      if (error) throw error;
      setGuildMembers(data || []);
    } catch (error) {
      console.error("Error loading members:", error);
    }
  };

  const createGuild = async () => {
    if (!newGuildName.trim()) {
      toast({
        title: "Invalid name",
        description: "Please provide a guild name",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create guild
      const { data: guild, error: guildError } = await supabase
        .from("achievement_guilds")
        .insert({
          guild_name: newGuildName,
          guild_description: newGuildDescription,
          guild_icon: "🛡️",
          founder_id: userId,
        })
        .select()
        .single();

      if (guildError) throw guildError;

      // Add founder as member
      const { error: memberError } = await supabase
        .from("guild_members")
        .insert({
          guild_id: guild.id,
          user_id: userId,
          role: "founder",
        });

      if (memberError) throw memberError;

      toast({
        title: "Guild Created!",
        description: `Welcome to ${newGuildName}`,
      });

      setNewGuildName("");
      setNewGuildDescription("");
      setIsCreateDialogOpen(false);
      loadGuilds();
    } catch (error: any) {
      console.error("Error creating guild:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create guild",
        variant: "destructive",
      });
    }
  };

  const joinGuild = async (guildId: string) => {
    try {
      const { error } = await supabase
        .from("guild_members")
        .insert({
          guild_id: guildId,
          user_id: userId,
          role: "member",
        });

      if (error) throw error;

      // Update guild member count
      const { data: guild } = await supabase
        .from("achievement_guilds")
        .select("member_count")
        .eq("id", guildId)
        .single();

      if (guild) {
        await supabase
          .from("achievement_guilds")
          .update({ member_count: guild.member_count + 1 })
          .eq("id", guildId);
      }

      toast({
        title: "Joined Guild!",
        description: "Welcome to your new guild",
      });

      loadGuilds();
    } catch (error: any) {
      console.error("Error joining guild:", error);
      toast({
        title: "Error",
        description: "Failed to join guild",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">Loading guilds...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Achievement Guilds
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Join forces and compete together in seasonal challenges
          </p>
        </div>

        {!myGuild && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Guild
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Guild</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Guild Name"
                  value={newGuildName}
                  onChange={(e) => setNewGuildName(e.target.value)}
                />
                <Textarea
                  placeholder="Guild Description (optional)"
                  value={newGuildDescription}
                  onChange={(e) => setNewGuildDescription(e.target.value)}
                />
                <Button onClick={createGuild} className="w-full">
                  Create Guild
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* User's Guild */}
      {myGuild && (
        <Card className="p-6 bg-gradient-to-br from-primary/20 to-accent/20">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="text-4xl">{myGuild.guild_icon}</div>
              <div>
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  {myGuild.guild_name}
                  <Badge variant="secondary">Your Guild</Badge>
                </h3>
                <p className="text-sm text-muted-foreground">{myGuild.guild_description}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{myGuild.total_guild_xp}</div>
              <div className="text-xs text-muted-foreground">Total XP</div>
            </div>
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{myGuild.member_count}</div>
              <div className="text-xs text-muted-foreground">Members</div>
            </div>
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">#{guilds.findIndex(g => g.id === myGuild.id) + 1}</div>
              <div className="text-xs text-muted-foreground">Rank</div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members
            </h4>
            <div className="space-y-2">
              {guildMembers.slice(0, 5).map((member, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-background/50 rounded">
                  <div className="flex items-center gap-2">
                    {member.role === "founder" && <Crown className="h-4 w-4 text-amber-500" />}
                    <span className="font-medium">{member.profiles?.display_name}</span>
                  </div>
                  <Badge variant="secondary">{member.contribution_xp} XP</Badge>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* All Guilds */}
      <div>
        <h3 className="text-xl font-bold mb-4">Discover Guilds</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {guilds.map((guild, index) => (
            <motion.div
              key={guild.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={`p-4 ${guild.is_member ? "ring-2 ring-primary" : ""}`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="text-3xl">{guild.guild_icon}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold truncate">{guild.guild_name}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {guild.guild_description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3 text-sm">
                  <span className="text-muted-foreground">{guild.member_count} members</span>
                  <span className="font-bold text-primary">{guild.total_guild_xp} XP</span>
                </div>

                {!myGuild && !guild.is_member && (
                  <Button size="sm" onClick={() => joinGuild(guild.id)} className="w-full">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Join
                  </Button>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
