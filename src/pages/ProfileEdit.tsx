import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FloatingNav } from "@/components/FloatingNav";
import { NFTProfileCard } from "@/components/NFTProfileCard";
import { ProfileEdit as ProfileEditDialog } from "@/components/ProfileEdit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  MapPin,
  Calendar,
  Share2,
  Copy,
  Check,
  ExternalLink,
  LogOut,
  Settings,
  User,
  Shield,
  Bell,
  Link2,
  Trophy,
  Flame,
  Zap,
  Maximize2,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";

export default function ProfileEdit() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showNft, setShowNft] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [achievementsCount, setAchievementsCount] = useState(0);

  const load = async () => {
    try {
      const {
        data: { user: userData },
      } = await supabase.auth.getUser();

      if (!userData) {
        navigate("/auth");
        return;
      }

      setUser(userData);

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.id)
        .single();

      if (error) throw error;
      setProfile(profileData);

      const { count } = await supabase
        .from("user_achievements")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userData.id);

      setAchievementsCount(count || 0);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Failed to load profile" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const profileUrl = user ? `${window.location.origin}/profile/${user.id}` : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast({ title: "Link copied" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ variant: "destructive", title: "Copy failed" });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.display_name}'s BlackPal Profile`,
          url: profileUrl,
        });
      } catch {
        /* cancelled */
      }
    } else {
      handleCopy();
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  const streak = profile.achievement_streak ?? profile.streak_days ?? 0;
  const xp = profile.xp_points || 0;
  const level = profile.rank_level || 1;

  return (
    <div className="min-h-screen bg-background pb-24">
      <FloatingNav />

      <div className="max-w-3xl mx-auto px-3 sm:px-6 pt-20 sm:pt-24 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Your profile
            </p>
            <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight">
              {profile.display_name || "Trader"}
            </h1>
            {profile.username && (
              <p className="text-xs font-semibold text-muted-foreground">@{profile.username}</p>
            )}
          </div>
          <Badge className="text-[10px] font-bold">
            {profile.citizenship_rank || "Visitor"} · L{level}
          </Badge>
        </div>

        {/* NFT collectible card */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <button
            type="button"
            onClick={() => setShowNft(true)}
            className="w-full max-w-sm mx-auto block text-left rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <NFTProfileCard userId={user.id} embedded compact />
          </button>
          <p className="text-center text-[10px] font-bold text-muted-foreground mt-2">
            Collectible identity · tap to expand · display only
          </p>
        </motion.div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "XP", value: xp.toLocaleString(), icon: Zap },
            { label: "Streak", value: String(streak), icon: Flame },
            { label: "Badges", value: String(achievementsCount), icon: Trophy },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="border-border/60">
              <CardContent className="p-3 text-center">
                <Icon className="w-3.5 h-3.5 mx-auto mb-1 text-primary" />
                <div className="text-sm font-extrabold tabular-nums">{value}</div>
                <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                  {label}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Profile details */}
        <Card className="border-border/60">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <User className="w-4 h-4" /> Details
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3 text-sm">
            {profile.bio && (
              <p className="text-xs font-medium text-muted-foreground leading-relaxed">{profile.bio}</p>
            )}
            <div className="space-y-2 text-xs font-semibold">
              {profile.country && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>{profile.country}</span>
                </div>
              )}
              {profile.phone_number && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="w-3.5 text-center">#</span>
                  <span>{profile.phone_number}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
              </div>
              {profile.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="truncate">{profile.email}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <ProfileEditDialog profile={profile} onUpdate={load}>
                <Button size="sm" className="h-8 text-xs font-bold">
                  Edit profile
                </Button>
              </ProfileEditDialog>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-bold"
                onClick={() => setShowNft(true)}
              >
                <Maximize2 className="w-3.5 h-3.5 mr-1" />
                Full card
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card className="border-border/60">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Settings className="w-4 h-4" /> Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1">
            <SettingsRow
              icon={Link2}
              label="Public profile"
              hint="How others see you"
              onClick={() => navigate(`/profile/${user.id}`)}
            />
            <SettingsRow
              icon={Share2}
              label="Share profile"
              hint="Link & QR code"
              onClick={() => setShowShare(true)}
            />
            <SettingsRow
              icon={Trophy}
              label="Achievements"
              hint="Your badges & milestones"
              onClick={() => navigate("/achievements/hub")}
            />
            <SettingsRow
              icon={Bell}
              label="Notifications"
              hint="Alerts & updates"
              onClick={() => navigate("/blacknotify")}
            />
            <SettingsRow
              icon={Shield}
              label="Dashboard"
              hint="XP, streak, wallet"
              onClick={() => navigate("/dashboard")}
            />
            <SettingsRow
              icon={LogOut}
              label="Sign out"
              hint="End this session"
              danger
              onClick={handleSignOut}
            />
          </CardContent>
        </Card>

        {/* Account meta */}
        <Card className="border-border/60">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-bold">Account</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2 text-[11px] font-semibold text-muted-foreground">
            <div className="flex justify-between gap-2">
              <span>User ID</span>
              <span className="font-mono text-foreground/80 truncate max-w-[60%]">{user.id}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Payment</span>
              <span className="text-foreground/80">
                {profile.payment_completed ? "Active" : "Pending"}
                {profile.payment_tier ? ` · ${profile.payment_tier}` : ""}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Visibility</span>
              <span className="text-foreground/80 capitalize">
                {profile.profile_visibility || "public"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Share dialog */}
      <Dialog open={showShare} onOpenChange={setShowShare}>
        <DialogContent className="sm:max-w-md max-w-[92vw]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Share profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex justify-center p-3 bg-background rounded-lg border">
              <QRCodeSVG value={profileUrl} size={160} level="H" includeMargin className="rounded-lg" />
            </div>
            <div className="flex gap-2">
              <Input
                value={profileUrl}
                readOnly
                className="flex-1 text-[11px] h-9 font-medium"
                onClick={(e) => e.currentTarget.select()}
              />
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <Button onClick={handleShare} className="w-full h-9 text-xs font-bold">
              <Share2 className="w-3.5 h-3.5 mr-1.5" />
              Share
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {showNft && <NFTProfileCard userId={user.id} onClose={() => setShowNft(false)} />}
    </div>
  );
}

function SettingsRow({
  icon: Icon,
  label,
  hint,
  onClick,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-muted/50 transition-colors"
    >
      <div
        className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
          danger ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
        }`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-xs font-bold ${danger ? "text-destructive" : ""}`}>{label}</div>
        <div className="text-[10px] font-medium text-muted-foreground">{hint}</div>
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
    </button>
  );
}
