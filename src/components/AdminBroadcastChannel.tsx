import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Megaphone, Send, Image, Video, Mic, Paperclip, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface BroadcastMessage {
  id: string;
  admin_id: string;
  content: string;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
}

interface AdminBroadcastChannelProps {
  userId: string;
  isAdmin: boolean;
}

export const AdminBroadcastChannel = ({ userId, isAdmin }: AdminBroadcastChannelProps) => {
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMessages();
    
    const channel = supabase
      .channel('admin-broadcasts')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'admin_broadcasts',
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as BroadcastMessage]);
        setTimeout(() => scrollToBottom(), 100);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadMessages = async () => {
    const { data } = await supabase
      .from('admin_broadcasts')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(200);
    
    if (data) {
      setMessages(data as any);
      setTimeout(() => scrollToBottom(), 100);
    }
  };

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !isAdmin) return;
    setSending(true);
    
    const { error } = await supabase
      .from('admin_broadcasts')
      .insert({
        admin_id: userId,
        content: newMessage.trim(),
      } as any);

    if (!error) {
      setNewMessage("");
    }
    setSending(false);
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin) return;
    setUploading(true);

    try {
      const ext = file.name.split('.').pop();
      const path = `broadcasts/${Date.now()}.${ext}`;
      
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { contentType: file.type });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      
      const mediaType = file.type.startsWith('image/') ? 'image' 
        : file.type.startsWith('video/') ? 'video' 
        : file.type.startsWith('audio/') ? 'audio' : 'file';

      await supabase
        .from('admin_broadcasts')
        .insert({
          admin_id: userId,
          content: `📎 ${mediaType === 'image' ? 'Image' : mediaType === 'video' ? 'Video' : mediaType === 'audio' ? 'Voice Note' : 'File'} shared`,
          media_url: urlData.publicUrl,
          media_type: mediaType,
        } as any);
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setUploading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-[500px] rounded-2xl border border-border bg-card/80 backdrop-blur-sm overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-border bg-primary/5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Megaphone className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground text-sm">BlackPal Announcements</h3>
          <p className="text-xs text-muted-foreground">Official channel • {isAdmin ? 'Admin' : 'Read only'}</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No announcements yet.
            </div>
          )}
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-primary/5 border border-primary/10"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-primary">📢 Admin</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                </span>
              </div>
              <p className="text-sm text-foreground">{msg.content}</p>
              {msg.media_url && msg.media_type === 'image' && (
                <img src={msg.media_url} alt="" className="mt-2 rounded-lg max-h-48 object-cover" />
              )}
              {msg.media_url && msg.media_type === 'video' && (
                <video src={msg.media_url} controls className="mt-2 rounded-lg max-h-48 w-full" />
              )}
              {msg.media_url && msg.media_type === 'audio' && (
                <audio src={msg.media_url} controls className="mt-2 w-full" />
              )}
            </motion.div>
          ))}
        </div>
      </ScrollArea>

      {/* Admin input */}
      {isAdmin && (
        <div className="p-3 border-t border-border">
          <input ref={fileRef} type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={handleMediaUpload} />
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" className="shrink-0" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Broadcast a message..."
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            />
            <Button size="icon" onClick={handleSend} disabled={!newMessage.trim() || sending}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};
