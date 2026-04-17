// Live trading session clock — Tokyo, London, New York with overlaps.
// Auto-detects user timezone, shows green dot for active sessions.
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface Session {
  name: string;
  city: string;
  openUTC: number; // hour
  closeUTC: number;
  color: string;
}

const SESSIONS: Session[] = [
  { name: "Sydney", city: "AU", openUTC: 22, closeUTC: 7, color: "bg-purple-500" },
  { name: "Tokyo", city: "JP", openUTC: 0, closeUTC: 9, color: "bg-rose-500" },
  { name: "London", city: "UK", openUTC: 8, closeUTC: 17, color: "bg-emerald-500" },
  { name: "New York", city: "US", openUTC: 13, closeUTC: 22, color: "bg-amber-500" },
];

function isOpen(s: Session, hourUTC: number): boolean {
  if (s.openUTC < s.closeUTC) return hourUTC >= s.openUTC && hourUTC < s.closeUTC;
  return hourUTC >= s.openUTC || hourUTC < s.closeUTC;
}

export const SessionClock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hourUTC = now.getUTCHours();
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const openSessions = SESSIONS.filter((s) => isOpen(s, hourUTC));
  const overlap = openSessions.length > 1;

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <h3 className="text-xs font-bold">Trading Sessions</h3>
        </div>
        <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-mono">
          {now.toUTCString().slice(17, 22)} UTC
        </Badge>
      </div>
      <p className="text-[9px] text-muted-foreground mb-2">Local: {localTz}</p>

      <div className="space-y-1.5">
        {SESSIONS.map((s) => {
          const open = isOpen(s, hourUTC);
          return (
            <div
              key={s.name}
              className={`flex items-center gap-2 p-1.5 rounded-md ${
                open ? "bg-muted/40" : "bg-muted/10 opacity-50"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${open ? s.color + " animate-pulse" : "bg-muted"}`} />
              <span className="text-[10px] font-semibold flex-1">{s.name}</span>
              <span className="text-[9px] text-muted-foreground font-mono">
                {String(s.openUTC).padStart(2, "0")}–{String(s.closeUTC).padStart(2, "0")} UTC
              </span>
              {open && <Badge className="h-3.5 text-[8px] px-1">LIVE</Badge>}
            </div>
          );
        })}
      </div>

      {overlap && (
        <div className="mt-2 p-1.5 rounded-md bg-amber-500/10 border border-amber-500/30">
          <p className="text-[9px] font-semibold text-amber-500">⚡ Overlap — peak liquidity</p>
        </div>
      )}
    </Card>
  );
};
