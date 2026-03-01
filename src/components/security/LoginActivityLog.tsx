/**
 * LoginActivityLog - Shows sign-in history with device/location info.
 * 
 * Usage: <LoginActivityLog userId={user.id} />
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Shield, MapPin, Monitor, AlertTriangle, Loader2, Clock } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface LoginActivityLogProps {
  userId: string;
  maxItems?: number;
}

interface LoginEntry {
  id: string;
  login_method: string;
  device_info: string | null;
  ip_address: string | null;
  user_agent: string | null;
  country: string | null;
  city: string | null;
  is_suspicious: boolean | null;
  created_at: string;
}

export const LoginActivityLog = ({ userId, maxItems = 20 }: LoginActivityLogProps) => {
  const [entries, setEntries] = useState<LoginEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("login_activity")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(maxItems);

      if (!error && data) setEntries(data);
      setLoading(false);
    };
    load();
  }, [userId, maxItems]);

  const getMethodLabel = (method: string) => {
    switch (method) {
      case "password": return "Password";
      case "biometric": return "Biometric";
      case "magic_link": return "Magic Link";
      case "oauth": return "OAuth";
      default: return method;
    }
  };

  const parseDevice = (userAgent: string | null): string => {
    if (!userAgent) return "Unknown device";
    if (userAgent.includes("iPhone") || userAgent.includes("iPad")) return "Apple iOS";
    if (userAgent.includes("Android")) return "Android";
    if (userAgent.includes("Windows")) return "Windows PC";
    if (userAgent.includes("Mac")) return "Mac";
    if (userAgent.includes("Linux")) return "Linux";
    return "Web Browser";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Login Activity</h3>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No login activity recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                entry.is_suspicious
                  ? "border-destructive/40 bg-destructive/5"
                  : "border-border bg-card/30"
              }`}
            >
              <div className={`p-1.5 rounded-lg mt-0.5 ${
                entry.is_suspicious ? "bg-destructive/10" : "bg-primary/10"
              }`}>
                {entry.is_suspicious ? (
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                ) : (
                  <Monitor className="w-4 h-4 text-primary" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground">
                    {getMethodLabel(entry.login_method)}
                  </span>
                  {entry.is_suspicious && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/20 text-destructive font-semibold">
                      SUSPICIOUS
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Monitor className="w-3 h-3" />
                    {entry.device_info || parseDevice(entry.user_agent)}
                  </span>
                  {(entry.city || entry.country) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {[entry.city, entry.country].filter(Boolean).join(", ")}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                </p>
                <p className="text-[10px] text-muted-foreground/60">
                  {format(new Date(entry.created_at), "MMM d, HH:mm")}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
