import { useState, useEffect, useMemo, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  Download,
  X,
  Crown,
  Sparkles,
  Star,
  Trophy,
  Flame,
  Zap,
  Medal,
  Gem,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";

const RARITY: Record<string, { label: string; color: string; glow: string }> = {
  legendary: { label: "LEGENDARY", color: "#F4D27A", glow: "rgba(244,210,122,0.45)" },
  epic: { label: "EPIC", color: "#C9A6FF", glow: "rgba(201,166,255,0.4)" },
  rare: { label: "RARE", color: "#6EB6FF", glow: "rgba(110,182,255,0.4)" },
  uncommon: { label: "UNCOMMON", color: "#5DDBA5", glow: "rgba(93,219,165,0.35)" },
  common: { label: "COMMON", color: "#B7C8DA", glow: "rgba(183,200,218,0.3)" },
};

function computeRarity(level: number, tier?: string) {
  if (level >= 50 || tier === "FOUNDER") return "legendary";
  if (level >= 30) return "epic";
  if (level >= 15) return "rare";
  if (level >= 5) return "uncommon";
  return "common";
}

interface NFTProfileCardProps {
  userId: string;
  onClose?: () => void;
  /** When true, renders as embedded profile card (no overlay) */
  embedded?: boolean;
  /** Compact for dashboard sidebar */
  compact?: boolean;
}

interface ProfileData {
  id: string;
  display_name: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  country?: string;
  rank_level?: number;
  xp_points?: number;
  payment_tier?: string;
  citizenship_rank?: string;
  streak_days?: number;
  achievement_streak?: number;
  created_at?: string;
}

interface AchievementRow {
  id: string;
  name: string;
  icon?: string;
  rarity?: string;
}

export function NFTProfileCard({ userId, onClose, embedded = false, compact = false }: NFTProfileCardProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [achievements, setAchievements] = useState<AchievementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), { stiffness: 200, damping: 20 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: profileData } = await supabase.from("profiles").select("*").eq("id", userId).single();
        if (!cancelled && profileData) setProfile(profileData as ProfileData);

        const { data: ua } = await supabase
          .from("user_achievements")
          .select("achievement_id, achievements ( id, name, icon, rarity )")
          .eq("user_id", userId)
          .limit(12);

        if (!cancelled) {
          const list =
            ua
              ?.map((row: any) => row.achievements)
              .filter(Boolean)
              .map((a: any) => ({
                id: a.id,
                name: a.name,
                icon: a.icon,
                rarity: a.rarity,
              })) || [];
          setAchievements(list);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const level = profile?.rank_level || 1;
  const rarityKey = computeRarity(level, profile?.payment_tier);
  const rarity = RARITY[rarityKey];
  const streak = profile?.achievement_streak ?? profile?.streak_days ?? 0;
  const xp = profile?.xp_points || 0;
  const tokenId = profile?.id
    ? `#${(parseInt(profile.id.replace(/[^0-9]/g, "").slice(0, 4) || "0", 10) % 9999) + 1}`
    : "#\u2014";
  const shortId = profile?.id ? `BPA-${profile.id.slice(0, 8).toUpperCase()}` : "BPA-PENDING";
  const year = profile?.created_at ? new Date(profile.created_at).getFullYear() : new Date().getFullYear();

  const milestones = useMemo(() => {
    return [
      { label: "Profile", done: !!(profile?.display_name && profile?.country) },
      { label: "Lvl 5", done: level >= 5 },
      { label: "Lvl 15", done: level >= 15 },
      { label: "7-day streak", done: streak >= 7 },
      { label: "5 badges", done: achievements.length >= 5 },
    ];
  }, [profile, level, streak, achievements.length]);

  const powerScore = Math.min(
    100,
    Math.round(level * 1.2 + Math.min(xp / 100, 40) + achievements.length * 2 + Math.min(streak, 20))
  );

  const onPointerMove = (e: React.PointerEvent) => {
    if (compact) return;
    const el = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - el.left) / el.width - 0.5);
    my.set((e.clientY - el.top) / el.height - 0.5);
  };
  const onPointerLeave = () => {
    mx.set(0);
    my.set(0);
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `blackpal-${profile?.username || profile?.display_name || "card"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "Saved", description: "Collectible card downloaded" });
    } catch {
      toast({ variant: "destructive", title: "Download failed" });
    }
  };

  const card = (
    <motion.div
      ref={cardRef}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={compact ? undefined : { rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
      className={
        compact
          ? "relative w-full rounded-2xl overflow-hidden"
          : "relative w-full max-w-[340px] mx-auto rounded-2xl overflow-hidden"
      }
    >
      <div
        className="absolute -inset-[1px] rounded-2xl opacity-90"
        style={{
          background: `conic-gradient(from 0deg, ${rarity.color}, transparent 30%, ${rarity.color}88, transparent 60%, ${rarity.color})`,
          animation: compact ? undefined : "nft-spin 6s linear infinite",
        }}
      />
      <div
        className="absolute inset-[1.5px] rounded-2xl"
        style={{
          background: "linear-gradient(165deg, #0b1220 0%, #121a2e 40%, #0a101c 100%)",
          boxShadow: `0 0 40px ${rarity.glow}, inset 0 1px 0 rgba(255,255,255,0.08)`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-30 mix-blend-overlay"
        style={{
          background:
            "linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.35) 45%, transparent 70%)",
          backgroundSize: "200% 200%",
          animation: compact ? undefined : "nft-shimmer 4s ease-in-out infinite",
        }}
      />

      <div className={`relative z-10 ${compact ? "p-3" : "p-4 sm:p-5"} space-y-2.5`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Gem className="w-3 h-3" style={{ color: rarity.color }} />
            <span
              className="text-[9px] sm:text-[10px] font-extrabold tracking-[0.18em]"
              style={{ color: rarity.color }}
            >
              {rarity.label}
            </span>
          </div>
          <span className="text-[9px] font-bold text-white/45 tracking-wider">{tokenId}</span>
        </div>

        <div className="flex flex-col items-center text-center pt-1">
          <div
            className={`relative ${compact ? "w-16 h-16" : "w-20 h-20 sm:w-24 sm:h-24"} rounded-full p-[2px]`}
            style={{
              background: `linear-gradient(135deg, ${rarity.color}, transparent 55%, ${rarity.color})`,
              boxShadow: `0 0 24px ${rarity.glow}`,
            }}
          >
            <div className="w-full h-full rounded-full overflow-hidden bg-[#0d1524] flex items-center justify-center">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
              ) : (
                <span className="text-2xl font-extrabold text-white/80">
                  {profile?.display_name?.charAt(0)?.toUpperCase() || "\u00b7"}
                </span>
              )}
            </div>
            {!compact && (
              <>
                <Sparkles
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 text-amber-300 animate-pulse"
                  style={{ filter: "drop-shadow(0 0 4px #fbbf24)" }}
                />
                <Star
                  className="absolute -bottom-0.5 -left-1 w-3 h-3 text-cyan-300 opacity-80"
                  style={{ animation: "nft-float 3s ease-in-out infinite" }}
                />
              </>
            )}
          </div>

          <h2
            className={`mt-2 font-extrabold text-white leading-tight truncate max-w-full ${
              compact ? "text-sm" : "text-base sm:text-lg"
            }`}
          >
            {loading ? "\u2026" : profile?.display_name || "Trader"}
          </h2>
          {profile?.username && (
            <p className="text-[10px] font-semibold text-white/50">@{profile.username}</p>
          )}
          <p className="text-[9px] font-bold tracking-widest text-white/35 mt-0.5">
            {profile?.citizenship_rank || "Visitor"} \u00b7 L{level}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: "XP", value: xp.toLocaleString(), icon: Zap },
            { label: "STREAK", value: String(streak), icon: Flame },
            { label: "BADGES", value: String(achievements.length), icon: Trophy },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-xl px-1.5 py-1.5 text-center"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <Icon className="w-3 h-3 mx-auto mb-0.5 opacity-70" style={{ color: rarity.color }} />
              <div className="text-[11px] sm:text-xs font-extrabold text-white tabular-nums">{value}</div>
              <div className="text-[8px] font-bold tracking-wider text-white/40">{label}</div>
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[9px] font-bold tracking-wide">
            <span className="text-white/50">COLLECTION POWER</span>
            <span style={{ color: rarity.color }}>{powerScore}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${powerScore}%`,
                background: `linear-gradient(90deg, ${rarity.color}88, ${rarity.color})`,
                boxShadow: `0 0 10px ${rarity.glow}`,
              }}
            />
          </div>
        </div>

        {!compact && (
          <div className="space-y-1.5">
            <div className="text-[9px] font-bold tracking-[0.15em] text-white/45">MILESTONES</div>
            <div className="flex flex-wrap gap-1">
              {milestones.map((m) => (
                <span
                  key={m.label}
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                  style={{
                    background: m.done ? `${rarity.color}22` : "rgba(255,255,255,0.04)",
                    color: m.done ? rarity.color : "rgba(255,255,255,0.35)",
                    border: `1px solid ${m.done ? rarity.color + "55" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  {m.done ? "\u2713 " : ""}
                  {m.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {achievements.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[9px] font-bold tracking-[0.15em] text-white/45 flex items-center gap-1">
              <Medal className="w-3 h-3" /> ACHIEVEMENTS
            </div>
            <div className="flex flex-wrap gap-1">
              {achievements.slice(0, compact ? 4 : 8).map((a) => (
                <span
                  key={a.id}
                  title={a.name}
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md truncate max-w-[7rem]"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: RARITY[a.rarity || "common"]?.color || "#B7C8DA",
                  }}
                >
                  {a.icon ? `${a.icon} ` : ""}
                  {a.name}
                </span>
              ))}
              {achievements.length > (compact ? 4 : 8) && (
                <span className="text-[9px] font-bold text-white/40 px-1">
                  +{achievements.length - (compact ? 4 : 8)}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-white/10">
          <div className="flex items-center gap-1">
            <Crown className="w-3 h-3 text-amber-400/80" />
            <span className="text-[8px] font-bold tracking-widest text-white/40">BLACKPAL ASCEND</span>
          </div>
          <span className="text-[8px] font-mono text-white/35">
            {shortId} \u00b7 {year}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes nft-spin { to { transform: rotate(360deg); } }
        @keyframes nft-shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes nft-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
    </motion.div>
  );

  if (embedded) {
    return <div className="w-full">{card}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-3 sm:p-6">
      <div className="w-full max-w-md flex items-center justify-between mb-3">
        <p className="text-xs font-bold tracking-wide text-white/70">Your collectible identity</p>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/80 hover:text-white"
            onClick={handleDownload}
            title="Download"
          >
            <Download className="w-4 h-4" />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/80 hover:text-white"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      <div style={{ perspective: 900 }} className="w-full max-w-md">
        {card}
      </div>
      <p className="mt-3 text-[10px] font-semibold text-white/40 text-center max-w-xs">
        Display only \u00b7 minting opens when platform-sponsored gas is live
      </p>
    </div>
  );
}

export default NFTProfileCard;
