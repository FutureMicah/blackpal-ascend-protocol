import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Download, 
  Crown, 
  Star, 
  Trophy, 
  Zap, 
  Award, 
  Shield, 
  Diamond,
  Sparkles,
  GraduationCap,
  TrendingUp,
  Flame,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";

interface NFTProfileCardProps {
  userId: string;
  onClose: () => void;
}

interface ProfileData {
  id: string;
  display_name: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  country?: string;
  citizenship_rank?: string;
  rank_level?: number;
  xp_points?: number;
  virtual_currency?: number;
  streak_days?: number;
  mining_level?: number;
  payment_tier?: string;
}

interface Achievement {
  id: string;
  name: string;
  icon: string;
  rarity: string;
  description?: string;
}

interface Certificate {
  id: string;
  certificate_name: string;
  certificate_type: string;
  issued_at: string;
  is_verified?: boolean;
}

// Tier configurations with colors and styles
const tierConfig = {
  visitor: {
    bg: "from-slate-700 via-slate-800 to-slate-900",
    border: "border-slate-500/50",
    glow: "shadow-slate-500/20",
    accent: "text-slate-300",
    badge: "bg-slate-600",
    level: 1
  },
  citizen: {
    bg: "from-amber-700 via-amber-800 to-amber-900",
    border: "border-amber-400/50",
    glow: "shadow-amber-500/30",
    accent: "text-amber-300",
    badge: "bg-gradient-to-r from-amber-500 to-yellow-600",
    level: 5
  },
  elite: {
    bg: "from-gray-300 via-gray-400 to-gray-500",
    border: "border-gray-200/60",
    glow: "shadow-gray-300/40",
    accent: "text-gray-100",
    badge: "bg-gradient-to-r from-gray-300 to-gray-500",
    level: 10
  },
  vip: {
    bg: "from-cyan-600 via-blue-700 to-indigo-800",
    border: "border-cyan-400/50",
    glow: "shadow-cyan-500/40",
    accent: "text-cyan-200",
    badge: "bg-gradient-to-r from-cyan-400 to-blue-600",
    level: 15
  },
  platinum: {
    bg: "from-violet-600 via-purple-700 to-fuchsia-800",
    border: "border-purple-400/50",
    glow: "shadow-purple-500/40",
    accent: "text-purple-200",
    badge: "bg-gradient-to-r from-violet-500 to-fuchsia-600",
    level: 20
  },
  diamond: {
    bg: "from-sky-400 via-cyan-500 to-teal-600",
    border: "border-sky-300/60",
    glow: "shadow-sky-400/50",
    accent: "text-sky-100",
    badge: "bg-gradient-to-r from-sky-400 to-cyan-500",
    level: 30
  },
  legendary: {
    bg: "from-amber-400 via-orange-500 to-red-600",
    border: "border-amber-300/60",
    glow: "shadow-amber-400/50",
    accent: "text-amber-100",
    badge: "bg-gradient-to-r from-amber-400 via-orange-500 to-red-500",
    level: 50
  },
  mythic: {
    bg: "from-fuchsia-500 via-pink-600 to-rose-700",
    border: "border-pink-300/60",
    glow: "shadow-pink-400/50",
    accent: "text-pink-100",
    badge: "bg-gradient-to-r from-fuchsia-400 via-pink-500 to-rose-500",
    level: 100
  }
};

const getRarityColor = (rarity: string) => {
  switch (rarity?.toLowerCase()) {
    case "legendary": return "from-amber-400 to-orange-500";
    case "epic": return "from-purple-400 to-fuchsia-500";
    case "rare": return "from-blue-400 to-cyan-500";
    case "uncommon": return "from-green-400 to-emerald-500";
    default: return "from-gray-400 to-slate-500";
  }
};

export function NFTProfileCard({ userId, onClose }: NFTProfileCardProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string>("auto");
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (profileData) {
        setProfile(profileData);
      }

      // Load achievements
      const { data: achievementsData } = await supabase
        .from("user_achievements")
        .select(`
          achievement_id,
          achievements (
            id,
            name,
            icon,
            rarity,
            description
          )
        `)
        .eq("user_id", userId);
      
      const userAchievements = achievementsData
        ?.map((ua: any) => ua.achievements)
        .filter(Boolean) || [];
      setAchievements(userAchievements);

      // Load certificates
      const { data: certsData } = await supabase
        .from("certificates")
        .select("*")
        .eq("user_id", userId);
      
      setCertificates(certsData || []);
    } catch (error) {
      console.error("Error loading profile data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTierConfig = () => {
    if (selectedTier !== "auto") {
      return tierConfig[selectedTier as keyof typeof tierConfig] || tierConfig.visitor;
    }
    
    const level = profile?.rank_level || 1;
    if (level >= 100) return tierConfig.mythic;
    if (level >= 50) return tierConfig.legendary;
    if (level >= 30) return tierConfig.diamond;
    if (level >= 20) return tierConfig.platinum;
    if (level >= 15) return tierConfig.vip;
    if (level >= 10) return tierConfig.elite;
    if (level >= 5) return tierConfig.citizen;
    return tierConfig.visitor;
  };

  const handleExport = async () => {
    if (!cardRef.current) return;
    
    setExporting(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 3,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });
      
      const link = document.createElement("a");
      link.download = `blackpal-nft-${profile?.username || profile?.id}-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();
      
      toast({
        title: "✨ NFT Card Exported!",
        description: "Your premium profile card has been downloaded.",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Please try again.",
      });
    } finally {
      setExporting(false);
    }
  };

  const tier = getTierConfig();
  const level = profile?.rank_level || 1;
  const topAchievements = achievements.slice(0, 6);
  const topCertificates = certificates.slice(0, 3);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-muted-foreground">Generating your NFT card...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="w-full max-w-5xl"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              NFT Profile Card
            </h2>
            <p className="text-muted-foreground text-sm">Your premium collectible identity</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Tier Selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={selectedTier === "auto" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTier("auto")}
          >
            Auto (Level {level})
          </Button>
          {Object.entries(tierConfig).map(([key, config]) => (
            <Button
              key={key}
              variant={selectedTier === key ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTier(key)}
              className="capitalize"
            >
              {key}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* NFT Card Preview */}
          <div className="relative">
            <motion.div
              ref={cardRef}
              className={`
                relative overflow-hidden rounded-3xl p-1
                bg-gradient-to-br ${tier.bg}
                ${tier.border} border-2
                shadow-2xl ${tier.glow}
              `}
              initial={{ rotateY: -10, rotateX: 5 }}
              animate={{ 
                rotateY: [-2, 2, -2],
                rotateX: [2, -2, 2]
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
            >
              {/* Holographic Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 pointer-events-none" />
              
              {/* Animated Border Glow */}
              <motion.div
                className="absolute inset-0 rounded-3xl"
                style={{
                  background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)`,
                  backgroundSize: "200% 100%",
                }}
                animate={{
                  backgroundPosition: ["200% 0%", "-200% 0%"],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />

              {/* Card Content */}
              <div className="relative bg-black/60 backdrop-blur-xl rounded-[22px] p-6 md:p-8">
                {/* NFT Badge */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <motion.div
                    className={`${tier.badge} text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg`}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Diamond className="w-3 h-3" />
                    NFT
                  </motion.div>
                </div>

                {/* Level Badge */}
                <div className="absolute top-4 left-4">
                  <motion.div
                    className="bg-black/50 backdrop-blur border border-white/20 rounded-full px-4 py-2 flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                  >
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span className="font-bold text-white">LVL {level}</span>
                  </motion.div>
                </div>

                {/* Avatar Section */}
                <div className="flex flex-col items-center mt-12 mb-6">
                  <motion.div
                    className="relative"
                    whileHover={{ scale: 1.05, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {/* Animated Ring */}
                    <motion.div
                      className={`absolute -inset-3 rounded-full bg-gradient-to-r ${tier.bg} opacity-60`}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.div
                      className="absolute -inset-2 rounded-full bg-gradient-to-br from-white/30 to-transparent"
                      animate={{ rotate: -360 }}
                      transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    />
                    
                    {/* Avatar Image */}
                    <div className={`relative w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 ${tier.border}`}>
                      {profile?.avatar_url ? (
                        <img 
                          src={profile.avatar_url} 
                          alt={profile.display_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${tier.bg} flex items-center justify-center text-4xl`}>
                          {profile?.display_name?.charAt(0).toUpperCase() || "?"}
                        </div>
                      )}
                    </div>

                    {/* Verification Badge */}
                    <motion.div
                      className="absolute -bottom-1 -right-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full p-2 shadow-lg"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3, type: "spring" }}
                    >
                      <Shield className="w-4 h-4 text-white" />
                    </motion.div>
                  </motion.div>

                  {/* Name & Username */}
                  <motion.h2
                    className="text-2xl md:text-3xl font-black text-white mt-4 text-center"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {profile?.display_name}
                  </motion.h2>
                  
                  {profile?.username && (
                    <p className="text-white/60 text-sm">@{profile.username}</p>
                  )}

                  {/* Rank Badge */}
                  <motion.div
                    className={`mt-3 ${tier.badge} text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg flex items-center gap-2`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, type: "spring" }}
                  >
                    <Crown className="w-4 h-4" />
                    {profile?.citizenship_rank || "Visitor"}
                  </motion.div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-2 md:gap-4 mb-6">
                  {[
                    { label: "XP", value: profile?.xp_points || 0, icon: Zap, color: "from-yellow-400 to-amber-500" },
                    { label: "BTC", value: profile?.virtual_currency || 0, icon: TrendingUp, color: "from-green-400 to-emerald-500" },
                    { label: "Streak", value: profile?.streak_days || 0, icon: Flame, color: "from-orange-400 to-red-500" },
                    { label: "Mining", value: profile?.mining_level || 1, icon: Sparkles, color: "from-purple-400 to-pink-500" },
                  ].map((stat, idx) => (
                    <motion.div
                      key={stat.label}
                      className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-2 md:p-3 text-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + idx * 0.1 }}
                      whileHover={{ scale: 1.05, borderColor: "rgba(255,255,255,0.3)" }}
                    >
                      <div className={`w-6 h-6 md:w-8 md:h-8 mx-auto mb-1 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                        <stat.icon className="w-3 h-3 md:w-4 md:h-4 text-white" />
                      </div>
                      <div className="text-lg md:text-xl font-bold text-white">
                        {stat.value >= 1000 ? `${(stat.value / 1000).toFixed(1)}K` : stat.value}
                      </div>
                      <div className="text-[10px] md:text-xs text-white/50 uppercase tracking-wider">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Achievements Section */}
                {topAchievements.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Trophy className="w-4 h-4 text-yellow-400" />
                      <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider">Achievements</h3>
                      <Badge variant="outline" className="text-[10px] border-white/20 text-white/60">
                        {achievements.length} Total
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {topAchievements.map((achievement, idx) => (
                        <motion.div
                          key={achievement.id}
                          className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${getRarityColor(achievement.rarity)} flex items-center justify-center text-xl md:text-2xl shadow-lg`}
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: 0.7 + idx * 0.1, type: "spring" }}
                          whileHover={{ scale: 1.2, rotate: 10 }}
                          title={achievement.name}
                        >
                          {achievement.icon}
                        </motion.div>
                      ))}
                      {achievements.length > 6 && (
                        <motion.div
                          className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/10 flex items-center justify-center text-white/60 text-sm font-bold"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 1.3 }}
                        >
                          +{achievements.length - 6}
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}

                {/* Certificates Section */}
                {topCertificates.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <GraduationCap className="w-4 h-4 text-blue-400" />
                      <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider">Certificates</h3>
                    </div>
                    <div className="space-y-2">
                      {topCertificates.map((cert, idx) => (
                        <motion.div
                          key={cert.id}
                          className="flex items-center gap-3 bg-white/5 backdrop-blur border border-white/10 rounded-lg px-3 py-2"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 1 + idx * 0.1 }}
                        >
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                            <Award className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{cert.certificate_name}</p>
                            <p className="text-white/40 text-[10px]">{cert.certificate_type}</p>
                          </div>
                          {cert.is_verified && (
                            <Shield className="w-4 h-4 text-green-400" />
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <motion.div
                  className="flex items-center justify-between pt-4 border-t border-white/10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                >
                  <div className="flex items-center gap-2">
                    <img 
                      src="/blackpal-logo.png" 
                      alt="BlackPAL"
                      className="w-6 h-6 rounded"
                    />
                    <span className="text-white/60 text-xs font-bold tracking-widest">BLACKPAL</span>
                  </div>
                  <div className="text-white/40 text-[10px]">
                    {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                  </div>
                  <div className="text-white/30 text-[10px] font-mono">
                    #{profile?.id?.slice(0, 8).toUpperCase()}
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* Floating Particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-white/30"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    y: [0, -30, 0],
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-6">
            <Card className="glass-card p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" />
                Export Options
              </h3>
              
              <div className="space-y-4">
                <Button
                  onClick={handleExport}
                  disabled={exporting}
                  className="w-full h-14 text-lg bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                >
                  {exporting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                      />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 mr-2" />
                      Download NFT Card
                    </>
                  )}
                </Button>

                <p className="text-sm text-muted-foreground text-center">
                  High-resolution PNG perfect for social media, NFT marketplaces, and digital portfolios.
                </p>
              </div>
            </Card>

            <Card className="glass-card p-6">
              <h3 className="text-lg font-bold mb-4">Card Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Tier</span>
                  <Badge className={`${tier.badge} text-white border-0 capitalize`}>
                    {selectedTier === "auto" ? (profile?.citizenship_rank || "Visitor") : selectedTier}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Level</span>
                  <span className="font-bold">{level}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Achievements</span>
                  <span className="font-bold">{achievements.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Certificates</span>
                  <span className="font-bold">{certificates.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total XP</span>
                  <span className="font-bold">{profile?.xp_points || 0}</span>
                </div>
              </div>
            </Card>

            <Card className="glass-card p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                Tier Progression
              </h3>
              <div className="space-y-2">
                {Object.entries(tierConfig).map(([key, config]) => (
                  <div key={key} className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${config.bg}`} />
                    <span className="capitalize text-sm flex-1">{key}</span>
                    <span className="text-xs text-muted-foreground">Lvl {config.level}+</span>
                    {level >= config.level && (
                      <Shield className="w-4 h-4 text-green-400" />
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
