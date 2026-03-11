import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Send, Trash2, Pause, Play } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface VoiceRecorderProps {
  onComplete: (audioUrl: string, duration: number) => void;
  onCancel: () => void;
}

export const VoiceRecorder = ({ onComplete, onCancel }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    startRecording();
    return () => {
      stopTimer();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      startTimer();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Could not access microphone');
      onCancel();
    }
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleStop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      stopTimer();
      setIsRecording(false);
    }
  };

  const handlePause = () => {
    if (mediaRecorderRef.current) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        startTimer();
      } else {
        mediaRecorderRef.current.pause();
        stopTimer();
      }
      setIsPaused(!isPaused);
    }
  };

  const handleSend = () => {
    if (audioUrl) {
      onComplete(audioUrl, duration);
    }
  };

  const handlePlayPreview = () => {
    if (!audioUrl) return;

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    } else {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlaying(false);
      audio.play();
      audioRef.current = audio;
      setIsPlaying(true);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted">
      {isRecording ? (
        <>
          {/* Recording UI */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="text-destructive"
          >
            <Trash2 className="h-5 w-5" />
          </Button>

          <div className="flex-1 flex items-center gap-2">
            <motion.div
              animate={{ scale: isPaused ? 1 : [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="w-3 h-3 rounded-full bg-destructive"
            />
            <span className="font-mono text-sm">{formatDuration(duration)}</span>

            {/* Waveform visualization */}
            <div className="flex-1 flex items-center gap-0.5 h-6 sm:h-8">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    height: isPaused ? 4 : [4, Math.random() * 20 + 4, 4]
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.3 + Math.random() * 0.2,
                    delay: i * 0.02
                  }}
                  className="w-0.5 sm:w-1 bg-primary rounded-full"
                />
              ))}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handlePause}
          >
            {isPaused ? (
              <Play className="h-5 w-5" />
            ) : (
              <Pause className="h-5 w-5" />
            )}
          </Button>

          <Button
            variant="default"
            size="icon"
            onClick={handleStop}
          >
            <Square className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <>
          {/* Preview UI */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="text-destructive"
          >
            <Trash2 className="h-5 w-5" />
          </Button>

          <div className="flex-1 flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePlayPreview}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>

            <span className="font-mono text-sm">{formatDuration(duration)}</span>

            {/* Static waveform */}
            <div className="flex-1 flex items-center gap-0.5 h-6 sm:h-8">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="w-0.5 sm:w-1 bg-primary/50 rounded-full"
                  style={{ height: `${Math.random() * 16 + 4}px` }}
                />
              ))}
            </div>
          </div>

          <Button
            variant="default"
            size="icon"
            onClick={handleSend}
          >
            <Send className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
};
