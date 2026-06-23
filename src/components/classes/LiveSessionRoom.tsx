import { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2, Radio, ExternalLink, MessageSquare, X, Mic, MicOff,
  RefreshCw, AlertCircle, ChevronUp, ChevronDown, WifiOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClassChatRoom } from "@/components/classes/ClassChatRoom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOrientation } from "@/hooks/use-orientation";
import { trackClassEvent, startTimer, backoffDelay } from "@/lib/class-analytics";

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

const LOAD_WATCHDOG_MS = 12000;

export const LiveSessionRoom = ({
  open, onClose, session, courseTitle, courseRules, userId, userName, isHost,
}: Props) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(typeof navigator !== "undefined" ? !navigator.onLine : false);
  const [dailyUrl, setDailyUrl] = useState<string | null>(null);
  const [iframeReady, setIframeReady] = useState(false);
  // UI state preserved across orientation changes (component stays mounted).
  const [showChat, setShowChat] = useState(true);
  const [micOn, setMicOn] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const skeletonTimerRef = useRef<((m?: Record<string, unknown>) => number) | null>(null);
  const loadTimerRef = useRef<((m?: Record<string, unknown>) => number) | null>(null);
  const watchdogRef = useRef<number | null>(null);
  const backoffTimerRef = useRef<number | null>(null);

  const isMobile = useIsMobile();
  const orientation = useOrientation();
  const isLandscape = orientation === "landscape";
  const sideChat = !isMobile || isLandscape;

  const provider = session?.provider || "jitsi";
  const room = session?.room_name || (session ? `blackpal-${session.id}` : "");

  const clearWatchdog = () => {
    if (watchdogRef.current) { window.clearTimeout(watchdogRef.current); watchdogRef.current = null; }
  };
  const clearBackoff = () => {
    if (backoffTimerRef.current) { window.clearTimeout(backoffTimerRef.current); backoffTimerRef.current = null; }
  };

  const armWatchdog = () => {
    clearWatchdog();
    watchdogRef.current = window.setTimeout(() => {
      setIframeReady((ready) => {
        if (!ready) {
          setError("The live room is taking longer than expected.");
          void trackClassEvent({
            event_type: "error",
            session_id: session?.id ?? null,
            course_id: session?.course_id ?? null,
            retry_count: retryCount,
            meta: { reason: "watchdog_timeout", provider },
          });
        }
        return ready;
      });
    }, LOAD_WATCHDOG_MS);
  };

  const loadDaily = useCallback(async () => {
    if (!session || provider !== "daily") return;
    setLoading(true);
    setError(null);
    const { data, error: fnErr } = await supabase.functions.invoke("create-daily-room", {
      body: { room_name: room, is_host: !!isHost, user_name: userName },
    });
    if (fnErr || !data?.url) {
      toast.message("Using Jitsi (premium room unavailable).");
      setDailyUrl(`https://meet.jit.si/${room}`);
    } else {
      setDailyUrl(data.url);
    }
    setLoading(false);
  }, [session?.id, provider, room, isHost, userName]);

  // Mount / session change
  useEffect(() => {
    if (!open || !session) {
      clearWatchdog(); clearBackoff();
      setDailyUrl(null); setIframeReady(false); setError(null); setRetryCount(0);
      return;
    }
    setIframeReady(false);
    setError(null);
    skeletonTimerRef.current = startTimer("skeleton_dismissed", { session_id: session.id, course_id: session.course_id ?? null, meta: { provider } });
    loadTimerRef.current = startTimer("session_load_ready", { session_id: session.id, course_id: session.course_id ?? null, meta: { provider } });
    void trackClassEvent({ event_type: "session_load_start", session_id: session.id, course_id: session.course_id ?? null, meta: { provider } });
    if (provider === "daily") void loadDaily();
    armWatchdog();
    return () => {
      clearWatchdog(); clearBackoff();
      if (session) void trackClassEvent({ event_type: "session_end", session_id: session.id, course_id: session.course_id ?? null });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, session?.id, provider]);

  // Online/offline recovery
  useEffect(() => {
    const onOnline = () => {
      setOffline(false);
      if (error) {
        void trackClassEvent({ event_type: "auto_recover", session_id: session?.id ?? null, course_id: session?.course_id ?? null, retry_count: retryCount });
        toast.success("Back online — reconnecting…");
        retryNow(true);
      }
    };
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error, session?.id, retryCount]);

  const jitsiSrc = session
    ? `https://meet.jit.si/${encodeURIComponent(room)}#userInfo.displayName=${encodeURIComponent(userName)}` +
      `&config.prejoinPageEnabled=false&config.startWithAudioMuted=${!isHost && !micOn}&config.startWithVideoMuted=${!isHost}` +
      `&config.disableDeepLinking=true&config.toolbarButtons=%5B%22microphone%22%2C%22camera%22%2C%22hangup%22%2C%22chat%22%2C%22tileview%22%2C%22fullscreen%22%5D`
    : "";

  const toggleMic = () => {
    setMicOn((m) => {
      const next = !m;
      if (provider === "jitsi" && iframeRef.current) {
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ type: "command", name: "toggleAudio" }),
          "https://meet.jit.si",
        );
      }
      toast.success(next ? "Mic unmuted" : "Mic muted");
      return next;
    });
  };

  const retryNow = (immediate = false) => {
    setError(null);
    setIframeReady(false);
    const next = retryCount + 1;
    setRetryCount(next);
    void trackClassEvent({
      event_type: "retry",
      session_id: session?.id ?? null,
      course_id: session?.course_id ?? null,
      retry_count: next,
      meta: { provider, immediate },
    });
    const delay = immediate ? 0 : backoffDelay(next - 1);
    clearBackoff();
    backoffTimerRef.current = window.setTimeout(() => {
      if (provider === "daily") loadDaily();
      else if (iframeRef.current) iframeRef.current.src = jitsiSrc;
      armWatchdog();
    }, delay);
  };

  const onIframeLoad = () => {
    setIframeReady(true);
    clearWatchdog();
    skeletonTimerRef.current?.({ retries: retryCount });
    loadTimerRef.current?.({ retries: retryCount });
    skeletonTimerRef.current = null;
    loadTimerRef.current = null;
  };

  if (!session) return null;

  const VideoPane = (
    <div className="relative w-full h-full bg-black overflow-hidden"> {/* color-audit-allow video-letterbox */}
      {!iframeReady && !error && provider !== "external" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/85" /* color-audit-allow video-letterbox */
          role="status" aria-live="polite">
          <Skeleton className="w-3/4 max-w-md h-2" />
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Connecting to the live room…</p>
        </div>
      )}

      {offline && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 bg-destructive text-destructive-foreground rounded-full px-3 py-1 text-xs flex items-center gap-1.5 shadow-lg" role="alert">
          <WifiOff className="w-3.5 h-3.5" /> Offline — will reconnect when network returns
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/90 px-6 text-center" role="alert" aria-live="assertive"> {/* color-audit-allow video-letterbox */}
          <div className="w-12 h-12 rounded-full bg-destructive/15 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <p className="text-sm text-foreground font-medium">{error}</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            We'll automatically reconnect — or tap retry. Attempt {retryCount + 1}.
          </p>
          <Button onClick={() => retryNow(true)} size="lg" className="min-h-11 px-6 focus-visible:ring-2 focus-visible:ring-ring">
            <RefreshCw className="w-4 h-4 mr-2" /> Retry now
          </Button>
        </div>
      )}

      {provider === "jitsi" && (
        <iframe
          ref={iframeRef}
          src={jitsiSrc}
          allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
          className="w-full h-full border-0 block"
          title={`Live session: ${session.title}`}
          onLoad={onIframeLoad}
        />
      )}
      {provider === "daily" && (
        loading || !dailyUrl ? (
          <div className="flex items-center justify-center h-full text-muted-foreground" role="status" aria-live="polite">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Preparing premium room…
          </div>
        ) : (
          <iframe
            src={dailyUrl}
            allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
            className="w-full h-full border-0 block"
            title={`Live session: ${session.title}`}
            onLoad={onIframeLoad}
          />
        )
      )}
      {provider === "external" && (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
          <p className="text-sm text-muted-foreground">This session uses an external link.</p>
          <Button onClick={() => session.stream_url && window.open(session.stream_url, "_blank")}
            size="lg" className="min-h-11 focus-visible:ring-2 focus-visible:ring-ring">
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
        className="w-screen h-[100dvh] sm:w-[97vw] sm:h-[90vh] max-w-6xl p-0 overflow-hidden bg-black border-primary/30 flex flex-col rounded-none sm:rounded-lg focus-visible:ring-2 focus-visible:ring-ring"
      >
        <DialogHeader className="p-2 sm:p-3 border-b border-border/40 flex-row items-center justify-between gap-2 space-y-0 shrink-0 bg-background/95 backdrop-blur">
          <DialogTitle className="flex items-center gap-2 text-sm min-w-0">
            <Radio className="w-4 h-4 text-red-400 animate-pulse shrink-0" aria-hidden="true" />
            <span className="truncate">{session.title}</span>
            <span className="text-[10px] text-muted-foreground uppercase hidden sm:inline">{provider}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Live class session room. Use the mic toggle to mute or unmute and the chat toggle to show or hide the class chat panel.
          </DialogDescription>
          <div className="flex items-center gap-1 shrink-0">
            {provider === "jitsi" && (
              <Button
                size="sm"
                variant={micOn ? "default" : "outline"}
                onClick={toggleMic}
                aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
                aria-pressed={micOn}
                className="min-h-11 min-w-11 h-11 w-11 sm:h-9 sm:w-auto sm:px-3 p-0 focus-visible:ring-2 focus-visible:ring-ring"
              >
                {micOn ? <Mic className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-1" aria-hidden="true" /> : <MicOff className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-1" aria-hidden="true" />}
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
                className="min-h-11 min-w-11 h-11 w-11 sm:h-9 sm:w-auto sm:px-3 p-0 focus-visible:ring-2 focus-visible:ring-ring"
              >
                {showChat
                  ? (sideChat ? <X className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-1" aria-hidden="true" /> : <ChevronDown className="w-5 h-5" aria-hidden="true" />)
                  : (sideChat ? <MessageSquare className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-1" aria-hidden="true" /> : <ChevronUp className="w-5 h-5" aria-hidden="true" />)}
                <span className="hidden sm:inline text-xs">{showChat ? "Hide" : "Chat"}</span>
              </Button>
            )}
            {provider === "external" && session.stream_url && (
              <Button size="sm" variant="outline"
                onClick={() => window.open(session.stream_url!, "_blank")}
                aria-label="Open external meeting"
                className="min-h-11 h-11 sm:h-9 px-3 focus-visible:ring-2 focus-visible:ring-ring">
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className={`flex-1 min-h-0 flex ${sideChat ? "flex-row" : "flex-col"}`}>
          <div
            className={`relative min-h-0 min-w-0 ${
              sideChat
                ? showChat && session.course_id ? "flex-1 lg:flex-[2]" : "flex-1"
                : showChat && session.course_id ? "h-[55%]" : "flex-1"
            }`}
            data-testid="live-video-pane"
          >
            {VideoPane}
          </div>

          {showChat && ChatPane && (
            sideChat ? (
              <aside className="w-[320px] lg:w-[360px] border-l border-border/40 bg-card/95 backdrop-blur shrink-0" aria-label="Class chat">
                {ChatPane}
              </aside>
            ) : (
              <aside className="flex-1 min-h-0 border-t border-border/40 bg-card/95 backdrop-blur" aria-label="Class chat">
                {ChatPane}
              </aside>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
