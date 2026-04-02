import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Headphones, Clock, CheckCircle, AlertCircle, Send, Loader2,
  MessageSquare, User, Filter
} from "lucide-react";

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  priority: string;
  status: string;
  category: string;
  admin_reply: string | null;
  admin_replied_at: string | null;
  created_at: string;
}

interface AdminSupportTicketsProps {
  adminId: string;
}

export function AdminSupportTickets({ adminId }: AdminSupportTicketsProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [replying, setReplying] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  useEffect(() => {
    loadTickets();

    const channel = supabase
      .channel("admin-support")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "support_tickets",
      }, () => {
        loadTickets();
        toast.info("New support ticket received!");
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadTickets = async () => {
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });
    
    const ticketList = (data || []) as Ticket[];
    setTickets(ticketList);

    // Load user names
    const userIds = [...new Set(ticketList.map(t => t.user_id))];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);
      
      const names: Record<string, string> = {};
      profiles?.forEach((p: any) => { names[p.id] = p.display_name || "User"; });
      setUserNames(names);
    }
    setLoading(false);
  };

  const sendReply = async () => {
    if (!selectedTicket || !reply.trim()) return;
    setReplying(true);

    const { error } = await supabase
      .from("support_tickets")
      .update({
        admin_reply: reply.trim(),
        admin_id: adminId,
        admin_replied_at: new Date().toISOString(),
        status: "replied",
      } as any)
      .eq("id", selectedTicket.id);

    if (error) {
      toast.error("Failed to send reply");
    } else {
      toast.success("Reply sent!");
      setReply("");
      setSelectedTicket(null);
      loadTickets();
    }
    setReplying(false);
  };

  const closeTicket = async (ticketId: string) => {
    await supabase.from("support_tickets").update({ status: "closed" } as any).eq("id", ticketId);
    toast.success("Ticket closed");
    loadTickets();
  };

  const filtered = filterStatus === "all" ? tickets : tickets.filter(t => t.status === filterStatus);
  const openCount = tickets.filter(t => t.status === "open").length;
  const repliedCount = tickets.filter(t => t.status === "replied").length;

  const priorityColor = (p: string) => {
    switch (p) {
      case "urgent": return "border-destructive bg-destructive/10 text-destructive";
      case "high": return "border-orange-500 bg-orange-500/10 text-orange-500";
      default: return "border-primary bg-primary/10 text-primary";
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <Card className="border-border bg-card/80">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <Headphones className="w-5 h-5" /> Support Tickets
            {openCount > 0 && <Badge variant="destructive" className="text-xs">{openCount} open</Badge>}
          </CardTitle>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({tickets.length})</SelectItem>
              <SelectItem value="open">Open ({openCount})</SelectItem>
              <SelectItem value="replied">Replied ({repliedCount})</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-3 rounded-lg bg-muted/30 border border-border">
            <p className="text-2xl font-bold text-foreground">{tickets.length}</p>
            <p className="text-xs text-muted-foreground">Total Tickets</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-destructive/5 border border-destructive/20">
            <p className="text-2xl font-bold text-destructive">{openCount}</p>
            <p className="text-xs text-muted-foreground">Awaiting Reply</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-green-500/5 border border-green-500/20">
            <p className="text-2xl font-bold text-green-500">{repliedCount}</p>
            <p className="text-xs text-muted-foreground">Replied</p>
          </div>
        </div>

        {/* Tickets list */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">No tickets</p>
          ) : filtered.map(ticket => (
            <button
              key={ticket.id}
              onClick={() => { setSelectedTicket(ticket); setReply(ticket.admin_reply || ""); }}
              className="w-full text-left p-3 rounded-xl border border-border bg-card/50 hover:bg-card/80 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {ticket.status === "open" ? <Clock className="w-3.5 h-3.5 text-yellow-500 shrink-0" /> :
                     ticket.status === "replied" ? <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> :
                     <AlertCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                    <span className="text-sm font-medium truncate">{ticket.subject}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{ticket.message}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <User className="w-3 h-3" /> {userNames[ticket.user_id] || "Unknown"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(ticket.created_at), "MMM d, HH:mm")}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant="outline" className={`text-[9px] ${priorityColor(ticket.priority)}`}>
                    {ticket.priority}
                  </Badge>
                  <Badge variant="outline" className="text-[9px]">{ticket.category}</Badge>
                </div>
              </div>
            </button>
          ))}
        </div>
      </CardContent>

      {/* Reply Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" /> {selectedTicket?.subject}
            </DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className={priorityColor(selectedTicket.priority)}>{selectedTicket.priority}</Badge>
                <Badge variant="outline">{selectedTicket.category}</Badge>
                <span className="text-muted-foreground text-xs">from {userNames[selectedTicket.user_id] || "User"}</span>
              </div>

              <div className="p-4 rounded-lg bg-muted/20 border border-border">
                <p className="text-xs text-muted-foreground mb-1">User's message</p>
                <p className="text-sm whitespace-pre-wrap">{selectedTicket.message}</p>
                <p className="text-[10px] text-muted-foreground mt-2">{format(new Date(selectedTicket.created_at), "PPpp")}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Your reply</label>
                <Textarea value={reply} onChange={e => setReply(e.target.value)} rows={4} placeholder="Type your reply..." />
              </div>

              <div className="flex gap-2">
                <Button onClick={sendReply} disabled={replying || !reply.trim()} className="flex-1">
                  {replying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  Send Reply
                </Button>
                {selectedTicket.status !== "closed" && (
                  <Button variant="outline" onClick={() => { closeTicket(selectedTicket.id); setSelectedTicket(null); }}>
                    Close Ticket
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
