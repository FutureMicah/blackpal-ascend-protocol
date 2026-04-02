import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Send, Plus, Clock, CheckCircle, AlertCircle,
  Loader2, Headphones, X, ChevronDown
} from "lucide-react";

interface Ticket {
  id: string;
  subject: string;
  message: string;
  priority: string;
  status: string;
  category: string;
  admin_reply: string | null;
  admin_replied_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SupportChatProps {
  userId: string;
}

export function SupportChat({ userId }: SupportChatProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newPriority, setNewPriority] = useState("normal");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTickets();

    const channel = supabase
      .channel(`support-${userId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "support_tickets",
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        if (payload.eventType === "INSERT") {
          setTickets(prev => [payload.new as Ticket, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          setTickets(prev => prev.map(t => t.id === (payload.new as any).id ? payload.new as Ticket : t));
          if ((payload.new as any).admin_reply && !(payload.old as any).admin_reply) {
            toast.success("Admin replied to your ticket!", { description: (payload.new as any).subject });
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const loadTickets = async () => {
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setTickets((data || []) as Ticket[]);
    setLoading(false);
  };

  const createTicket = async () => {
    if (!newSubject.trim() || !newMessage.trim()) {
      toast.error("Please fill in subject and message");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("support_tickets").insert({
      user_id: userId,
      subject: newSubject.trim(),
      message: newMessage.trim(),
      category: newCategory,
      priority: newPriority,
    });
    if (error) {
      toast.error("Failed to create ticket");
    } else {
      toast.success("Ticket created! We'll respond shortly.");
      setShowNew(false);
      setNewSubject("");
      setNewMessage("");
    }
    setSubmitting(false);
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case "urgent": return "text-destructive border-destructive";
      case "high": return "text-orange-500 border-orange-500";
      case "normal": return "text-primary border-primary";
      default: return "text-muted-foreground border-muted";
    }
  };

  const statusIcon = (s: string) => {
    switch (s) {
      case "open": return <Clock className="w-3.5 h-3.5 text-yellow-500" />;
      case "replied": return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
      case "closed": return <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />;
      default: return <Clock className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Headphones className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Support Center</h3>
          <Badge variant="outline" className="text-[10px]">24/7</Badge>
        </div>
        <Button size="sm" onClick={() => setShowNew(true)} className="gap-1">
          <Plus className="w-4 h-4" /> New Ticket
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No tickets yet. Need help? Create a ticket!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map(ticket => (
            <motion.button
              key={ticket.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelectedTicket(ticket)}
              className="w-full text-left p-3 rounded-xl border border-border bg-card/50 hover:bg-card/80 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  {statusIcon(ticket.status)}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground truncate">{ticket.message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={`text-[9px] ${priorityColor(ticket.priority)}`}>
                    {ticket.priority}
                  </Badge>
                  {ticket.admin_reply && (
                    <Badge className="text-[9px] bg-green-500/20 text-green-500 border-green-500/30">replied</Badge>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {new Date(ticket.created_at).toLocaleDateString()}
              </p>
            </motion.button>
          ))}
        </div>
      )}

      {/* New Ticket Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Headphones className="w-5 h-5 text-primary" /> New Support Ticket
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Subject" value={newSubject} onChange={e => setNewSubject(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="account_request">Account Request</SelectItem>
                  <SelectItem value="payout">Payout</SelectItem>
                  <SelectItem value="technical">Technical Issue</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                </SelectContent>
              </Select>
              <Select value={newPriority} onValueChange={setNewPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea placeholder="Describe your issue..." value={newMessage} onChange={e => setNewMessage(e.target.value)} rows={4} />
            <Button onClick={createTicket} disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Submit Ticket
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedTicket?.subject}</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-xs ${priorityColor(selectedTicket.priority)}`}>
                  {selectedTicket.priority}
                </Badge>
                <Badge variant="outline" className="text-xs">{selectedTicket.category}</Badge>
                <Badge variant="outline" className="text-xs">{selectedTicket.status}</Badge>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/20 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Your message</p>
                <p className="text-sm">{selectedTicket.message}</p>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {new Date(selectedTicket.created_at).toLocaleString()}
                </p>
              </div>

              {selectedTicket.admin_reply ? (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs text-primary mb-1 font-semibold">Admin Reply</p>
                  <p className="text-sm">{selectedTicket.admin_reply}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {selectedTicket.admin_replied_at ? new Date(selectedTicket.admin_replied_at).toLocaleString() : ""}
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-muted/10 border border-dashed border-border text-center">
                  <Clock className="w-6 h-6 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Awaiting admin response...</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
