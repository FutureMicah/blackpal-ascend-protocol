import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatMessage } from "./ChatMessage";
import { MediaPicker } from "./MediaPicker";
import { EmojiPicker } from "./EmojiPicker";
import { VoiceRecorder } from "./VoiceRecorder";
import { StickerPicker } from "./StickerPicker";
import { GifPicker } from "./GifPicker";
import { 
  Send, 
  Smile, 
  Paperclip, 
  Mic, 
  Image as ImageIcon,
  Sticker,
  MoreHorizontal,
  ShieldCheck,
  Crown,
  Shield
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface Friend {
  id: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  verification_badge: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: string;
  media_url: string | null;
  sticker_id: string | null;
  gif_url: string | null;
  voice_url: string | null;
  video_url: string | null;
  duration_seconds: number | null;
  created_at: string;
  is_read: boolean;
}

interface ChatRoomProps {
  friend: Friend;
  currentUserId: string;
}

export const ChatRoom = ({ friend, currentUserId }: ChatRoomProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    markMessagesAsRead();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat-${friend.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${currentUserId},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${currentUserId}))`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => [...prev, newMsg]);
          if (newMsg.sender_id === friend.id) {
            markMessagesAsRead();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [friend.id, currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', friend.id)
      .eq('receiver_id', currentUserId)
      .eq('is_read', false);
  };

  const sendMessage = async (
    content: string,
    type: string = 'text',
    extras: Partial<Message> = {}
  ) => {
    if (!content.trim() && type === 'text') return;

    try {
      const { error } = await supabase.from('messages').insert({
        sender_id: currentUserId,
        receiver_id: friend.id,
        content,
        message_type: type,
        ...extras
      });

      if (error) throw error;
      setNewMessage("");
      closeAllPickers();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleSendText = () => {
    sendMessage(newMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
  };

  const handleStickerSelect = (stickerId: string, stickerUrl: string) => {
    sendMessage(stickerUrl, 'sticker', { sticker_id: stickerId });
  };

  const handleGifSelect = (gifUrl: string) => {
    sendMessage(gifUrl, 'gif', { gif_url: gifUrl });
  };

  const handleMediaUpload = async (url: string, type: string) => {
    sendMessage(url, type, { media_url: url });
  };

  const handleVoiceNote = async (audioUrl: string, duration: number) => {
    sendMessage(audioUrl, 'voice', { voice_url: audioUrl, duration_seconds: duration });
  };

  const closeAllPickers = () => {
    setShowEmojiPicker(false);
    setShowStickerPicker(false);
    setShowGifPicker(false);
    setShowMediaPicker(false);
  };

  const getVerificationIcon = (badge: string | null) => {
    switch (badge) {
      case 'gold':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'verified':
        return <ShieldCheck className="h-4 w-4 text-blue-500" />;
      case 'premium':
        return <Shield className="h-4 w-4 text-purple-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full rounded-xl bg-card border border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
          {friend.avatar_url ? (
            <img src={friend.avatar_url} alt="" className="w-10 h-10 object-cover" />
          ) : (
            <span className="text-primary font-bold">{friend.display_name[0]}</span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{friend.display_name}</span>
            {friend.is_verified && getVerificationIcon(friend.verification_badge)}
          </div>
          <span className="text-sm text-muted-foreground">Online</span>
        </div>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Start a conversation with {friend.display_name}</p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isOwn={message.sender_id === currentUserId}
              friendAvatar={friend.avatar_url}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Pickers */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="border-t border-border"
          >
            <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />
          </motion.div>
        )}
        {showStickerPicker && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="border-t border-border"
          >
            <StickerPicker onSelect={handleStickerSelect} onClose={() => setShowStickerPicker(false)} />
          </motion.div>
        )}
        {showGifPicker && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="border-t border-border"
          >
            <GifPicker onSelect={handleGifSelect} onClose={() => setShowGifPicker(false)} />
          </motion.div>
        )}
        {showMediaPicker && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="border-t border-border"
          >
            <MediaPicker onUpload={handleMediaUpload} onClose={() => setShowMediaPicker(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="p-2 sm:p-4 border-t border-border">
        {isRecording ? (
          <VoiceRecorder
            onComplete={handleVoiceNote}
            onCancel={() => setIsRecording(false)}
          />
        ) : (
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Mobile: condensed buttons, Desktop: full buttons */}
            <div className="flex gap-0.5 sm:gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  closeAllPickers();
                  setShowEmojiPicker(!showEmojiPicker);
                }}
                className={`h-8 w-8 sm:h-10 sm:w-10 ${showEmojiPicker ? "bg-primary/20" : ""}`}
              >
                <Smile className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  closeAllPickers();
                  setShowStickerPicker(!showStickerPicker);
                }}
                className={`h-8 w-8 sm:h-10 sm:w-10 ${showStickerPicker ? "bg-primary/20" : ""}`}
              >
                <Sticker className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  closeAllPickers();
                  setShowGifPicker(!showGifPicker);
                }}
                className={`h-8 w-8 sm:h-10 sm:w-10 hidden sm:flex ${showGifPicker ? "bg-primary/20" : ""}`}
              >
                <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  closeAllPickers();
                  setShowMediaPicker(!showMediaPicker);
                }}
                className={`h-8 w-8 sm:h-10 sm:w-10 ${showMediaPicker ? "bg-primary/20" : ""}`}
              >
                <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>

            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 text-sm sm:text-base"
            />

            {/* Always show send button on mobile, or when there's text */}
            <Button 
              onClick={handleSendText} 
              size="icon"
              disabled={!newMessage.trim()}
              className={`h-8 w-8 sm:h-10 sm:w-10 ${!newMessage.trim() ? 'opacity-50' : ''}`}
            >
              <Send className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            
            {/* Voice recording button - hidden on mobile when there's text */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsRecording(true)}
              className={`h-8 w-8 sm:h-10 sm:w-10 ${newMessage.trim() ? 'hidden sm:flex' : ''}`}
            >
              <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
