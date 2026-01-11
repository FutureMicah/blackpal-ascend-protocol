import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Radio, Users, MessageSquare, Send, Mic, MicOff, 
  Video, VideoOff, Crown, Shield, Star, Plus,
  Search, Filter, Clock, TrendingUp, Zap
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface TradingRoom {
  id: string;
  room_name: string;
  room_description: string;
  room_type: string;
  host_id: string;
  max_participants: number;
  current_participants: number;
  is_live: boolean;
  tags: string[];
  thumbnail_url: string;
}

interface RoomMessage {
  id: string;
  user_id: string;
  content: string;
  message_type: string;
  created_at: string;
  user_name?: string;
}

// Mock rooms for display
const mockRooms: TradingRoom[] = [
  {
    id: "1",
    room_name: "🔥 Bitcoin Analysis Live",
    room_description: "Real-time BTC chart analysis with pro traders",
    room_type: "public",
    host_id: "host1",
    max_participants: 100,
    current_participants: 47,
    is_live: true,
    tags: ["crypto", "bitcoin", "technical"],
    thumbnail_url: "",
  },
  {
    id: "2",
    room_name: "📈 Forex Morning Session",
    room_description: "Daily forex market overview and trade setups",
    room_type: "public",
    host_id: "host2",
    max_participants: 50,
    current_participants: 23,
    is_live: true,
    tags: ["forex", "daily", "setups"],
    thumbnail_url: "",
  },
  {
    id: "3",
    room_name: "💎 Diamond Hands Club",
    room_description: "Premium members only - swing trade discussions",
    room_type: "premium",
    host_id: "host3",
    max_participants: 25,
    current_participants: 18,
    is_live: true,
    tags: ["premium", "swing", "stocks"],
    thumbnail_url: "",
  },
  {
    id: "4",
    room_name: "🎓 Beginner's Corner",
    room_description: "Learn the basics with patient mentors",
    room_type: "public",
    host_id: "host4",
    max_participants: 100,
    current_participants: 65,
    is_live: false,
    tags: ["beginner", "education", "basics"],
    thumbnail_url: "",
  },
];

export const LiveTradingRooms = () => {
  const [rooms, setRooms] = useState<TradingRoom[]>(mockRooms);
  const [selectedRoom, setSelectedRoom] = useState<TradingRoom | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isMuted, setIsMuted] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDesc, setNewRoomDesc] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Mock messages for demo
  const mockMessages: RoomMessage[] = [
    { id: "1", user_id: "u1", content: "Looking at the 4H chart, we have a nice bull flag forming 📈", message_type: "text", created_at: new Date().toISOString(), user_name: "TraderMike" },
    { id: "2", user_id: "u2", content: "Agreed! Support at 67.2k holding strong", message_type: "text", created_at: new Date().toISOString(), user_name: "CryptoQueen" },
    { id: "3", user_id: "u3", content: "What's your take on the RSI divergence?", message_type: "text", created_at: new Date().toISOString(), user_name: "NewTrader42" },
    { id: "4", user_id: "host1", content: "Great observation! The RSI is showing hidden bullish divergence on the daily. This often precedes strong moves. 🎯", message_type: "text", created_at: new Date().toISOString(), user_name: "Host" },
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const joinRoom = (room: TradingRoom) => {
    if (room.room_type === "premium") {
      toast({
        title: "Premium Room",
        description: "Upgrade to access premium trading rooms",
        variant: "destructive",
      });
      return;
    }
    setSelectedRoom(room);
    setMessages(mockMessages);
    toast({
      title: "Joined Room! 🎉",
      description: `Welcome to ${room.room_name}`,
    });
  };

  const leaveRoom = () => {
    setSelectedRoom(null);
    setMessages([]);
  };

  const sendMessage = () => {
    if (!messageInput.trim() || !selectedRoom) return;

    const newMessage: RoomMessage = {
      id: Date.now().toString(),
      user_id: "current_user",
      content: messageInput,
      message_type: "text",
      created_at: new Date().toISOString(),
      user_name: "You",
    };

    setMessages(prev => [...prev, newMessage]);
    setMessageInput("");
  };

  const createRoom = async () => {
    if (!newRoomName.trim()) return;

    const newRoom: TradingRoom = {
      id: Date.now().toString(),
      room_name: newRoomName,
      room_description: newRoomDesc,
      room_type: "public",
      host_id: "current_user",
      max_participants: 100,
      current_participants: 1,
      is_live: true,
      tags: [],
      thumbnail_url: "",
    };

    setRooms(prev => [newRoom, ...prev]);
    setIsCreateOpen(false);
    setNewRoomName("");
    setNewRoomDesc("");
    toast({
      title: "Room Created! 🚀",
      description: "Your trading room is now live",
    });
    joinRoom(newRoom);
  };

  const filteredRooms = rooms.filter(room =>
    room.room_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Room View
  if (selectedRoom) {
    return (
      <div className="flex flex-col h-[600px] rounded-2xl border border-border overflow-hidden">
        {/* Room Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Radio className="w-5 h-5 text-primary" />
              </div>
              {selectedRoom.is_live && (
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              )}
            </div>
            <div>
              <h3 className="font-semibold">{selectedRoom.room_name}</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="w-3 h-3" />
                {selectedRoom.current_participants} participants
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMuted(!isMuted)}
              className={cn(!isMuted && "text-primary")}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            <Button variant="destructive" size="sm" onClick={leaveRoom}>
              Leave
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea ref={scrollRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-3",
                  msg.user_id === "current_user" && "flex-row-reverse"
                )}
              >
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs">
                    {msg.user_name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className={cn(
                  "max-w-[70%]",
                  msg.user_id === "current_user" && "text-right"
                )}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">
                      {msg.user_name}
                    </span>
                    {msg.user_id === selectedRoom.host_id && (
                      <Badge variant="outline" className="text-[10px] px-1">
                        <Crown className="w-2.5 h-2.5 mr-0.5" />
                        Host
                      </Badge>
                    )}
                  </div>
                  <div className={cn(
                    "rounded-2xl px-4 py-2 text-sm",
                    msg.user_id === "current_user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted rounded-bl-sm"
                  )}>
                    {msg.content}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t border-border bg-background">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex gap-2"
          >
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Share your thoughts..."
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!messageInput.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Rooms List View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Radio className="w-6 h-6 text-primary" />
            Live Trading Rooms
          </h2>
          <p className="text-muted-foreground">Join traders in real-time discussions</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Room
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Trading Room</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Room Name</Label>
                <Input
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="e.g., 📈 Daily Market Analysis"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newRoomDesc}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                  placeholder="What will you discuss?"
                />
              </div>
              <Button onClick={createRoom} className="w-full" disabled={!newRoomName.trim()}>
                Go Live
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search rooms..."
          className="pl-10"
        />
      </div>

      {/* Rooms Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredRooms.map((room, index) => (
          <motion.div
            key={room.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card 
              className={cn(
                "cursor-pointer transition-all hover:border-primary/50",
                room.is_live && "ring-1 ring-red-500/20"
              )}
              onClick={() => joinRoom(room)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {room.is_live && (
                      <Badge variant="destructive" className="gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        LIVE
                      </Badge>
                    )}
                    {room.room_type === "premium" && (
                      <Badge className="bg-gradient-to-r from-yellow-600 to-amber-500">
                        <Crown className="w-3 h-3 mr-1" />
                        Premium
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground text-sm">
                    <Users className="w-4 h-4" />
                    {room.current_participants}/{room.max_participants}
                  </div>
                </div>

                <h3 className="font-semibold text-lg mb-1">{room.room_name}</h3>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {room.room_description}
                </p>

                <div className="flex flex-wrap gap-1">
                  {room.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredRooms.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No rooms found. Create one!
        </div>
      )}
    </div>
  );
};
