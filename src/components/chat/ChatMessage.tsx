import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Play, Pause, Volume2 } from "lucide-react";
import { format } from "date-fns";

interface Message {
  id: string;
  content: string;
  message_type: string;
  media_url: string | null;
  sticker_id: string | null;
  gif_url: string | null;
  voice_url: string | null;
  video_url: string | null;
  duration_seconds: number | null;
  created_at: string;
}

interface ChatMessageProps {
  message: Message;
  isOwn: boolean;
  friendAvatar: string | null;
}

export const ChatMessage = ({ message, isOwn, friendAvatar }: ChatMessageProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const handlePlayVoice = () => {
    if (!message.voice_url) return;

    if (audioElement) {
      if (isPlaying) {
        audioElement.pause();
        setIsPlaying(false);
      } else {
        audioElement.play();
        setIsPlaying(true);
      }
    } else {
      const audio = new Audio(message.voice_url);
      audio.onended = () => setIsPlaying(false);
      audio.play();
      setAudioElement(audio);
      setIsPlaying(true);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderContent = () => {
    switch (message.message_type) {
      case 'sticker':
        return (
          <img
            src={message.content}
            alt="Sticker"
            className="w-32 h-32 object-contain"
          />
        );

      case 'gif':
        return (
          <img
            src={message.gif_url || message.content}
            alt="GIF"
            className="max-w-[250px] rounded-lg"
          />
        );

      case 'image':
        return (
          <img
            src={message.media_url || message.content}
            alt="Image"
            className="max-w-[250px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          />
        );

      case 'video':
        return (
          <video
            src={message.video_url || message.media_url || message.content}
            controls
            className="max-w-[250px] rounded-lg"
          />
        );

      case 'voice':
        return (
          <div className="flex items-center gap-3 min-w-[180px]">
            <button
              onClick={handlePlayVoice}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                isOwn ? "bg-background/20" : "bg-primary/20"
              )}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-1">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-1 rounded-full transition-all",
                      isOwn ? "bg-background/40" : "bg-primary/40"
                    )}
                    style={{
                      height: `${Math.random() * 16 + 4}px`
                    }}
                  />
                ))}
              </div>
              <span className="text-xs opacity-70">
                {formatDuration(message.duration_seconds)}
              </span>
            </div>
            <Volume2 className="h-4 w-4 opacity-50" />
          </div>
        );

      default:
        return (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-end gap-2",
        isOwn ? "flex-row-reverse" : "flex-row"
      )}
    >
      {!isOwn && (
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
          {friendAvatar ? (
            <img src={friendAvatar} alt="" className="w-8 h-8 object-cover" />
          ) : (
            <span className="text-primary text-sm font-bold">?</span>
          )}
        </div>
      )}

      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-2",
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted rounded-bl-md",
          message.message_type === 'sticker' && "bg-transparent px-0 py-0",
          message.message_type === 'gif' && "bg-transparent px-0 py-0"
        )}
      >
        {renderContent()}
        <div
          className={cn(
            "text-xs mt-1 opacity-70",
            isOwn ? "text-right" : "text-left"
          )}
        >
          {format(new Date(message.created_at), 'HH:mm')}
        </div>
      </div>
    </motion.div>
  );
};
