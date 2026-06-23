import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2, Radio, ExternalLink, MessageSquare, X, Mic, MicOff,
  RefreshCw, AlertCircle, ChevronUp, ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClassChatRoom } from "@/components/classes/ClassChatRoom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOrientation } from "@/hooks/use-orientation";

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

export const LiveSessionRoom = ({
  open, onClose, session, courseTitle, courseRules, userId, userName, isHost,
}: Props) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dailyUrl, setDailyUrl] = useState<string | null>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [micOn, setMicOn] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isMobile = useIsMobile();
  const orientation = useOrientation();
  const isLandscape = orientation === "landscape";

  const provider = session?.provider || "jitsi";
  const room = session?.room_name || (session ? `blackpal-${session.id}` : "");

  // On mobile portrait, chat lives as a bottom sheet (collapsed by default to let video breathe).
  // On mobile landscape & desktop, chat is a side panel.
  const sideChat = !isMobile || isLandscape;

  const loadDaily = async () => {
    if (!session || provider !== "daily") return;
    setLoading(true);
    setError(null);
    const { data, error: fnErr } = await supabase.functions.invoke("create-daily-room", {
      body: { room_name: room, is_host: !!isHost, user_name: userName },
    });
    if (fnErr || !data?.url) {
      // Graceful fallback — never leave the user on a stuck loader.
      toast.message("Using Jitsi (premium room unavailable).");
      setDailyUrl(`https://meet.jit.si/${room}`);
    } else {
      setDailyUrl(data.url);
    }
    setLoading(false);
  };

  useEffect(() => {
    setIframeReady(false);
    setError(null);
    if (!open || !session) { setDailyUrl(null); return; }
    if (provider === "daily") {
      let cancelled = false;
      (async () => { if (!cancelled) await loadDaily(); })();
      return () => { cancelled = true; };
    }
    // safety: jitsi shouldn't hang forever — show retry after 12s
    const t = setTimeout(() => {
      setIframeReady((ready) => {
        if (!ready) setError("The live room is taking longer than expected.");
        return ready;
      });
    }, 12000);
    return () => clearTimeout(t);
  }, [open, session?.id, provider]);

  const jitsiSrc = session
    ? `https://meet.jit.si/${encodeURIComponent(room)}#userInfo.displayName=${encodeURIComponent(userName)}` +
      `&config.prejoinPageEnabled=false&config.startWithAudioMuted=${!isHost}&config.startWithVideoMuted=${!isHost}` +
      `&config.disableDeepLinking=true&config.toolbarButtons=%5B%22microphone%22%2C%22camera%22%2C%22hangup%22%2C%22chat%22%2C%22tileview%22%2C%22fullscreen%22%5D`
    : "";

  const toggleMic = () => {
    if (provider !== "jitsi" || !iframeRef.current) return;
    iframeRef.current.contentWindow?.postMessage(
      JSON.stringify({ type: "command", name: "toggleAudio" }),
      "https://meet.jit.si",
    );
    setMicOn((m) => !m);
    toast.success(micOn ? "Mic muted" : "Mic unmuted");
  };

  const retry = () => {
    setError(null);
    setIframeReady(false);
    if (provider === "daily") loadDaily();
    else if (iframeRef.current) iframeRef.current.src = jitsiSrc; // force reload
  };

  if (!session) return null;

  const VideoPane = (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Skeleton while iframe boots */}
      {!iframeReady && !error && provider !== "external" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/80">
          <Skeleton className="w-3/4 max-w-md h-2" />
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Connecting to the live room…</p>
        </div>
      )}

      {/* Error / retry */}
      {error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/90 px-6 text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/15 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <p className="text-sm text-foreground">{error}</p>
          <Button onClick={retry} size="lg" className="min-h-11 px-6">
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </div>
      )}

      {provider === "jitsi" && (
        <iframe
          ref={iframeRef}
          src={jitsiSrc}
          allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
          className="w-full h-full border-0 block"
          title={session.title}
          onLoad={() => setIframeReady(true)}
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
            className="w-full h-full border-0 block"
            title={session.title}
            onLoad={() => setIframeReady(true)}
          />
        )
      )}
      {provider === "external" && (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
          <p className="text-sm text-muted-foreground">This session uses an external link.</p>
          <Button onClick={() => session.stream_url && window.open(session.stream_url, "_blank")}
            size="lg" className="min-h-11">
            <ExternalLink className="w-4 h-4 mr-2" /> Open meeting
          </Button>
        </div>
      )}
    </div>
  );

  const ChatPane = session.course_id && (
    <ClassChatRoom
      courseId={session.course_id}
      courseTitle={courseTitle || session.title}
      rules={courseRules}
      userId={userId}
      userName={userName}
      sessionId={session.id}
      compact
    />
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="w-screen h-[100dvh] sm:w-[97vw] sm:h-[90vh] max-w-6xl p-0 overflow-hidden bg-black border-primary/30 flex flex-col rounded-none sm:rounded-lg"
      >
        {/* Header — sticky, touch-friendly */}
        <DialogHeader className="p-2 sm:p-3 border-b border-border/40 flex-row items-center justify-between gap-2 space-y-0 shrink-0 bg-background/95 backdrop-blur">
          <DialogTitle className="flex items-center gap-2 text-sm min-w-0">
            <Radio className="w-4 h-4 text-red-400 animate-pulse shrink-0" />
            <span className="truncate">{session.title}</span>
            <span className="text-[10px] text-muted-foreground uppercase hidden sm:inline">{provider}</span>
          </DialogTitle>
          <div className="flex items-center gap-1 shrink-0">
            {provider === "jitsi" && (
              <Button
                size="sm"
                variant={micOn ? "default" : "outline"}
                onClick={toggleMic}
                aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
                aria-pressed={micOn}
                className="min-h-11 min-w-11 h-11 w-11 sm:h-9 sm:w-auto sm:px-3 p-0"
              >
                {micOn ? <Mic className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-1" /> : <MicOff className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-1" />}
                <span className="hidden sm:inline text-xs">{micOn ? "On" : "Off"}</span>
              </Button>
            )}
            {session.course_id && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowChat((s) => !s)}
                aria-label={showChat ? "Hide chat" : "Show chat"}
                aria-pressed={showChat}
                className="min-h-11 min-w-11 h-11 w-11 sm:h-9 sm:w-auto sm:px-3 p-0"
              >
                {showChat
                  ? (sideChat ? <X className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-1" /> : <ChevronDown className="w-5 h-5" />)
                  : (sideChat ? <MessageSquare className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-1" /> : <ChevronUp className="w-5 h-5" />)}
                <span className="hidden sm:inline text-xs">{showChat ? "Hide" : "Chat"}</span>
              </Button>
            )}
            {provider === "external" && session.stream_url && (
              <Button size="sm" variant="outline"
                onClick={() => window.open(session.stream_url!, "_blank")}
                className="min-h-11 h-11 sm:h-9 px-3">
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Body — orientation-aware */}
        <div className={`flex-1 min-h-0 flex ${sideChat ? "flex-row" : "flex-col"}`}>
          {/* Video area: fills available space, contained (no crop). */}
          <div
            className={`relative min-h-0 min-w-0 ${
              sideChat
                ? showChat && session.course_id ? "flex-1 lg:flex-[2]" : "flex-1"
                : showChat && session.course_id ? "h-[55%]" : "flex-1"
            }`}
          >
            {VideoPane}
          </div>

          {/* Chat: side on landscape/desktop, bottom sheet on mobile portrait */}
          {showChat && ChatPane && (
            sideChat ? (
              <div className="w-[320px] lg:w-[360px] border-l border-border/40 bg-card/95 backdrop-blur shrink-0">
                {ChatPane}
              </div>
            ) : (
              <div className="flex-1 min-h-0 border-t border-border/40 bg-card/95 backdrop-blur">
                {ChatPane}
              </div>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
