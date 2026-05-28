// BlackNotify — Apple Watch widget-tile aesthetic.
// Dark deeply-rounded tiles, each with its own accent color + on-tile glyph/data viz,
// inspired by the watchOS modular widget gallery (ref image 2).
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import {
  Bell, TrendingUp, MessageSquare, Trophy, Settings, CheckCheck, Activity,
  Heart, Zap, MapPin, Coffee, Timer, Filter,
} from "lucide-react";
import { FloatingNav } from "@/components/FloatingNav";
import { motion } from "framer-motion";

type Notif = { id: string; type: string; title: string; message: string; time: string; read: boolean };

const TILE_THEMES: Record<string, { accent: string; bg: string; glyph: any }> = {
  trade:       { accent: "#34d399", bg: "from-emerald-500/15 to-emerald-900/5", glyph: TrendingUp },
  social:      { accent: "#60a5fa", bg: "from-sky-500/15 to-sky-900/5",         glyph: MessageSquare },
  achievement: { accent: "#fbbf24", bg: "from-amber-500/20 to-amber-900/5",     glyph: Trophy },
  alert:       { accent: "#f472b6", bg: "from-pink-500/15 to-pink-900/5",       glyph: Heart },
  system:      { accent: "#a78bfa", bg: "from-violet-500/20 to-violet-900/5",   glyph: Bell },
  market:      { accent: "#fb923c", bg: "from-orange-500/20 to-orange-900/5",   glyph: Activity },
};

// Tiny sparkline visual baked into the tile
const Sparkline = ({ color }: { color: string }) => (
  <svg viewBox="0 0 80 24" className="w-full h-6 mt-1.5">
    {Array.from({ length: 20 }).map((_, i) => {
      const h = 4 + Math.abs(Math.sin(i * 0.9 + Math.cos(i))) * 16;
      return (
        <rect
          key={i}
          x={i * 4}
          y={24 - h}
          width="2.4"
          height={h}
          rx="1.2"
          fill={color}
          opacity={0.55 + (i / 30)}
        />
      );
    })}
  </svg>
);

const ArcMeter = ({ color, value }: { color: string; value: number }) => (
  <svg viewBox="0 0 64 36" className="w-16 h-9">
    <path d="M4 32 A 28 28 0 0 1 60 32" fill="none" stroke={`${color}33`} strokeWidth="4" strokeLinecap="round" />
    <path
      d="M4 32 A 28 28 0 0 1 60 32"
      fill="none"
      stroke={color}
      strokeWidth="4"
      strokeLinecap="round"
      strokeDasharray={88}
      strokeDashoffset={88 - (88 * value) / 100}
    />
  </svg>
);

const BlackNotify = () => {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const seed: Notif[] = [
      { id: "s1", type: "trade",       title: "EUR/USD",       message: "Bullish setup · 1.0850", time: "5m", read: false },
      { id: "s2", type: "achievement", title: "Streak ×7",     message: "7-day journal streak",   time: "1h", read: false },
      { id: "s3", type: "social",      title: "New comment",   message: "Shadow Trader replied",  time: "2h", read: false },
      { id: "s4", type: "market",      title: "BTC surge",     message: "+4.2% in last hour",     time: "3h", read: true  },
      { id: "s5", type: "alert",       title: "Heart-rate",    message: "Elevated · session 2",   time: "4h", read: true  },
      { id: "s6", type: "system",      title: "Backup ready",  message: "Cloud sync complete",    time: "6h", read: true  },
    ];
    setNotifs(seed);
    setUnread(seed.filter((n) => !n.read).length);
  }, []);

  function _relTime(iso: string) {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  }

  const markAllRead = () => { setNotifs((n) => n.map((x) => ({ ...x, read: true }))); setUnread(0); };

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <FloatingNav />
      <div className="max-w-3xl mx-auto px-3 sm:px-5 pt-16 pb-8">
        {/* Header */}
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">
              {new Date().toLocaleDateString(undefined, { weekday: "long" })}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Notifications</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={markAllRead} className="h-8 px-3 rounded-full bg-white/5 border border-white/10 text-[10px] flex items-center gap-1">
              <CheckCheck className="w-3 h-3" /> Mark read
            </button>
            <button className="h-8 w-8 rounded-full bg-white/5 border border-white/10 grid place-items-center">
              <Filter className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tile grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 auto-rows-[112px]">
          {notifs.map((n, i) => {
            const theme = TILE_THEMES[n.type] || TILE_THEMES.system;
            const Glyph = theme.glyph;
            // vary spans for the watchOS gallery look
            const wide = i % 5 === 0;
            const tall = i % 7 === 3;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                className={`relative rounded-[26px] p-3 overflow-hidden bg-gradient-to-br ${theme.bg}
                  border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]
                  ${wide ? "col-span-2" : ""} ${tall ? "row-span-2" : ""}`}
                style={{ background: `radial-gradient(120% 80% at 0% 0%, ${theme.accent}1f, transparent 60%), #0a0a0c` }}
              >
                <div className="flex items-start justify-between">
                  <Glyph className="w-4 h-4" style={{ color: theme.accent }} />
                  <span className="text-[9px] text-white/45 tabular-nums">{n.time}</span>
                </div>
                <h3 className="mt-2 text-[12px] font-semibold leading-tight truncate" style={{ color: theme.accent }}>
                  {n.title}
                </h3>
                <p className="text-[10px] text-white/65 leading-snug line-clamp-2 mt-0.5">{n.message}</p>

                {/* embedded mini-viz, varies by tile */}
                {n.type === "trade"   && <Sparkline color={theme.accent} />}
                {n.type === "market"  && <Sparkline color={theme.accent} />}
                {n.type === "alert"   && <div className="mt-1.5"><ArcMeter color={theme.accent} value={72} /></div>}
                {n.type === "achievement" && (
                  <div className="mt-2 flex items-center gap-1 text-[9px] text-white/60">
                    <Zap className="w-3 h-3" style={{ color: theme.accent }} /> +120 XP
                  </div>
                )}

                {!n.read && (
                  <span
                    className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full"
                    style={{ background: theme.accent, boxShadow: `0 0 10px ${theme.accent}` }}
                  />
                )}
              </motion.div>
            );
          })}

          {/* a couple of static "complication" tiles like the reference */}
          <div className="rounded-[26px] p-3 bg-[#0a0a0c] border border-white/10 col-span-1">
            <Coffee className="w-4 h-4 text-orange-400" />
            <p className="mt-2 text-[10px] text-white/55">Session</p>
            <p className="text-[15px] font-semibold text-orange-400">16s <span className="text-white/40 text-[10px]">left</span></p>
          </div>
          <div className="rounded-[26px] p-3 bg-[#0a0a0c] border border-white/10 col-span-1">
            <Timer className="w-4 h-4 text-cyan-400" />
            <p className="mt-2 text-[10px] text-white/55">Next event</p>
            <p className="text-[15px] font-semibold text-cyan-400">1:36</p>
          </div>
          <div className="rounded-[26px] p-3 bg-[#0a0a0c] border border-white/10 col-span-1">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <p className="mt-2 text-[10px] text-white/55">Delivery</p>
            <p className="text-[12px] font-semibold text-emerald-400 leading-tight">15-30 min</p>
          </div>
        </div>

        {/* Preferences */}
        <div className="mt-6 rounded-[24px] p-4 bg-[#0a0a0c] border border-white/10">
          <h2 className="text-xs font-semibold mb-3 flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5" /> Preferences
          </h2>
          <div className="space-y-1.5">
            {[
              { title: "Trade Signals",  desc: "New opportunities" },
              { title: "Social",         desc: "Likes, comments, follows" },
              { title: "Achievements",   desc: "Milestones & badges" },
              { title: "Market alerts",  desc: "Major movements" },
            ].map((p, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03]">
                <div>
                  <p className="text-[11px] font-medium">{p.title}</p>
                  <p className="text-[9px] text-white/45">{p.desc}</p>
                </div>
                <Switch defaultChecked className="scale-75" />
              </div>
            ))}
          </div>
        </div>
        <div className="h-8" />
        <div className="text-center text-[9px] text-white/30">{unread} unread · live sync on</div>
      </div>
    </div>
  );
};

export default BlackNotify;
