import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Radio, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
  session: {
    id: string;
    title: string;
    provider?: "jitsi" | "daily" | "external" | null;
    room_name?: string | null;
    stream_url?: string | null;
    host_name?: string | null;
  } | null;
  userName: string;
  userEmail?: string;
  isHost?: boolean;
};

export const LiveSessionRoom = ({ open, onClose, session, userName, userEmail, isHost }: Props) => {
  const [loading, setLoading] = useState(false);
  const [dailyUrl, setDailyUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const provider = session?.provider || "jitsi";
  const room = session?.room_name || (session ? `blackpal-${session.id}` : "");

  // Daily.co: fetch a token + room URL from edge function
  useEffect(() => {
    if (!open || !session || provider !== "daily") { setDailyUrl(null); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.functions.invoke("create-daily-room", {
        body: { room_name: room, is_host: !!isHost, user_name: userName },
      });
      if (cancelled) return;
      if (error || !data?.url) {
        toast.error("Could not start the Daily room. Falling back to Jitsi.");
        setDailyUrl(`https://meet.jit.si/${room}`);
      } else {
        setDailyUrl(data.url);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, session?.id, provider]);

  // Jitsi: inject iframe with display name
  const jitsiSrc = session
    ? `https://meet.jit.si/${encodeURIComponent(room)}#userInfo.displayName=${encodeURIComponent(userName)}&config.prejoinPageEnabled=false&config.startWithAudioMuted=true`
    : "";

  if (!session) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] h-[85vh] p-0 overflow-hidden bg-black border-primary/30">
        <DialogHeader className="p-3 border-b border-border/40 flex-row items-center justify-between space-y-0">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Radio className="w-4 h-4 text-red-400 animate-pulse" />
            {session.title}
            <span className="text-[10px] text-muted-foreground ml-2 uppercase">{provider}</span>
          </DialogTitle>
          {provider === "external" && session.stream_url && (
            <Button size="sm" variant="outline" onClick={() => window.open(session.stream_url!, "_blank")}>
              <ExternalLink className="w-3 h-3 mr-1" /> Open
            </Button>
          )}
        </DialogHeader>

        <div ref={containerRef} className="flex-1 w-full h-full bg-black relative">
          {provider === "jitsi" && (
            <iframe
              src={jitsiSrc}
              allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
              className="w-full h-full border-0"
              title={session.title}
            />
          )}

          {provider === "daily" && (
            loading || !dailyUrl ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mr-2" /> Preparing premium room…
              </div>
            ) : (
              <iframe
                src={dailyUrl}
                allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
                className="w-full h-full border-0"
                title={session.title}
              />
            )
          )}

          {provider === "external" && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
              <p className="text-sm text-muted-foreground">This session uses an external link.</p>
              <Button onClick={() => session.stream_url && window.open(session.stream_url, "_blank")}>
                <ExternalLink className="w-4 h-4 mr-2" /> Open meeting
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
