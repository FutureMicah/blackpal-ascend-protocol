import { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Download, X, Crown, Shield, Sparkles, Star } from "lucide-react";
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
  payment_tier?: string;
  created_at?: string;
}

interface Achievement {
  id: string;
  name: string;
  icon: string;
  rarity: string;
}

// Rarity is computed from rank/xp; founder gets warm gold, the rest stay platinum/ice
const computeRarity = (level: number, tier?: string) => {
  if (tier === "platinum" || level >= 50) return "founder"; // gold accent
  if (level >= 30) return "prestige";
  if (level >= 15) return "elite";
  return "ascendant";
};

const rarityCopy: Record<string, { label: string; archetype: string; lineage: string; aura: string }> = {
  founder:    { label: "FOUNDERS EDITION", archetype: "Sovereign",  lineage: "House of Kings",   aura: "Solar Gold" },
  prestige:   { label: "PRESTIGE",         archetype: "Oracle",      lineage: "House of Sages",   aura: "Platinum Dawn" },
  elite:      { label: "ELITE",            archetype: "Vanguard",    lineage: "House of Builders", aura: "Frost Silver" },
  ascendant:  { label: "ASCENDANT",        archetype: "Initiate",    lineage: "House of Seekers", aura: "Ice Pearl" },
};

export function NFTProfileCard({ userId, onClose }: NFTProfileCardProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Reactive tilt — pointer (desktop) + device orientation (mobile)
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const sx = useSpring(tiltX, { stiffness: 120, damping: 14, mass: 0.4 });
  const sy = useSpring(tiltY, { stiffness: 120, damping: 14, mass: 0.4 });
  const rotateX = useTransform(sy, (v) => v);
  const rotateY = useTransform(sx, (v) => v);
  const sheenX = useTransform(sx, [-12, 12], ["20%", "80%"]);
  const sheenY = useTransform(sy, [-12, 12], ["20%", "80%"]);
  const sheenBg = useTransform(
    [sheenX, sheenY] as any,
    ([x, y]: any) =>
      `radial-gradient(60% 50% at ${x} ${y}, rgba(255,255,255,0.55), rgba(255,255,255,0) 60%)`
  );

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    tiltX.set(px * 18);
    tiltY.set(-py * 18);
  };
  const handlePointerLeave = () => {
    tiltX.set(0);
    tiltY.set(0);
  };

  // Device orientation for phones — gentle parallax
  useEffect(() => {
    const enable = async () => {
      const DOE: any = (window as any).DeviceOrientationEvent;
      if (DOE && typeof DOE.requestPermission === "function") {
        try {
          const res = await DOE.requestPermission();
          if (res !== "granted") return;
        } catch { return; }
      }
      const onOrient = (ev: DeviceOrientationEvent) => {
        // gamma: left/right [-90..90], beta: front/back [-180..180]
        const g = Math.max(-25, Math.min(25, ev.gamma ?? 0));
        const b = Math.max(-25, Math.min(25, (ev.beta ?? 0) - 30));
        tiltX.set((g / 25) * 12);
        tiltY.set((b / 25) * 12);
      };
      window.addEventListener("deviceorientation", onOrient, true);
      return () => window.removeEventListener("deviceorientation", onOrient, true);
    };
    let cleanup: any;
    enable().then((c) => (cleanup = c));
    return () => cleanup && cleanup();
  }, []);


  useEffect(() => {
    (async () => {
      try {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();
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

  // Color tokens per rarity
  const palette = isFounder
    ? {
        accent: "#E9C56A",       // warm gold
        accentSoft: "rgba(233,197,106,0.45)",
        ring: "linear-gradient(135deg,#F6E0A1,#C8943A)",
        chipBg: "linear-gradient(135deg,#FFE7A8,#E9B445)",
        text: "#2A1A05",
        sealText: "#7C5410",
      }
    : {
        accent: "#CFE3F2",        // icy blue
        accentSoft: "rgba(207,227,242,0.45)",
        ring: "linear-gradient(135deg,#F2F6FA,#9FB6CB)",
        chipBg: "linear-gradient(135deg,#FFFFFF,#D6E4F0)",
        text: "#0F1A2B",
        sealText: "#2C4256",
      };

  // SVG patterns inlined for crisp print-grade rendering
  const woven = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'><g fill='none' stroke='${isFounder ? "%23B8862C" : "%23889CB1"}' stroke-width='1' stroke-opacity='0.55'><path d='M0 20 L10 10 L20 20 L30 10 L40 20 L30 30 L20 20 L10 30 Z'/><path d='M0 0 L40 40 M40 0 L0 40' stroke-opacity='0.18'/></g></svg>`
  );
  const mandala = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600'><g fill='none' stroke='${isFounder ? "%23B8862C" : "%237891A8"}' stroke-opacity='0.18' stroke-width='1.2'><circle cx='300' cy='300' r='270'/><circle cx='300' cy='300' r='220'/><circle cx='300' cy='300' r='170'/><circle cx='300' cy='300' r='120'/><g><path d='M300 30 L300 570 M30 300 L570 300 M85 85 L515 515 M515 85 L85 515'/></g><path d='M300 100 l28 60 l66 8 l-48 46 l12 66 l-58 -32 l-58 32 l12 -66 l-48 -46 l66 -8 z'/></g></svg>`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/95 backdrop-blur-xl p-3 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-6xl"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Ascend Collectible</h2>
            <p className="text-white/50 text-xs">Your luxury identity artifact · museum-grade</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
          {/* ===== THE CARD ===== */}
          <div className="flex justify-center">
            <motion.div
              ref={cardRef}
              onPointerMove={handlePointerMove}
              onPointerLeave={handlePointerLeave}
              style={{
                transformStyle: "preserve-3d",
                perspective: "1200px",
                rotateX,
                rotateY,
              }}
              className="relative w-full max-w-[440px] touch-none"
            >
              {/* Outer chrome frame */}
              <div
                className="rounded-[32px] p-[2px] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)]"
                style={{ background: palette.ring }}
              >
                {/* Card body */}
                <div
                  className="relative rounded-[30px] overflow-hidden"
                  style={{
                    background: `
                      radial-gradient(120% 80% at 50% 0%, rgba(255,255,255,0.85), rgba(255,255,255,0.55) 40%, rgba(214,228,240,0.45) 75%, rgba(160,184,205,0.35) 100%),
                      linear-gradient(180deg, #EAF2F8 0%, #F6F9FC 60%, #DCE6EF 100%)
                    `,
                    color: palette.text,
                  }}
                >
                  {/* Mandala watermark */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml;utf8,${mandala}")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center 38%",
                      backgroundSize: "120% auto",
                      opacity: 0.85,
                    }}
                  />
                  {/* Top inner highlight */}
                  <div
                    className="absolute inset-x-0 top-0 h-32 pointer-events-none"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 100%)",
                    }}
                  />
                  {/* Woven kente border */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml;utf8,${woven}")`,
                      backgroundRepeat: "repeat-x",
                      backgroundSize: "40px 40px",
                      backgroundPosition: "center 22px, center calc(100% - 22px)",
                      maskImage:
                        "linear-gradient(180deg, black 0 56px, transparent 56px calc(100% - 56px), black calc(100% - 56px) 100%)",
                      WebkitMaskImage:
                        "linear-gradient(180deg, black 0 56px, transparent 56px calc(100% - 56px), black calc(100% - 56px) 100%)",
                    }}
                  />
                  {/* Corner crests */}
                  <CornerCrest className="top-3 left-3" color={palette.accent} />
                  <CornerCrest className="top-3 right-3" color={palette.accent} flipX />
                  <CornerCrest className="bottom-3 left-3" color={palette.accent} flipY />
                  <CornerCrest className="bottom-3 right-3" color={palette.accent} flipX flipY />

                  {/* ====== Content ====== */}
                  <div className="relative px-7 pt-8 pb-6">
                    {/* Issuer line */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p
                          className="text-[10px] font-semibold tracking-[0.32em] uppercase"
                          style={{ color: palette.sealText }}
                        >
                          BlackPAL · Ascend
                        </p>
                        <p
                          className="text-[10px] tracking-[0.28em] mt-0.5 opacity-70"
                          style={{ color: palette.sealText }}
                        >
                          {meta.archetype} · {meta.lineage}
                        </p>
                      </div>
                      {/* Rarity chip */}
                      <div
                        className="text-[10px] font-bold tracking-[0.2em] px-3 py-1.5 rounded-full shadow-md"
                        style={{ background: palette.chipBg, color: palette.text }}
                      >
                        {meta.label}
                      </div>
                    </div>

                    {/* Divider lozenge */}
                    <div className="flex items-center justify-center my-5">
                      <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${palette.accentSoft}, transparent)` }} />
                      <div
                        className="mx-3 w-2 h-2 rotate-45"
                        style={{ background: palette.accent, boxShadow: `0 0 10px ${palette.accentSoft}` }}
                      />
                      <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${palette.accentSoft}, transparent)` }} />
                    </div>

                    {/* Portrait + name */}
                    <div className="flex items-center gap-4">
                      <div
                        className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0"
                        style={{
                          background: palette.ring,
                          padding: 2,
                        }}
                      >
                        <div className="w-full h-full rounded-[14px] overflow-hidden bg-white/80 flex items-center justify-center">
                          {profile?.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt={profile.display_name}
                              className="w-full h-full object-cover"
                              crossOrigin="anonymous"
                            />
                          ) : (
                            <span className="text-3xl font-black" style={{ color: palette.text }}>
                              {profile?.display_name?.charAt(0).toUpperCase() || "·"}
                            </span>
                          )}
                        </div>
                        {/* Verification crest */}
                        <div
                          className="absolute -bottom-1 -right-1 rounded-full p-1 shadow"
                          style={{ background: palette.chipBg }}
                        >
                          <Shield className="w-3 h-3" style={{ color: palette.sealText }} />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h1
                          className="text-2xl font-bold leading-tight truncate"
                          style={{ color: palette.text, fontFamily: "'Playfair Display', serif" }}
                        >
                          {profile?.display_name || "Ascend Member"}
                        </h1>
                        <p className="text-xs opacity-70 truncate" style={{ color: palette.sealText }}>
                          @{profile?.username || "member"}
                        </p>
                        <div
                          className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider"
                          style={{ background: palette.chipBg, color: palette.text }}
                        >
                          <Crown className="w-3 h-3" />
                          {(profile?.citizenship_rank || "ASCEND").toUpperCase()} · L{level}
                        </div>
                      </div>
                    </div>

                    {/* Hero metric strip */}
                    <div className="grid grid-cols-3 gap-2 mt-5">
                      <Metric label="PRESTIGE" value={(profile?.xp_points || 0).toLocaleString()} palette={palette} />
                      <Metric label="REPUTATION" value={`${Math.min(99, 60 + level)}`} palette={palette} />
                      <Metric label="STREAK" value={`${profile?.streak_days || 0}d`} palette={palette} />
                    </div>

                    {/* Honors / badges row */}
                    <div className="mt-5">
                      <p
                        className="text-[10px] tracking-[0.28em] uppercase mb-2 opacity-70"
                        style={{ color: palette.sealText }}
                      >
                        Honors
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(achievements.length > 0
                          ? achievements.slice(0, 5)
                          : [{ id: "f", name: "Founding Member", icon: "♛", rarity: "legendary" } as Achievement]
                        ).map((a) => (
                          <div
                            key={a.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                            style={{
                              background: "rgba(255,255,255,0.7)",
                              border: `1px solid ${palette.accentSoft}`,
                              color: palette.text,
                            }}
                          >
                            <span className="text-sm leading-none">{a.icon || "✦"}</span>
                            <span className="truncate max-w-[110px]">{a.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Heritage / traits */}
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <Trait label="Aura" value={meta.aura} palette={palette} />
                      <Trait label="Lineage" value={meta.lineage} palette={palette} />
                      <Trait label="Archetype" value={meta.archetype} palette={palette} />
                      <Trait label="Origin" value={profile?.country || "Global"} palette={palette} />
                    </div>

                    {/* Lower divider */}
                    <div className="flex items-center justify-center mt-5 mb-3">
                      <div
                        className="w-2 h-2 rotate-45"
                        style={{ background: palette.accent, boxShadow: `0 0 10px ${palette.accentSoft}` }}
                      />
                    </div>

                    {/* Footer metadata */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <FooterMeta label="PROFILE ID" value={profileShortId} palette={palette} />
                      <FooterMeta label="EDITION" value={editionNumber} palette={palette} accent />
                      <FooterMeta label="MEMBER" value={String(memberYear)} palette={palette} />
                    </div>

                    {/* Mint-ready signature */}
                    <div className="flex items-center justify-between mt-4 text-[9px] tracking-[0.28em] uppercase opacity-60" style={{ color: palette.sealText }}>
                      <span className="inline-flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Mint-Ready
                      </span>
                      <span>blackpal.io · heritage</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reactive glare that tracks tilt / pointer */}
              <motion.div
                aria-hidden
                className="absolute inset-0 rounded-[32px] pointer-events-none mix-blend-overlay"
                style={{
                  background: useTransform(
                    [sheenX, sheenY] as any,
                    ([x, y]: any) =>
                      `radial-gradient(60% 50% at ${x} ${y}, rgba(255,255,255,0.55), rgba(255,255,255,0) 60%)`
                  ),
                }}
              />
            </motion.div>
          </div>

          {/* ===== Side panel ===== */}
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
              <h3 className="text-base font-bold mb-1">Edition Details</h3>
              <Row k="Rarity" v={meta.label} />
              <Row k="Archetype" v={meta.archetype} />
              <Row k="Lineage" v={meta.lineage} />
              <Row k="Aura" v={meta.aura} />
              <Row k="Level" v={`L${level}`} />
              <Row k="Honors" v={String(achievements.length)} />
              <Row k="Edition" v={editionNumber} />
            </Card>

            <Card className="frost-card-dark p-5">
              <h3 className="text-base font-bold mb-2 flex items-center gap-2 text-white">
                <Star className="w-4 h-4" /> Notes
              </h3>
              <p className="text-[12px] text-white/60 leading-relaxed">
                Each Ascend card is a layered glass artifact infused with African heritage motifs —
                kente-inspired weaving, ceremonial mandala, carved corner crests. Founders carry the
                solar gold seal; all others bear the platinum frost crest.
              </p>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ===== Sub-components ===== */

function Metric({ label, value, palette }: { label: string; value: string; palette: any }) {
  return (
    <div
      className="rounded-2xl px-2 py-2 text-center"
      style={{
        background: "rgba(255,255,255,0.7)",
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
        background: "rgba(255,255,255,0.55)",
        border: `1px solid ${palette.accentSoft}`,
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

function FooterMeta({
  label,
  value,
  palette,
  accent,
}: {
  label: string;
  value: string;
  palette: any;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="text-[8px] tracking-[0.28em] opacity-60" style={{ color: palette.sealText }}>
        {label}
      </div>
      <div
        className="text-[11px] font-bold mt-0.5 truncate"
        style={{ color: accent ? palette.accent : palette.text, textShadow: accent ? `0 0 8px ${palette.accentSoft}` : "none" }}
      >
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

function CornerCrest({
  className,
  color,
  flipX,
  flipY,
}: {
  className?: string;
  color: string;
  flipX?: boolean;
  flipY?: boolean;
}) {
  return (
    <div
      className={`absolute w-6 h-6 ${className || ""}`}
      style={{
        transform: `scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`,
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round">
        <path d="M2 8 V2 H8" />
        <path d="M5 5 L11 5 M5 5 L5 11" opacity="0.55" />
        <circle cx="3.5" cy="3.5" r="1" fill={color} />
      </svg>
    </div>
  );
}
