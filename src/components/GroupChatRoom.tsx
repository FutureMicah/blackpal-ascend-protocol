import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Send, Image, Loader2, Paperclip, Hash } from "lucide-react";
import { format } from "date-fns";

interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  sender_name?: string;
}

interface GroupChatRoomProps {
  groupId: string;
  groupName: string;
  userId: string;
  userDisplayName: string;
}

export const GroupChatRoom = ({ groupId, groupName, userId, userDisplayName }: GroupChatRoomProps) => {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMessages();
    loadMembers();

    const channel = supabase
      .channel(`group-${groupId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      }, (payload) => {
        const msg = payload.new as GroupMessage;
        msg.sender_name = profiles[msg.sender_id] || 'User';
        setMessages(prev => [...prev, msg]);
        setTimeout(scrollToBottom, 100);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [groupId]);

  const loadMessages = async () => {
    const { data } = await supabase
      .from('group_messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(200);

    if (data) {
      // Load sender profiles
      const senderIds = [...new Set((data as any[]).map(m => m.sender_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', senderIds);

      const profileMap: Record<string, string> = {};
      profilesData?.forEach((p: any) => { profileMap[p.id] = p.display_name || 'User'; });
      setProfiles(profileMap);

      const enriched = (data as any[]).map(m => ({
        ...m,
        sender_name: profileMap[m.sender_id] || 'User',
      }));
      setMessages(enriched);
      setTimeout(scrollToBottom, 100);
    }
  };

  const loadMembers = async () => {
    const { count } = await supabase
      .from('group_chat_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId);
    setMemberCount(count || 0);
  };

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    setSending(true);

    const { error } = await supabase
      .from('group_messages')
      .insert({
        group_id: groupId,
        sender_id: userId,
        content: newMessage.trim(),
      } as any);

    if (!error) setNewMessage("");
    setSending(false);
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const ext = file.name.split('.').pop();
      const path = `group-chat/${groupId}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { contentType: file.type });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const mediaType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';

      await supabase
        .from('group_messages')
        .insert({
          group_id: groupId,
          sender_id: userId,
          content: `📎 Shared ${mediaType}`,
          media_url: urlData.publicUrl,
          media_type: mediaType,
        } as any);
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();
  const getColor = (id: string) => {
    const colors = ['bg-primary/20 text-primary', 'bg-blue-500/20 text-blue-400', 'bg-green-500/20 text-green-400', 'bg-purple-500/20 text-purple-400', 'bg-orange-500/20 text-orange-400'];
    const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-[500px] rounded-2xl border border-border bg-card/80 backdrop-blur-sm overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-border bg-card/90 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Hash className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground text-sm">{groupName}</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="w-3 h-3" /> {memberCount} members
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No messages yet. Start the conversation!
            </div>
          )}
          {messages.map((msg, i) => {
            const isOwn = msg.sender_id === userId;
            const showName = !isOwn && (i === 0 || messages[i - 1]?.sender_id !== msg.sender_id);

            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} gap-2`}>
                {!isOwn && showName && (
                  <div className={`w-7 h-7 rounded-full ${getColor(msg.sender_id)} flex items-center justify-center text-xs font-bold shrink-0`}>
                    {getInitials(msg.sender_name || 'U')}
                  </div>
                )}
                {!isOwn && !showName && <div className="w-7 shrink-0" />}
                <div className={`max-w-[75%] ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'} rounded-2xl px-3 py-2`}>
                  {showName && !isOwn && (
                    <p className="text-xs font-semibold mb-0.5 opacity-70">{msg.sender_name}</p>
                  )}
                  <p className="text-sm break-words">{msg.content}</p>
                  {msg.media_url && msg.media_type === 'image' && (
                    <img src={msg.media_url} alt="" className="mt-1 rounded-lg max-h-40 object-cover" />
                  )}
                  {msg.media_url && msg.media_type === 'video' && (
                    <video src={msg.media_url} controls className="mt-1 rounded-lg max-h-40 w-full" />
                  )}
                  <p className={`text-xs mt-1 ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                    {format(new Date(msg.created_at), 'h:mm a')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleMediaUpload} />
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" className="shrink-0" onClick={() => fileRef.current?.click()}>
            <Paperclip className="w-4 h-4" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          />
          <Button size="icon" onClick={handleSend} disabled={!newMessage.trim() || sending}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
