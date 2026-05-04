import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, MapPin, Calendar, ExternalLink, Twitter, Linkedin, Github, Instagram, Globe, Lock, Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FloatingNav } from "@/components/FloatingNav";
import { PremiumBadges } from "@/components/PremiumBadges";
import { ProfileMilestoneBadges } from "@/components/ProfileMilestoneBadges";
import { ProfileShowcaseDisplay } from "@/components/ProfileShowcaseDisplay";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { Input } from "@/components/ui/input";

export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalAchievements: 0,
    rareAchievements: 0,
    totalXP: 0,
  });

  useEffect(() => {
    loadProfile();
    getCurrentUser();
  }, [userId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const loadProfile = async () => {
    if (!userId) {
      navigate("/dashboard");
      return;
    }

    try {
      setLoading(true);

      // Get current user to check relationship
      const { data: { user } } = await supabase.auth.getUser();

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;

      // Check visibility permissions
      const visibility = profileData.profile_visibility || "public";
      
      if (visibility === "private" && user?.id !== userId) {
        toast({
          title: "Private Profile",
          description: "This profile is private and cannot be viewed.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      if (visibility === "friends_only" && user?.id !== userId) {
        // Check if they are friends
        const { data: friendData } = await supabase
          .from("friend_connections")
          .select("*")
          .or(`and(user_id.eq.${user?.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${user?.id})`)
          .eq("status", "accepted")
          .single();

        if (!friendData) {
          toast({
            title: "Friends Only",
            description: "This profile is only visible to friends.",
            variant: "destructive",
          });
          navigate("/dashboard");
          return;
        }
      }

      setProfile(profileData);

      // Track profile view (only if not viewing own profile)
      if (user?.id !== userId) {
        try {
          // Detect viewer's geo data
          const geoResponse = await fetch("https://ipapi.co/json/");
          const geoData = await geoResponse.json();

          await supabase.from("profile_views").insert({
            profile_id: userId,
            viewer_id: user?.id || null,
            viewer_country: geoData.country_name || null,
            viewer_continent: geoData.continent_code || null,
            viewer_city: geoData.city || null,
            referrer: document.referrer || null,
            user_agent: navigator.userAgent,
          });
        } catch (viewError) {
          console.error("Error tracking view:", viewError);
          // Don't fail the page load if tracking fails
        }
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
        .eq("user_id", userId)
        .limit(12);

      const userAchievements = achievementsData?.map((ua: any) => ua.achievements).filter(Boolean) || [];
      setAchievements(userAchievements);

      // Calculate stats
      const totalXP = profileData.xp_points || 0;
      const totalAchievements = achievementsData?.length || 0;
      const rareAchievements = userAchievements.filter(
        (a: any) => a.rarity === "rare" || a.rarity === "epic" || a.rarity === "legendary"
      ).length;

      setStats({
        totalAchievements,
        rareAchievements,
        totalXP,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (tier: string) => {
    if (!tier) return "from-violet-500 to-purple-500";
    if (tier === "NIGERIA") return "from-green-500 to-emerald-500";
    if (tier === "AFRICA") return "from-orange-500 to-amber-500";
    return "from-violet-500 to-purple-500";
  };

  const getVisibilityIcon = () => {
    const visibility = profile?.profile_visibility || "public";
    if (visibility === "public") return <Globe className="w-4 h-4" />;
    if (visibility === "friends_only") return <ExternalLink className="w-4 h-4" />;
    return <Lock className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  const isOwnProfile = currentUserId === userId;
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const profileUrl = `${window.location.origin}/profile/${userId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast({ title: "Link copied!" });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to copy" });
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile.display_name}'s Profile`,
          url: profileUrl,
        });
      } catch (error) {}
    } else {
      handleCopyLink();
    }
  };

  // Apply custom theme
  const getBackgroundClass = (bg: string) => {
    const backgrounds: Record<string, string> = {
      default: "bg-background",
      dark: "bg-gradient-to-br from-gray-900 to-black",
      purple: "bg-gradient-to-br from-purple-900 to-indigo-900",
      ocean: "bg-gradient-to-br from-blue-900 to-cyan-900",
      sunset: "bg-gradient-to-br from-orange-900 to-red-900",
      forest: "bg-gradient-to-br from-green-900 to-emerald-900",
    };
    return backgrounds[bg] || backgrounds.default;
  };

  const getFontClass = (font: string) => {
    const fonts: Record<string, string> = {
      inter: "font-sans",
      playfair: "font-serif",
      mono: "font-mono",
      raleway: "font-raleway",
    };
    return fonts[font] || fonts.inter;
  };

  // Map accent color choice -> HSL value that overrides --primary on this scope
  const getAccentHsl = (color: string) => {
    const map: Record<string, string> = {
      purple: "280 100% 70%",
      blue: "217 91% 60%",
      green: "142 71% 45%",
      orange: "25 95% 53%",
      pink: "330 81% 60%",
      cyan: "189 85% 43%",
    };
    return map[color] || map.purple;
  };

  const getLayoutClasses = (layout: string) => {
    switch (layout) {
      case "centered":
        return {
          wrapper: "max-w-2xl mx-auto px-4 sm:px-6 py-20 sm:py-24",
          grid: "grid grid-cols-1 gap-6",
          left: "",
          right: "space-y-6",
        };
      case "minimal":
        return {
          wrapper: "max-w-4xl mx-auto px-6 sm:px-10 py-24 sm:py-32",
          grid: "grid grid-cols-1 gap-10",
          left: "",
          right: "space-y-10",
        };
      default:
        return {
          wrapper: "max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-24",
          grid: "grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6",
          left: "lg:col-span-1",
          right: "lg:col-span-2 space-y-6",
        };
    }
  };

  const layoutClasses = getLayoutClasses(profile?.theme_layout || "standard");
  const accentStyle = {
    ["--primary" as any]: getAccentHsl(profile?.theme_accent_color || "purple"),
    ["--ring" as any]: getAccentHsl(profile?.theme_accent_color || "purple"),
  } as React.CSSProperties;

  return (
    <div
      className={`min-h-screen ${getBackgroundClass(profile?.theme_background || "default")} ${getFontClass(profile?.theme_font || "inter")}`}
      style={accentStyle}
    >
      <FloatingNav />

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none opacity-30">
        <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
        {/* Back & Share Buttons */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Share</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Share Profile</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex justify-center p-4 bg-background rounded-lg border">
                  <QRCodeSVG value={profileUrl} size={160} level="H" includeMargin />
                </div>
                <div className="flex gap-2">
                  <Input value={profileUrl} readOnly className="flex-1 text-sm" onClick={(e) => e.currentTarget.select()} />
                  <Button variant="outline" size="icon" onClick={handleCopyLink}>
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <Button onClick={handleNativeShare} className="w-full">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column - Profile Info */}
          <motion.div
            className="lg:col-span-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="glass-card">
              <CardContent className="p-6 space-y-6">
                {/* Avatar */}
                <div className="flex justify-center">
                  <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-primary/20">
                    <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback className="text-2xl sm:text-3xl">
                      {profile.display_name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Name & Username */}
                <div className="text-center space-y-1">
                  <h1 className="text-xl sm:text-2xl font-bold">{profile.display_name}</h1>
                  {profile.username && (
                    <p className="text-xs sm:text-sm text-muted-foreground">@{profile.username}</p>
                  )}
                </div>

                {/* Citizenship Badge */}
                <div className="flex justify-center">
                  <Badge
                    className={`bg-gradient-to-r ${getRankColor(profile.payment_tier)} text-white border-0 px-4 py-2`}
                  >
                    {profile.citizenship_rank || "Visitor"} • Rank {profile.rank_level || 1}
                  </Badge>
                </div>

                {/* Profile Milestone Badges */}
                <div className="flex justify-center">
                  <ProfileMilestoneBadges profile={profile} size="sm" />
                </div>

                {/* Visibility Badge */}
                <div className="flex justify-center">
                  <Badge variant="outline" className="flex items-center gap-1">
                    {getVisibilityIcon()}
                    {profile.profile_visibility === "public" && "Public Profile"}
                    {profile.profile_visibility === "friends_only" && "Friends Only"}
                    {profile.profile_visibility === "private" && "Private"}
                  </Badge>
                </div>

                {/* Bio */}
                {profile.bio && (
                  <p className="text-sm text-muted-foreground text-center">
                    {profile.bio}
                  </p>
                )}

                {/* Meta Info */}
                <div className="space-y-2 text-sm pt-4 border-t border-border">
                  {profile.country && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{profile.country}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Social Links */}
                {(profile.twitter_handle || profile.linkedin_url || profile.github_handle || profile.instagram_handle || profile.website_url) && (
                  <div className="pt-4 border-t border-border space-y-2">
                    <h3 className="text-sm font-semibold mb-3">Connect</h3>
                    {profile.twitter_handle && (
                      <a
                        href={`https://twitter.com/${profile.twitter_handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-[#1DA1F2] transition-colors"
                      >
                        <Twitter className="w-4 h-4" />
                        @{profile.twitter_handle}
                      </a>
                    )}
                    {profile.linkedin_url && (
                      <a
                        href={profile.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-[#0A66C2] transition-colors"
                      >
                        <Linkedin className="w-4 h-4" />
                        LinkedIn
                      </a>
                    )}
                    {profile.github_handle && (
                      <a
                        href={`https://github.com/${profile.github_handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Github className="w-4 h-4" />
                        {profile.github_handle}
                      </a>
                    )}
                    {profile.instagram_handle && (
                      <a
                        href={`https://instagram.com/${profile.instagram_handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-[#E4405F] transition-colors"
                      >
                        <Instagram className="w-4 h-4" />
                        @{profile.instagram_handle}
                      </a>
                    )}
                    {profile.website_url && (
                      <a
                        href={profile.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Website
                      </a>
                    )}
                  </div>
                )}

                {/* Edit Button (own profile only) */}
                {isOwnProfile && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate("/profile/edit")}
                  >
                    Edit Profile
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Right Column - Stats & Achievements */}
          <motion.div
            className="lg:col-span-2 space-y-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Stats Grid */}
            <Card className="glass-card">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-base sm:text-lg">Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="text-center">
                    <div className="text-xl sm:text-3xl font-bold text-primary">
                      {stats.totalXP}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Total XP</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl sm:text-3xl font-bold text-primary">
                      {stats.totalAchievements}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Achievements</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl sm:text-3xl font-bold text-primary">
                      {profile.streak_days || 0}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Day Streak</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Achievements</CardTitle>
              </CardHeader>
              <CardContent>
                {achievements.length > 0 ? (
                  <PremiumBadges achievements={achievements} />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No achievements yet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Pinned Achievement Showcase */}
            <ProfileShowcaseDisplay profile={profile} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
