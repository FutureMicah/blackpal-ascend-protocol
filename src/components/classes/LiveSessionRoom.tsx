import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Radio, ExternalLink, MessageSquare, X, Mic, MicOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClassChatRoom } from "@/components/classes/ClassChatRoom";

type Props = {
  open: boolean;
  onClose: () => void;
  session: {
    id: string;
    title: string;
    course_id?: string | null;
    provider?: "jitsi" | "daily" | "external" | null;
    room_name?: string | null;
    stream_url?: string | null;
    host_name?: string | null;
  } | null;
  courseTitle?: string;
  courseRules?: string | null;
  userId: string;
  userName: string;
  isHost?: boolean;
};

export const LiveSessionRoom = ({ open, onClose, session, courseTitle, courseRules, userId, userName, isHost }: Props) => {
  const [loading, setLoading] = useState(false);
  const [dailyUrl, setDailyUrl] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(true);
  const [micOn, setMicOn] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const provider = session?.provider || "jitsi";
  const room = session?.room_name || (session ? `blackpal-${session.id}` : "");

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
        toast.error("Daily.co not configured yet — using Jitsi.");
        setDailyUrl(`https://meet.jit.si/${room}`);
      } else setDailyUrl(data.url);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, session?.id, provider]);

  // Jitsi iframe — student joins muted, host joins with audio on
  const jitsiSrc = session
    ? `https://meet.jit.si/${encodeURIComponent(room)}#userInfo.displayName=${encodeURIComponent(userName)}` +
      `&config.prejoinPageEnabled=false&config.startWithAudioMuted=${!isHost}&config.startWithVideoMuted=${!isHost}` +
      `&config.disableDeepLinking=true&config.toolbarButtons=%5B%22microphone%22%2C%22camera%22%2C%22hangup%22%2C%22chat%22%5D`
    : "";

  // Best-effort mic toggle via Jitsi iframe postMessage
  const toggleMic = () => {
    if (provider !== "jitsi" || !iframeRef.current) return;
    iframeRef.current.contentWindow?.postMessage(
      JSON.stringify({ type: "command", name: "toggleAudio" }),
      "https://meet.jit.si",
    );
    setMicOn((m) => !m);
    toast.success(micOn ? "Mic muted" : "Mic unmuted");
  };

  if (!session) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl w-[97vw] h-[90vh] p-0 overflow-hidden bg-black border-primary/30 flex flex-col">
        <DialogHeader className="p-3 border-b border-border/40 flex-row items-center justify-between space-y-0 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Radio className="w-4 h-4 text-red-400 animate-pulse" />
            {session.title}
            <span className="text-[10px] text-muted-foreground ml-2 uppercase">{provider}</span>
          </DialogTitle>
          <div className="flex items-center gap-1">
            {provider === "jitsi" && (
              <Button size="sm" variant={micOn ? "default" : "outline"} onClick={toggleMic} className="h-7 text-[11px]">
                {micOn ? <Mic className="w-3 h-3 mr-1" /> : <MicOff className="w-3 h-3 mr-1" />}
                {micOn ? "Mic on" : "Mic off"}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setShowChat((s) => !s)} className="h-7 text-[11px]">
              {showChat ? <X className="w-3 h-3 mr-1" /> : <MessageSquare className="w-3 h-3 mr-1" />}
              {showChat ? "Hide chat" : "Show chat"}
            </Button>
            {provider === "external" && session.stream_url && (
              <Button size="sm" variant="outline" onClick={() => window.open(session.stream_url!, "_blank")} className="h-7 text-[11px]">
                <ExternalLink className="w-3 h-3 mr-1" /> Open
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 flex min-h-0">
          {/* Video pane */}
          <div className={`relative bg-black ${showChat && session.course_id ? "flex-1 lg:flex-[2]" : "flex-1"}`}>
            {provider === "jitsi" && (
              <iframe
                ref={iframeRef}
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

          {/* Side chat — only when course is linked */}
          {showChat && session.course_id && (
            <div className="hidden md:flex w-[360px] border-l border-border/40 bg-card/95 backdrop-blur">
              <ClassChatRoom
                courseId={session.course_id}
                courseTitle={courseTitle || session.title}
                rules={courseRules}
                userId={userId}
                userName={userName}
                sessionId={session.id}
                compact
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
