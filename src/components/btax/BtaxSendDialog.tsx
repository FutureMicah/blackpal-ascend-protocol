import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send, Search, Loader2, Wallet } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  presetRecipient?: { id: string; display_name: string; avatar_url?: string | null } | null;
  onSent?: () => void;
}

interface UserRow { id: string; display_name: string | null; username: string | null; avatar_url: string | null }

export function BtaxSendDialog({ open, onOpenChange, presetRecipient, onSent }: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<UserRow[]>([]);
  const [recipient, setRecipient] = useState<UserRow | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [balance, setBalance] = useState<number>(0);
  const [feePct, setFeePct] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRecipient(presetRecipient ? {
      id: presetRecipient.id, display_name: presetRecipient.display_name,
      username: null, avatar_url: presetRecipient.avatar_url ?? null,
    } : null);
    setQ(""); setResults([]); setAmount(""); setNote("");

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: w }, { data: s }] = await Promise.all([
        supabase.from("wallets").select("btax_balance").eq("user_id", user.id).maybeSingle(),
        supabase.from("academy_settings").select("btax_transfer_fee_percent").limit(1).maybeSingle(),
      ]);
      setBalance(Number(w?.btax_balance ?? 0));
      setFeePct(Number((s as any)?.btax_transfer_fee_percent ?? 1));
    })();
  }, [open, presetRecipient]);

  useEffect(() => {
    if (recipient || q.trim().length < 2) { setResults([]); return; }
    const id = setTimeout(async () => {
      const term = `%${q.trim()}%`;
      const { data } = await supabase
        .from("profiles")
        .select("id,display_name,username,avatar_url")
        .or(`display_name.ilike.${term},username.ilike.${term}`)
        .limit(8);
      setResults((data || []) as any);
    }, 250);
    return () => clearTimeout(id);
  }, [q, recipient]);

  const amt = parseFloat(amount) || 0;
  const fee = +(amt * feePct / 100).toFixed(2);
  const net = +(amt - fee).toFixed(2);
  const overBalance = amt > balance;

  const send = async () => {
    if (!recipient) { toast.error("Choose a recipient"); return; }
    if (amt <= 0) { toast.error("Enter an amount"); return; }
    if (overBalance) { toast.error("Insufficient BTAX"); return; }
    setSubmitting(true);
    const { error } = await (supabase as any).rpc("transfer_btax", {
      p_recipient: recipient.id, p_amount: amt, p_note: note || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Sent ${net} BTAX to ${recipient.display_name || "user"}`, { description: fee > 0 ? `Fee ${fee} BTAX` : undefined });
    onOpenChange(false);
    onSent?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2"><Send className="w-4 h-4 text-primary" /> Send BTAX</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-[11px]">
            <span className="flex items-center gap-1.5 text-muted-foreground"><Wallet className="w-3 h-3" /> Your balance</span>
            <span className="font-mono font-bold">{balance.toLocaleString()} BTAX</span>
          </div>

          {recipient ? (
            <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-card/60">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[11px] font-bold shrink-0 overflow-hidden">
                  {recipient.avatar_url ? <img src={recipient.avatar_url} alt="" className="w-full h-full object-cover" /> : (recipient.display_name?.[0] || "?")}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{recipient.display_name || "User"}</p>
                  {recipient.username && <p className="text-[10px] text-muted-foreground">@{recipient.username}</p>}
                </div>
              </div>
              <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setRecipient(null)}>Change</Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Find by name or @username" className="pl-7 h-9 text-xs" autoFocus />
              </div>
              {results.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-lg border border-border divide-y divide-border/40">
                  {results.map(u => (
                    <button key={u.id} onClick={() => setRecipient(u)} className="w-full flex items-center gap-2 p-1.5 text-left hover:bg-muted/40 transition-colors">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold overflow-hidden shrink-0">
                        {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : (u.display_name?.[0] || "?")}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{u.display_name || "User"}</p>
                        {u.username && <p className="text-[10px] text-muted-foreground">@{u.username}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Amount (BTAX)</label>
            <Input type="number" min={0} step="any" value={amount} onChange={e => setAmount(e.target.value)} className="h-9 text-sm font-mono" placeholder="0" />
            {amt > 0 && (
              <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Fee {feePct}% · {fee} BTAX</span>
                <span className={overBalance ? "text-destructive font-semibold" : ""}>
                  Recipient gets <span className="font-mono font-bold text-foreground">{net}</span>
                </span>
              </div>
            )}
          </div>

          <Textarea rows={2} placeholder="Optional note…" value={note} onChange={e => setNote(e.target.value)} className="text-xs resize-none" />

          <Button onClick={send} disabled={submitting || !recipient || amt <= 0 || overBalance} className="w-full h-9 text-xs">
            {submitting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1" />}
            Send BTAX
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
