import { useState, useRef, useEffect, useMemo } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Download, X, Crown, Shield, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useThemePreview, mergeTheme } from "@/hooks/use-theme-preview";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import html2canvas from "html2canvas";
import heritageFrostBg from "@/assets/theme-heritage-frost.jpg";
import liquidGlassBg from "@/assets/theme-liquid-glass.jpg";

const ACCENT_HSL: Record<string, string> = {
  purple: "280 100% 70%",
  blue: "217 91% 60%",
  green: "142 71% 45%",
  orange: "25 95% 53%",
  pink: "330 81% 60%",
  cyan: "189 85% 43%",
};

const FONT_CLASS: Record<string, string> = {
  inter: "font-sans",
  playfair: "font-serif",
  mono: "font-mono",
  raleway: "font-raleway",
};

const BG_CLASS: Record<string, string> = {
  default: "",
  dark: "bg-gradient-to-br from-gray-900 to-black",
  purple: "bg-gradient-to-br from-purple-900 to-indigo-900",
  ocean: "bg-gradient-to-br from-blue-900 to-cyan-900",
  sunset: "bg-gradient-to-br from-orange-900 to-red-900",
  forest: "bg-gradient-to-br from-green-900 to-emerald-900",
  "royal-blue": "theme-pattern theme-bg-royal-blue",
  "royal-purple": "theme-pattern theme-bg-royal-purple",
  emerald: "theme-pattern theme-bg-emerald",
  "royal-gold": "theme-pattern theme-bg-royal-gold",
  rose: "theme-pattern theme-bg-rose",
  "heritage-frost": "theme-bg-heritage-frost",
  "liquid-glass": "theme-bg-liquid-glass",
};

const bgImageStyle = (bg: string): React.CSSProperties => {
  if (bg === "heritage-frost") return { backgroundImage: `url(${heritageFrostBg})` };
  if (bg === "liquid-glass") return { backgroundImage: `url(${liquidGlassBg})` };
  return {};
};

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
  payment_tier?: string;
  created_at?: string;
  theme_background?: string;
  theme_font?: string;
  theme_layout?: string;
  theme_accent_color?: string;
}

interface Achievement {
  id: string;
  name: string;
  icon: string;
  rarity: string;
}

const computeRarity = (level: number, tier?: string) => {
  if (tier === "platinum" || level >= 50) return "founder";
  if (level >= 30) return "prestige";
  if (level >= 15) return "elite";
  return "ascendant";
};

const rarityCopy: Record<string, { label: string; archetype: string; lineage: string; aura: string }> = {
  founder: { label: "FOUNDERS EDITION", archetype: "Sovereign", lineage: "House of Kings", aura: "Solar Gold" },
  prestige: { label: "PRESTIGE", archetype: "Oracle", lineage: "House of Sages", aura: "Platinum Dawn" },
  elite: { label: "ELITE", archetype: "Vanguard", lineage: "House of Builders", aura: "Frost Silver" },
  ascendant: { label: "ASCENDANT", archetype: "Initiate", lineage: "House of Seekers", aura: "Ice Pearl" },
};

export function NFTProfileCard({ userId, onClose }: NFTProfileCardProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const reduceMotion = usePrefersReducedMotion();

  const previewTheme = useThemePreview();
  const themed = mergeTheme(
    {
      background: profile?.theme_background,
      font: profile?.theme_font,
      layout: profile?.theme_layout,
      accentColor: profile?.theme_accent_color,
    },
    previewTheme
  );
  const accentVarStyle = useMemo(
    () =>
      ({
        ["--primary" as any]: ACCENT_HSL[themed.accentColor] || ACCENT_HSL.purple,
        ["--ring" as any]: ACCENT_HSL[themed.accentColor] || ACCENT_HSL.purple,
        ["--accent" as any]: ACCENT_HSL[themed.accentColor] || ACCENT_HSL.purple,
      } as React.CSSProperties),
    [themed.accentColor]
  );

  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const springCfg = reduceMotion
    ? { stiffness: 0, damping: 100, mass: 1 }
    : { stiffness: 110, damping: 16, mass: 0.5 };
  const sx = useSpring(tiltX, springCfg);
  const sy = useSpring(tiltY, springCfg);
  const rotateX = useTransform(sy, (v) => v);
  const rotateY = useTransform(sx, (v) => v);
  const sheenX = useTransform(sx, [-12, 12], ["20%", "80%"]);
  const sheenY = useTransform(sy, [-12, 12], ["20%", "80%"]);
  const sheenBg = useTransform(
    [sheenX, sheenY] as any,
    ([x, y]: any) =>
      `radial-gradient(60% 50% at ${x} ${y}, rgba(255,255,255,0.55), rgba(255,255,255,0) 60%)`
  );

  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ x: number; y: number } | null>(null);
  const queueTilt = (x: number, y: number) => {
    pendingRef.current = { x, y };
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const p = pendingRef.current;
      if (!p) return;
      tiltX.set(p.x);
      tiltY.set(p.y);
    });
  };
  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduceMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    queueTilt(px * 18, -py * 18);
  };
  const handlePointerLeave = () => queueTilt(0, 0);

  useEffect(() => {
    if (reduceMotion) return;
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return;

    let calibration: { gamma: number; beta: number } | null = null;
    let calibrationFrames = 0;
    let removed = false;

    const clamp = (v: number, lim: number) => Math.max(-lim, Math.min(lim, v));
    const onOrient = (ev: DeviceOrientationEvent) => {
      const g = ev.gamma ?? 0;
      const b = ev.beta ?? 0;
      if (!calibration && calibrationFrames < 10) {
        calibrationFrames++;
        if (calibrationFrames === 10) calibration = { gamma: g, beta: b };
        return;
      }
      const dg = clamp(g - (calibration?.gamma ?? 0), 25);
      const db = clamp(b - (calibration?.beta ?? 0), 25);
      const ax = Math.abs(dg) < 1.5 ? 0 : dg;
      const ay = Math.abs(db) < 1.5 ? 0 : db;
      queueTilt((ax / 25) * 10, (ay / 25) * 10);
    };

    const attach = () => {
      window.addEventListener("deviceorientation", onOrient, { passive: true });
    };

    const DOE: any = (window as any).DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === "function") {
      const ask = async () => {
        try {
          const res = await DOE.requestPermission();
          if (res === "granted" && !removed) attach();
        } catch {
          /* denied */
        } finally {
          window.removeEventListener("touchend", ask);
          window.removeEventListener("click", ask);
        }
      };
      window.addEventListener("touchend", ask, { once: true });
      window.addEventListener("click", ask, { once: true });
      return () => {
        removed = true;
        window.removeEventListener("touchend", ask);
        window.removeEventListener("click", ask);
        window.removeEventListener("deviceorientation", onOrient);
      };
    }

    attach();
    return () => {
      removed = true;
      window.removeEventListener("deviceorientation", onOrient);
    };
  }, [reduceMotion]);

  useEffect(() => {
    (async () => {
      try {
        const { data: profileData } = await supabase.from("profiles").select("*").eq("id", userId).single();
        if (profileData) setProfile(profileData);

        const { data: achievementsData } = await supabase
          .from("user_achievements")
          .select("achievement_id, achievements ( id, name, icon, rarity )")
          .eq("user_id", userId)
          .limit(8);
        setAchievements(
          (achievementsData?.map((ua: any) => ua.achievements).filter(Boolean) || []) as Achievement[]
        );
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const level = profile?.rank_level || 1;
  const rarity = computeRarity(level, profile?.payment_tier);
  const meta = rarityCopy[rarity];
  const isFounder = rarity === "founder";
  const profileShortId = profile?.id ? `BPA-${profile.id.slice(0, 8).toUpperCase()}` : "BPA-PENDING";
  const editionNumber = profile?.id
    ? `#${(parseInt(profile.id.replace(/[^0-9]/g, "").slice(0, 4) || "0", 10) % 9999 + 1)
        .toString()
        .padStart(4, "0")}/10000`
    : "#0001/10000";
  const memberYear = profile?.created_at ? new Date(profile.created_at).getFullYear() : new Date().getFullYear();

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
      link.download = `blackpal-ascend-${profile?.username || "card"}-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();
      toast({ title: "Card exported", description: "Your collectible has been downloaded." });
    } catch (e) {
      toast({ variant: "destructive", title: "Export failed", description: "Please try again." });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-2 border-white/40 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const palette =
    rarity === "founder"
      ? {
          accent: "#F4D27A",
          accentSoft: "rgba(244,210,122,0.45)",
          ring: "linear-gradient(135deg,#F6E0A1,#C8943A 55%,#5C3A0E)",
          chipBg: "linear-gradient(135deg,#FFE7A8,#E9B445)",
          text: "#FAEAC2",
          sealText: "#F4D27A",
          body: `radial-gradient(120% 80% at 50% 0%, rgba(244,210,122,0.18), rgba(0,0,0,0) 60%), linear-gradient(180deg,#1B0F02 0%,#2A1A05 60%,#0A0500 100%)`,
          strokeRGB: "%23E9C56A",
        }
      : rarity === "prestige"
      ? {
          accent: "#C9A6FF",
          accentSoft: "rgba(201,166,255,0.45)",
          ring: "linear-gradient(135deg,#E6D2FF,#7A45D9 55%,#2A0F58)",
          chipBg: "linear-gradient(135deg,#E2CBFF,#9269E6)",
          text: "#EADBFF",
          sealText: "#C9A6FF",
          body: `radial-gradient(120% 80% at 50% 0%, rgba(201,166,255,0.18), rgba(0,0,0,0) 60%), linear-gradient(180deg,#160826 0%,#22103C 55%,#08020F 100%)`,
          strokeRGB: "%23C9A6FF",
        }
      : rarity === "elite"
      ? {
          accent: "#9FB6CB",
          accentSoft: "rgba(159,182,203,0.45)",
          ring: "linear-gradient(135deg,#E8EEF5,#6D8198 55%,#1B2733)",
          chipBg: "linear-gradient(135deg,#E2ECF6,#8FA5BB)",
          text: "#E5EEF7",
          sealText: "#B7C8DA",
          body: `radial-gradient(120% 80% at 50% 0%, rgba(207,227,242,0.14), rgba(0,0,0,0) 60%), linear-gradient(180deg,#0C111A 0%,#162232 60%,#05080D 100%)`,
          strokeRGB: "%239FB6CB",
        }
      : {
          accent: "#B69CFF",
          accentSoft: "rgba(182,156,255,0.4)",
          ring: "linear-gradient(135deg,#CBB5FF,#5A3AC2 55%,#1B0E45)",
          chipBg: "linear-gradient(135deg,#C9B3FF,#7654DF)",
          text: "#E6DCFF",
          sealText: "#B69CFF",
          body: `radial-gradient(120% 80% at 50% 0%, rgba(182,156,255,0.16), rgba(0,0,0,0) 60%), linear-gradient(180deg,#0E0720 0%,#190C36 55%,#04020B 100%)`,
          strokeRGB: "%23B69CFF",
        };

  const mandala = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600'><g fill='none' stroke='${palette.strokeRGB}' stroke-opacity='0.22' stroke-width='1.2'><circle cx='300' cy='300' r='270'/><circle cx='300' cy='300' r='220'/><circle cx='300' cy='300' r='170'/><circle cx='300' cy='300' r='120'/><g><path d='M300 30 L300 570 M30 300 L570 300 M85 85 L515 515 M515 85 L85 515'/></g><path d='M300 100 l28 60 l66 8 l-48 46 l12 66 l-58 -32 l-58 32 l12 -66 l-48 -46 l66 -8 z'/></g></svg>`
  );

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start sm:items-center justify-center backdrop-blur-xl p-3 sm:p-6 overflow-y-auto ${BG_CLASS[themed.background] || ""} ${FONT_CLASS[themed.font] || ""}`}
      style={{
        ...accentVarStyle,
        ...bgImageStyle(themed.background),
        backgroundColor: themed.background === "default" ? "rgba(0,0,0,0.95)" : undefined,
      }}
      data-layout={themed.layout}
    >
      <motion.div
        initial={{ opacity: 0, y: reduceMotion ? 0 : 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-6xl"
      >
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Ascend Collectible</h2>
            <p className="text-white/50 text-xs">NFT-style identity card · mint-ready export</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
          <div className="flex justify-center">
            <motion.div
              ref={cardRef}
              onPointerMove={handlePointerMove}
              onPointerLeave={handlePointerLeave}
              style={{
                transformStyle: "preserve-3d",
                perspective: "1400px",
                rotateX,
                rotateY,
              }}
              className="relative w-full max-w-[380px] touch-none"
            >
              <div
                className="absolute -inset-6 rounded-[40px] blur-2xl opacity-50 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse at 50% 40%, ${palette.accentSoft}, transparent 70%)`,
                }}
              />

              <div
                className="relative rounded-[28px] p-[3px]"
                style={{
                  background: isFounder
                    ? "conic-gradient(from 120deg, #F6E0A1, #C8943A, #FFE7A8, #8B5A12, #F6E0A1)"
                    : `conic-gradient(from 120deg, ${palette.accent}, #ffffff55, ${palette.accent}, #00000088, ${palette.accent})`,
                  boxShadow: `0 30px 60px -20px rgba(0,0,0,0.85), 0 0 40px -10px ${palette.accentSoft}`,
                }}
              >
                {!reduceMotion && (
                  <motion.div
                    aria-hidden
                    className="absolute inset-0 rounded-[28px] pointer-events-none"
                    style={{
                      background:
                        "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.55) 48%, transparent 62%)",
                      backgroundSize: "200% 100%",
                    }}
                    animate={{ backgroundPosition: ["0% 0%", "200% 0%"] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
                  />
                )}

                <div
                  className="relative rounded-[25px] overflow-hidden flex flex-col"
                  style={{
                    background: palette.body,
                    color: palette.text,
                    aspectRatio: "3 / 4.2",
                  }}
                >
                  <div
                    className="absolute inset-0 pointer-events-none opacity-[0.35]"
                    style={{
                      backgroundImage: `url("data:image/svg+xml;utf8,${mandala}")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center 30%",
                      backgroundSize: "140% auto",
                    }}
                  />

                  <div
                    className="relative z-10 flex items-center justify-between px-4 pt-3 pb-2"
                    style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.45), transparent)" }}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black"
                        style={{ background: palette.chipBg, color: "#0a0a0a" }}
                      >
                        BP
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold tracking-[0.2em] uppercase truncate" style={{ color: palette.sealText }}>
                          BlackPAL Ascend
                        </p>
                        <p className="text-[8px] tracking-wider opacity-60 truncate">Genesis · Collectible</p>
                      </div>
                    </div>
                    <div
                      className="text-[9px] font-black tracking-[0.18em] px-2.5 py-1 rounded-md uppercase shrink-0"
                      style={{
                        background: palette.chipBg,
                        color: "#0a0a0a",
                        boxShadow: `0 0 16px ${palette.accentSoft}`,
                      }}
                    >
                      {meta.label}
                    </div>
                  </div>

                  <div className="relative z-10 px-4 mt-1">
                    <div
                      className="relative rounded-2xl overflow-hidden"
                      style={{
                        aspectRatio: "1 / 1",
                        background: palette.ring,
                        padding: 2,
                        boxShadow: `inset 0 0 0 1px ${palette.accentSoft}, 0 12px 30px -12px rgba(0,0,0,0.7)`,
                      }}
                    >
                      <div className="relative w-full h-full rounded-[14px] overflow-hidden bg-black/50">
                        {profile?.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={profile.display_name}
                            className="w-full h-full object-cover"
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center" style={{ background: palette.body }}>
                            <span className="text-6xl font-black" style={{ color: palette.text, opacity: 0.85 }}>
                              {profile?.display_name?.charAt(0).toUpperCase() || "·"}
                            </span>
                          </div>
                        )}
                        {!reduceMotion && (
                          <motion.div
                            aria-hidden
                            className="absolute inset-0 mix-blend-color-dodge pointer-events-none"
                            style={{
                              background:
                                "linear-gradient(125deg, transparent 20%, rgba(255,255,255,0.35) 40%, rgba(180,140,255,0.25) 50%, transparent 70%)",
                              backgroundSize: "250% 250%",
                            }}
                            animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                          />
                        )}
                        <div
                          className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold tracking-wide backdrop-blur-md"
                          style={{
                            background: "rgba(0,0,0,0.55)",
                            border: `1px solid ${palette.accentSoft}`,
                            color: palette.text,
                          }}
                        >
                          <Crown className="w-3 h-3" style={{ color: palette.accent }} />
                          LVL {level}
                        </div>
                        <div
                          className="absolute top-2 right-2 rounded-full p-1.5 backdrop-blur-md"
                          style={{
                            background: "rgba(0,0,0,0.5)",
                            border: `1px solid ${palette.accentSoft}`,
                          }}
                        >
                          <Shield className="w-3.5 h-3.5" style={{ color: palette.accent }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 px-4 pt-3 pb-1">
                    <h1
                      className="text-[22px] font-bold leading-tight truncate"
                      style={{
                        color: palette.text,
                        fontFamily: "'Playfair Display', serif",
                        textShadow: "0 2px 12px rgba(0,0,0,0.45)",
                      }}
                    >
                      {profile?.display_name || "Ascend Member"}
                    </h1>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-[11px] truncate opacity-70" style={{ color: palette.sealText }}>
                        @{profile?.username || "member"}
                      </p>
                      <p className="text-[10px] font-mono tracking-tight opacity-80" style={{ color: palette.accent }}>
                        {editionNumber}
                      </p>
                    </div>
                    <div
                      className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-[0.14em] uppercase"
                      style={{
                        background: "rgba(0,0,0,0.35)",
                        border: `1px solid ${palette.accentSoft}`,
                        color: palette.text,
                      }}
                    >
                      <Star className="w-3 h-3" style={{ color: palette.accent }} />
                      {(profile?.citizenship_rank || "ASCEND").toUpperCase()} · {meta.archetype}
                    </div>
                  </div>

                  <div className="relative z-10 px-4 mt-3 grid grid-cols-3 gap-1.5">
                    <Metric label="XP" value={(profile?.xp_points || 0).toLocaleString()} palette={palette} />
                    <Metric label="STREAK" value={`${profile?.streak_days || 0}d`} palette={palette} />
                    <Metric label="BTAX" value={(profile?.virtual_currency || 0).toLocaleString()} palette={palette} />
                  </div>

                  <div className="relative z-10 px-4 mt-3 grid grid-cols-2 gap-1.5">
                    <Trait label="Aura" value={meta.aura} palette={palette} />
                    <Trait label="Lineage" value={meta.lineage} palette={palette} />
                    <Trait label="Origin" value={profile?.country || "Global"} palette={palette} />
                    <Trait label="Series" value={`${memberYear} Genesis`} palette={palette} />
                  </div>

                  {achievements.length > 0 && (
                    <div className="relative z-10 px-4 mt-3">
                      <p className="text-[8px] tracking-[0.28em] uppercase mb-1.5 opacity-60" style={{ color: palette.sealText }}>
                        Traits · Unlocked
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {achievements.slice(0, 6).map((a) => (
                          <div
                            key={a.id}
                            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-medium"
                            style={{
                              background: "rgba(255,255,255,0.06)",
                              border: `1px solid ${palette.accentSoft}`,
                              color: palette.text,
                            }}
                          >
                            <span className="leading-none">{a.icon || "✦"}</span>
                            <span className="truncate max-w-[72px]">{a.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    className="relative z-10 mt-auto px-4 pt-4 pb-3"
                    style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.55) 0%, transparent 100%)" }}
                  >
                    <div
                      className="h-px mb-2.5"
                      style={{ background: `linear-gradient(90deg, transparent, ${palette.accentSoft}, transparent)` }}
                    />
                    <div className="flex items-end justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[7px] tracking-[0.3em] uppercase opacity-50" style={{ color: palette.sealText }}>
                          Token ID
                        </p>
                        <p className="font-mono text-[10px] font-semibold truncate" style={{ color: palette.accent }}>
                          {profileShortId}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[7px] tracking-[0.3em] uppercase opacity-50" style={{ color: palette.sealText }}>
                          Status
                        </p>
                        <p className="text-[10px] font-bold inline-flex items-center gap-1" style={{ color: palette.text }}>
                          <Sparkles className="w-3 h-3" style={{ color: palette.accent }} />
                          Mint-Ready
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-[8px] tracking-[0.2em] uppercase opacity-40 text-center" style={{ color: palette.sealText }}>
                      blackpal.io · collectible preview
                    </p>
                  </div>
                </div>
              </div>

              <motion.div
                aria-hidden
                className="absolute inset-0 rounded-[28px] pointer-events-none mix-blend-overlay"
                style={{ background: sheenBg as any }}
              />
            </motion.div>
          </div>

          <div className="space-y-4">
            <Card className="frost-card-dark p-5">
              <h3 className="text-base font-bold mb-3 flex items-center gap-2 text-white">
                <Download className="w-4 h-4" /> Export
              </h3>
              <Button
                onClick={handleExport}
                disabled={exporting}
                className="w-full h-11"
                style={{
                  background: isFounder
                    ? "linear-gradient(135deg,#F6E0A1,#C8943A)"
                    : "linear-gradient(135deg,#F2F6FA,#9FB6CB)",
                  color: "#0F1A2B",
                }}
              >
                {exporting ? "Generating…" : "Download PNG"}
              </Button>
              <p className="text-[11px] text-white/50 mt-2 text-center">
                Mint-ready 3× resolution. Perfect for socials & wallets.
              </p>
            </Card>

            <Card className="frost-card-dark p-5 space-y-2 text-sm text-white">
              <h3 className="text-base font-bold mb-2 text-white">Card metadata</h3>
              <Row k="Rarity" v={meta.label} />
              <Row k="Edition" v={editionNumber} />
              <Row k="Token" v={profileShortId} />
              <Row k="Level" v={String(level)} />
              <Row k="Archetype" v={meta.archetype} />
              <Row k="Lineage" v={meta.lineage} />
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Metric({ label, value, palette }: { label: string; value: string; palette: any }) {
  return (
    <div
      className="rounded-2xl px-2 py-2 text-center"
      style={{
        background: "rgba(255,255,255,0.06)",
        border: `1px solid ${palette.accentSoft}`,
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="text-[9px] tracking-[0.22em]" style={{ color: palette.sealText, opacity: 0.7 }}>
        {label}
      </div>
      <div className="text-base font-bold mt-0.5" style={{ color: palette.text }}>
        {value}
      </div>
    </div>
  );
}

function Trait({ label, value, palette }: { label: string; value: string; palette: any }) {
  return (
    <div
      className="rounded-xl px-3 py-2"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: `1px solid ${palette.accentSoft}`,
        backdropFilter: "blur(6px)",
      }}
    >
      <div className="text-[9px] tracking-[0.22em] opacity-65" style={{ color: palette.sealText }}>
        {label.toUpperCase()}
      </div>
      <div className="text-[12px] font-semibold truncate" style={{ color: palette.text }}>
        {value}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-white/50">{k}</span>
      <span className="font-semibold text-white/90">{v}</span>
    </div>
  );
}
