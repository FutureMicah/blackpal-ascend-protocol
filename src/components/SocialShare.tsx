import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Sparkles, TrendingUp, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";

interface SocialShareProps {
  profile: any;
  achievements: any[];
  stats: {
    totalXP: number;
    totalAchievements: number;
    rareAchievements: number;
  };
  onClose: () => void;
}

export function SocialShare({ profile, achievements, stats, onClose }: SocialShareProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<"minimal" | "detailed" | "animated">("minimal");
  const [isExporting, setIsExporting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const templates = [
    { id: "minimal", name: "Minimal", icon: Sparkles },
    { id: "detailed", name: "Detailed", icon: TrendingUp },
    { id: "animated", name: "Animated", icon: Award },
  ];

  const handleExportImage = async () => {
    if (!cardRef.current) return;
    
    setIsExporting(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#000000",
        scale: 2,
        logging: false,
      });
      
      const link = document.createElement("a");
      link.download = `blackpal-profile-${profile.username || profile.id}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      toast({
        title: "Card Exported",
        description: "Your profile card has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export profile card. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const topAchievements = achievements.slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-4xl"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-foreground">Share Your Progress</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Preview Area */}
          <div className="space-y-4">
            <div className="flex gap-2">
              {templates.map((template) => (
                <Button
                  key={template.id}
                  variant={selectedTemplate === template.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTemplate(template.id as any)}
                >
                  <template.icon className="w-4 h-4 mr-2" />
                  {template.name}
                </Button>
              ))}
            </div>

            <div ref={cardRef} className="relative">
              {selectedTemplate === "minimal" && (
                <MinimalCard profile={profile} stats={stats} />
              )}
              {selectedTemplate === "detailed" && (
                <DetailedCard profile={profile} stats={stats} achievements={topAchievements} />
              )}
              {selectedTemplate === "animated" && (
                <AnimatedCard profile={profile} stats={stats} achievements={topAchievements} />
              )}
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-4">
            <Card className="glass-card">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-semibold">Export Options</h3>
                
                <div className="space-y-2">
                  <Button
                    onClick={handleExportImage}
                    disabled={isExporting}
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {isExporting ? "Exporting..." : "Download as Image"}
                  </Button>

                  <p className="text-sm text-muted-foreground">
                    Export your profile card as a high-quality PNG image perfect for sharing on social media.
                  </p>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold mb-2">Share on:</h4>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline">Twitter</Badge>
                    <Badge variant="outline">Instagram</Badge>
                    <Badge variant="outline">LinkedIn</Badge>
                    <Badge variant="outline">Facebook</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function MinimalCard({ profile, stats }: { profile: any; stats: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-primary/10 to-background border border-primary/20 rounded-xl p-8 min-h-[400px] flex flex-col items-center justify-center text-center space-y-6"
    >
      <Avatar className="w-24 h-24 border-4 border-primary/30">
        <AvatarImage src={profile.avatar_url} />
        <AvatarFallback className="text-2xl">
          {profile.display_name?.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div>
        <h2 className="text-3xl font-bold">{profile.display_name}</h2>
        {profile.username && (
          <p className="text-muted-foreground">@{profile.username}</p>
        )}
      </div>

      <div className="flex gap-6">
        <div>
          <div className="text-2xl font-bold text-primary">{stats.totalXP}</div>
          <div className="text-sm text-muted-foreground">XP</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-primary">{stats.totalAchievements}</div>
          <div className="text-sm text-muted-foreground">Achievements</div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">BLACKPAL</div>
    </motion.div>
  );
}

function DetailedCard({ profile, stats, achievements }: { profile: any; stats: any; achievements: any[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-primary/10 via-background to-accent/10 border border-primary/20 rounded-xl p-8 min-h-[500px] space-y-6"
    >
      <div className="flex items-start gap-4">
        <Avatar className="w-20 h-20 border-4 border-primary/30">
          <AvatarImage src={profile.avatar_url} />
          <AvatarFallback className="text-xl">
            {profile.display_name?.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{profile.display_name}</h2>
          {profile.username && (
            <p className="text-muted-foreground">@{profile.username}</p>
          )}
          <Badge className="mt-2 bg-gradient-to-r from-primary to-accent text-white border-0">
            {profile.citizenship_rank || "Visitor"} • Rank {profile.rank_level || 1}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-background/50 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-primary">{stats.totalXP}</div>
          <div className="text-xs text-muted-foreground">Total XP</div>
        </div>
        <div className="bg-background/50 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-primary">{stats.totalAchievements}</div>
          <div className="text-xs text-muted-foreground">Achievements</div>
        </div>
        <div className="bg-background/50 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-primary">{profile.streak_days || 0}</div>
          <div className="text-xs text-muted-foreground">Day Streak</div>
        </div>
      </div>

      {achievements.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Top Achievements</h3>
          <div className="flex gap-2">
            {achievements.map((achievement, index) => (
              <div
                key={index}
                className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-2xl"
                title={achievement.name}
              >
                {achievement.icon}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground text-center pt-4 border-t border-border">
        BLACKPAL • {new Date().getFullYear()}
      </div>
    </motion.div>
  );
}

function AnimatedCard({ profile, stats, achievements }: { profile: any; stats: any; achievements: any[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-primary/20 via-background to-accent/20 border border-primary/30 rounded-xl p-8 min-h-[500px] space-y-6 relative overflow-hidden"
    >
      {/* Animated Background */}
      <motion.div
        className="absolute inset-0 opacity-20"
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%"],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          repeatType: "reverse",
        }}
        style={{
          backgroundImage: "radial-gradient(circle at center, hsl(var(--primary)) 0%, transparent 50%)",
          backgroundSize: "200% 200%",
        }}
      />

      <div className="relative z-10">
        <motion.div
          className="flex items-start gap-4"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Avatar className="w-20 h-20 border-4 border-primary/30">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="text-xl">
                {profile.display_name?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </motion.div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{profile.display_name}</h2>
            {profile.username && (
              <p className="text-muted-foreground">@{profile.username}</p>
            )}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: "spring" }}
            >
              <Badge className="mt-2 bg-gradient-to-r from-primary to-accent text-white border-0">
                {profile.citizenship_rank || "Visitor"} • Rank {profile.rank_level || 1}
              </Badge>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          className="grid grid-cols-3 gap-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {[
            { value: stats.totalXP, label: "Total XP", delay: 0.4 },
            { value: stats.totalAchievements, label: "Achievements", delay: 0.5 },
            { value: profile.streak_days || 0, label: "Day Streak", delay: 0.6 },
          ].map((stat, index) => (
            <motion.div
              key={index}
              className="bg-background/50 backdrop-blur-sm rounded-lg p-3 text-center border border-primary/20"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: stat.delay, type: "spring", stiffness: 200 }}
              whileHover={{ scale: 1.05, borderColor: "hsl(var(--primary))" }}
            >
              <motion.div
                className="text-xl font-bold text-primary"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: stat.delay + 0.2 }}
              >
                {stat.value}
              </motion.div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {achievements.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <h3 className="text-sm font-semibold mb-2">Top Achievements</h3>
            <div className="flex gap-2">
              {achievements.map((achievement, index) => (
                <motion.div
                  key={index}
                  className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-2xl border border-primary/30"
                  title={achievement.name}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.8 + index * 0.1, type: "spring" }}
                  whileHover={{ scale: 1.2, rotate: 360 }}
                >
                  {achievement.icon}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          className="text-xs text-muted-foreground text-center pt-4 border-t border-border"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          BLACKPAL • {new Date().getFullYear()}
        </motion.div>
      </div>
    </motion.div>
  );
}
