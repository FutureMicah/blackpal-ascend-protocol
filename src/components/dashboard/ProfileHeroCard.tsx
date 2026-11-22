import { PremiumAvatar } from "@/components/PremiumAvatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Share2, Copy, Check, LogOut, ExternalLink, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ProfileEdit } from "@/components/ProfileEdit";
import { NFTProfileCard } from "@/components/NFTProfileCard";
import { useState, useEffect, Component, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { Input } from "@/components/ui/input";

interface ProfileHeroCardProps {
  profile: any;
  user: any;
  onProfileUpdate?: () => void;
}

/** Catches NFT render errors so the rest of the dashboard stays up. */
class SafeBlock extends Component<{ fallback: ReactNode; children: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() {
    return { err: true };
  }
  componentDidCatch(e: unknown) {
    console.error("ProfileHero safe block:", e);
  }
  render() {
    if (this.state.err) return this.props.fallback;
    return this.props.children;
  }
}

export const ProfileHeroCard = ({ profile, user, onProfileUpdate }: ProfileHeroCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showShareModal, setShowShareModal] = useState(false);
  const [showNftModal, setShowNftModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showNftEmbed, setShowNftEmbed] = useState(true);

  const profileUrl = `${window.location.origin}/profile/${user.id}`;

  useEffect(() => {
    // Prefer NFT card; if it never settles, keep simple avatar layout
    const t = window.setTimeout(() => setShowNftEmbed(true), 0);
    return () => window.clearTimeout(t);
  }, []);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast({ title: "Link copied!" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ variant: "destructive", title: "Failed to copy link" });
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile.display_name}'s BlackPal Profile`,
          text: `Check out ${profile.display_name}'s profile on BlackPal`,
          url: profileUrl,
        });
      } catch {
        /* cancelled */
      }
    } else {
      handleCopyLink();
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out" });
    navigate("/");
  };

  const getRankColor = (tier: string) => {
    if (!tier) return "from-violet-500 to-purple-500";
    if (tier === "NIGERIA") return "from-green-500 to-emerald-500";
    if (tier === "AFRICA") return "from-orange-500 to-amber-500";
    return "from-violet-500 to-purple-500";
  };

  const simpleFallback = (
    <div className="glass-card p-3 space-y-2.5">
      <div className="flex justify-center">
        <PremiumAvatar src={profile.avatar_url || undefined} alt={profile.display_name} size={72} />
      </div>
      <div className="text-center space-y-0.5">
        <h1 className="text-sm font-extrabold truncate">{profile.display_name}</h1>
        {profile.username && (
          <p className="text-[10px] font-semibold text-muted-foreground">@{profile.username}</p>
        )}
      </div>
      <div className="flex justify-center">
        <Badge
          className={`bg-gradient-to-r ${getRankColor(profile.payment_tier)} text-white border-0 px-2 py-0.5 text-[9px] font-bold`}
        >
          {profile.citizenship_rank || "Visitor"} · L{profile.rank_level || 1}
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-1 pt-2 border-t border-border">
        <div className="text-center">
          <div className="text-xs font-extrabold">{Number(profile.xp_points || 0).toLocaleString()}</div>
          <div className="text-[8px] font-bold uppercase text-muted-foreground">XP</div>
        </div>
        <div className="text-center">
          <div className="text-xs font-extrabold">{profile.rank_level || 1}</div>
          <div className="text-[8px] font-bold uppercase text-muted-foreground">Level</div>
        </div>
        <div className="text-center">
          <div className="text-xs font-extrabold">
            {profile.streak_days || profile.achievement_streak || 0}
          </div>
          <div className="text-[8px] font-bold uppercase text-muted-foreground">Streak</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-2.5 sm:space-y-3">
      {/* Collectible card with crash isolation */}
      {showNftEmbed ? (
        <SafeBlock fallback={simpleFallback}>
          <div className="w-full" style={{ minHeight: 220 }}>
            <NFTProfileCard userId={user.id} embedded compact />
          </div>
        </SafeBlock>
      ) : (
        simpleFallback
      )}

      <p className="text-[9px] font-bold tracking-wide text-muted-foreground text-center px-1">
        Profile card · display only
      </p>

      {/* Actions */}
      <div className="glass-card p-2 flex items-center justify-center gap-1.5">
        <ProfileEdit profile={profile} onUpdate={() => onProfileUpdate?.()}>
          <Button variant="outline" size="sm" className="h-8 px-2.5 text-[10px] sm:text-xs font-bold">
            Edit
          </Button>
        </ProfileEdit>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="Full NFT card"
          onClick={() => setShowNftModal(true)}
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </Button>

        <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Share">
              <Share2 className="w-3.5 h-3.5" />
            </Button>
          </DialogTrigger>
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
                  className="flex-1 text-[11px] font-medium h-9"
                  onClick={(e) => e.currentTarget.select()}
                />
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleCopyLink}>
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <Button onClick={handleNativeShare} className="w-full h-9 text-xs font-bold">
                <Share2 className="w-3.5 h-3.5 mr-1.5" />
                Share
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="Public profile"
          onClick={() => navigate(`/profile/${user.id}`)}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          aria-label="Sign out"
          onClick={handleSignOut}
        >
          <LogOut className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Meta */}
      <div className="glass-card p-2.5 space-y-1 text-[10px] sm:text-[11px] font-semibold">
        {profile.country && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{profile.country}</span>
          </div>
        )}
        {profile.created_at && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="w-3 h-3 shrink-0" />
            <span className="truncate">Joined {new Date(profile.created_at).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {showNftModal && (
        <SafeBlock fallback={null}>
          <NFTProfileCard userId={user.id} onClose={() => setShowNftModal(false)} />
        </SafeBlock>
      )}
    </div>
  );
};
