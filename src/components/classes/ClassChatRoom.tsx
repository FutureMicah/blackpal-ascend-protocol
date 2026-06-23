import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { EmojiPicker } from "@/components/chat/EmojiPicker";
import { StickerPicker } from "@/components/chat/StickerPicker";
import { GifPicker } from "@/components/chat/GifPicker";
import { VoiceRecorder } from "@/components/chat/VoiceRecorder";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Send, Smile, Sticker, Image as ImageIcon, Paperclip, Mic,
  Pin, Shield, Crown, Radio, Volume2, VolumeX, Trash2, ScrollText, Users,
} from "lucide-react";

type Msg = {
  id: string;
  course_id: string;
  session_id: string | null;
  sender_id: string;
  content: string | null;
  message_type: string;
  media_url: string | null;
  media_type: string | null;
  duration_seconds: number | null;
  is_pinned: boolean;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string | null;
  sender_role?: string;
};

type Role = "mentor" | "moderator" | "student" | "muted" | "banned";

interface Props {
  courseId: string;
  courseTitle: string;
  rules?: string | null;
  userId: string;
  userName: string;
  sessionId?: string | null;
  compact?: boolean; // when shown beside a live stream
}

export const ClassChatRoom = ({ courseId, courseTitle, rules, userId, userName, sessionId, compact }: Props) => {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, { name: string; avatar: string | null }>>({});
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const [myRole, setMyRole] = useState<Role>("student");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [recording, setRecording] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isStaff = myRole === "mentor" || myRole === "moderator";
  const muted = myRole === "muted" || myRole === "banned";

  useEffect(() => {
    if (!courseId) return;
    load();
    const ch = supabase
      .channel(`class-chat-${courseId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "class_chat_messages", filter: `course_id=eq.${courseId}` },
        async (p) => {
          const m = p.new as Msg;
          await hydrateOne(m);
          setMsgs((prev) => [...prev, m]);
          setTimeout(scrollDown, 80);
        })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "class_chat_messages", filter: `course_id=eq.${courseId}` },
        (p) => setMsgs((prev) => prev.filter((m) => m.id !== (p.old as any).id)))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "class_chat_messages", filter: `course_id=eq.${courseId}` },
        (p) => setMsgs((prev) => prev.map((m) => m.id === (p.new as any).id ? { ...m, ...(p.new as any) } : m)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [courseId]);

  const load = async () => {
    const [{ data: messages }, { data: roleRows }, { count }] = await Promise.all([
      supabase.from("class_chat_messages").select("*").eq("course_id", courseId).is("deleted_at", null).order("created_at", { ascending: true }).limit(200),
      supabase.from("class_chat_roles").select("*").eq("course_id", courseId),
      supabase.from("class_enrollments").select("*", { count: "exact", head: true }).eq("course_id", courseId),
    ]);
    setMemberCount(count || 0);

    const roleMap: Record<string, Role> = {};
    (roleRows || []).forEach((r: any) => { roleMap[r.user_id] = r.role; });
    setRoles(roleMap);
    setMyRole(roleMap[userId] || "student");

    const senderIds = [...new Set([...(messages || []).map((m: any) => m.sender_id), userId])];
    const { data: profs } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", senderIds);
    const pm: Record<string, { name: string; avatar: string | null }> = {};
    (profs || []).forEach((p: any) => { pm[p.id] = { name: p.display_name || "User", avatar: p.avatar_url }; });
    setProfiles(pm);

    const enriched = (messages || []).map((m: any) => ({
      ...m,
      sender_name: pm[m.sender_id]?.name,
      sender_avatar: pm[m.sender_id]?.avatar,
      sender_role: roleMap[m.sender_id],
    }));
    setMsgs(enriched);
    setTimeout(scrollDown, 100);
  };

  const hydrateOne = async (m: Msg) => {
    if (!profiles[m.sender_id]) {
      const { data } = await supabase.from("profiles").select("display_name, avatar_url").eq("id", m.sender_id).maybeSingle();
      if (data) {
        setProfiles((p) => ({ ...p, [m.sender_id]: { name: (data as any).display_name || "User", avatar: (data as any).avatar_url } }));
        m.sender_name = (data as any).display_name || "User";
        m.sender_avatar = (data as any).avatar_url;
      }
    } else {
      m.sender_name = profiles[m.sender_id].name;
      m.sender_avatar = profiles[m.sender_id].avatar;
    }
    m.sender_role = roles[m.sender_id];
  };

  const scrollDown = () => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });

  const send = async (payload: Partial<Msg>) => {
    if (muted) { toast.error("You are muted in this class chat."); return; }
    setSending(true);
    const { error } = await supabase.from("class_chat_messages").insert({
      course_id: courseId,
      session_id: sessionId || null,
      sender_id: userId,
      ...payload,
    } as any);
    setSending(false);
    if (error) toast.error(error.message);
  };

  const sendText = async () => {
    if (!text.trim()) return;
    await send({ content: text.trim(), message_type: "text" });
    setText("");
    closeAll();
  };

  const sendSticker = (id: string, url: string) => { send({ content: url, message_type: "sticker", media_url: url }); closeAll(); };
  const sendGif = (url: string) => { send({ content: url, message_type: "gif", media_url: url }); closeAll(); };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const ext = f.name.split(".").pop();
    const path = `class-chat/${courseId}/${userId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, f, { contentType: f.type });
    if (upErr) { toast.error("Upload failed"); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const type = f.type.startsWith("image/") ? "image" : f.type.startsWith("video/") ? "video" : "file";
    await send({ content: f.name, message_type: type, media_url: publicUrl, media_type: f.type });
    e.target.value = "";
  };

  const onVoice = async (blob: Blob, durationSec: number) => {
    const path = `class-chat/${courseId}/${userId}/voice-${Date.now()}.webm`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, blob, { contentType: "audio/webm" });
    if (upErr) { toast.error("Voice upload failed"); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    await send({ content: "🎙️ Voice note", message_type: "voice", media_url: publicUrl, duration_seconds: Math.round(durationSec) });
    setRecording(false);
  };

  const togglePin = async (m: Msg) => {
    if (!isStaff) return;
    await supabase.from("class_chat_messages").update({ is_pinned: !m.is_pinned } as any).eq("id", m.id);
  };
  const deleteMsg = async (m: Msg) => {
    if (m.sender_id !== userId && !isStaff) return;
    await supabase.from("class_chat_messages").delete().eq("id", m.id);
  };

  const closeAll = () => { setShowEmoji(false); setShowStickers(false); setShowGif(false); };

  const RoleBadge = ({ role }: { role?: Role | string }) => {
    if (role === "mentor") return <Badge variant="default" className="h-4 px-1 text-[9px] gap-0.5"><Crown className="w-2.5 h-2.5" />Mentor</Badge>;
    if (role === "moderator") return <Badge variant="secondary" className="h-4 px-1 text-[9px] gap-0.5"><Shield className="w-2.5 h-2.5" />Mod</Badge>;
    return null;
  };

  const pinned = msgs.filter((m) => m.is_pinned).slice(-1);

  return (
    <div className={`flex flex-col bg-card/80 border border-border rounded-2xl overflow-hidden ${compact ? "h-full" : "h-[600px]"}`}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-border flex items-center gap-2 bg-card/90 backdrop-blur">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <Radio className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{courseTitle}</p>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Users className="w-2.5 h-2.5" /> {memberCount} enrolled
            {myRole !== "student" && <span className="ml-1">• You: {myRole}</span>}
          </p>
        </div>
        {rules && (
          <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setShowRules((s) => !s)}>
            <ScrollText className="w-3 h-3 mr-1" />Rules
          </Button>
        )}
      </div>

      {/* Rules dropdown */}
      <AnimatePresence>
        {showRules && rules && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-b border-border bg-muted/30 overflow-hidden">
            <div className="p-3 text-[11px] text-muted-foreground whitespace-pre-wrap">{rules}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pinned */}
      {pinned.length > 0 && (
        <div className="px-3 py-1.5 border-b border-border bg-yellow-500/10 flex items-start gap-2">
          <Pin className="w-3 h-3 text-yellow-500 mt-0.5 shrink-0" />
          <p className="text-[11px] text-foreground line-clamp-2">{pinned[0].content || pinned[0].message_type}</p>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef as any}>
        <div className="p-3 space-y-2">
          {msgs.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              <Radio className="w-7 h-7 mx-auto mb-2 opacity-40" />
              Be the first to say hi in class chat 👋
            </div>
          )}
          {msgs.map((m) => {
            const own = m.sender_id === userId;
            if (m.message_type === "system") {
              return (
                <div key={m.id} className="text-center text-[11px] text-muted-foreground py-1 italic">
                  {m.content}
                </div>
              );
            }
            return (
              <div key={m.id} className={`group flex gap-2 ${own ? "flex-row-reverse" : ""}`}>
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden">
                  {m.sender_avatar ? <img src={m.sender_avatar} className="w-full h-full object-cover" alt="" /> : (m.sender_name?.[0] || "U")}
                </div>
                <div className={`max-w-[78%] ${own ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="font-medium">{own ? "You" : m.sender_name || "User"}</span>
                    <RoleBadge role={m.sender_role} />
                    <span>{format(new Date(m.created_at), "h:mm a")}</span>
                    {m.is_pinned && <Pin className="w-2.5 h-2.5 text-yellow-500" />}
                  </div>
                  <div className={`relative rounded-2xl px-3 py-2 text-sm ${own ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {(m.message_type === "sticker" || m.message_type === "gif") && m.media_url ? (
                      <img src={m.media_url} alt="" className="max-w-[180px] rounded-lg" />
                    ) : m.message_type === "image" && m.media_url ? (
                      <img src={m.media_url} alt="" className="max-w-[260px] rounded-lg" />
                    ) : m.message_type === "video" && m.media_url ? (
                      <video src={m.media_url} controls className="max-w-[260px] rounded-lg" />
                    ) : m.message_type === "voice" && m.media_url ? (
                      <audio src={m.media_url} controls className="max-w-[220px]" />
                    ) : m.message_type === "file" && m.media_url ? (
                      <a href={m.media_url} target="_blank" rel="noreferrer" className="underline text-xs flex items-center gap-1">
                        <Paperclip className="w-3 h-3" />{m.content || "file"}
                      </a>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    )}
                  </div>
                  {(isStaff || own) && (
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 text-[10px]">
                      {isStaff && (
                        <button onClick={() => togglePin(m)} className="text-muted-foreground hover:text-yellow-500">
                          <Pin className="w-3 h-3" />
                        </button>
                      )}
                      <button onClick={() => deleteMsg(m)} className="text-muted-foreground hover:text-red-400">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Pickers */}
      <AnimatePresence>
        {showEmoji && <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} className="border-t border-border">
          <EmojiPicker onSelect={(e) => setText((t) => t + e)} onClose={() => setShowEmoji(false)} />
        </motion.div>}
        {showStickers && <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} className="border-t border-border">
          <StickerPicker onSelect={sendSticker} onClose={() => setShowStickers(false)} />
        </motion.div>}
        {showGif && <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} className="border-t border-border">
          <GifPicker onSelect={sendGif} onClose={() => setShowGif(false)} />
        </motion.div>}
      </AnimatePresence>

      {/* Input */}
      <div className="p-2 border-t border-border">
        {muted ? (
          <div className="text-center text-[11px] text-red-400 py-2 flex items-center justify-center gap-1">
            <VolumeX className="w-3 h-3" /> You have been muted by a mentor.
          </div>
        ) : recording ? (
          <VoiceRecorder onComplete={(url, dur) => {
            // VoiceRecorder uploads to its own URL — we re-upload via blob, fall back to using returned URL
            send({ content: "🎙️ Voice note", message_type: "voice", media_url: url, duration_seconds: Math.round(dur) });
            setRecording(false);
          }} onCancel={() => setRecording(false)} />
        ) : (
          <div className="flex items-center gap-1">
            <input type="file" ref={fileRef} hidden onChange={onFile} accept="image/*,video/*,audio/*,application/*" />
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { closeAll(); setShowEmoji((s) => !s); }}><Smile className="w-4 h-4" /></Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { closeAll(); setShowStickers((s) => !s); }}><Sticker className="w-4 h-4" /></Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 hidden sm:flex" onClick={() => { closeAll(); setShowGif((s) => !s); }}><ImageIcon className="w-4 h-4" /></Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => fileRef.current?.click()}><Paperclip className="w-4 h-4" /></Button>
            <Input placeholder={sessionId ? "Message the stream…" : "Message class…"}
              value={text} onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendText())}
              className="flex-1 h-8 text-sm" />
            {text.trim() ? (
              <Button size="icon" className="h-8 w-8" onClick={sendText} disabled={sending}><Send className="w-4 h-4" /></Button>
            ) : (
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setRecording(true)}><Mic className="w-4 h-4" /></Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
