import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, Coins, ExternalLink, Loader2 } from "lucide-react";

interface TopupRow {
  id: string;
  user_id: string;
  naira_amount: number;
  btax_preview: number;
  rate_at_submission: number;
  status: "pending" | "approved" | "rejected";
  receipt_url: string | null;
  payer_note: string | null;
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  profiles?: { display_name: string | null; email: string | null } | null;
}

export const AdminTopupReview = () => {
  const [rows, setRows] = useState<TopupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("wallet_topup_requests")
      .select("*, profiles!wallet_topup_requests_user_id_fkey(display_name, email)" as any)
      .order("created_at", { ascending: false })
      .limit(100);
    setRows((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-topups")
      .on("postgres_changes", { event: "*", schema: "public", table: "wallet_topup_requests" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const act = async (id: string, action: "approve" | "reject") => {
    setActing(id);
    try {
      const note = notes[id] || null;
      const fn = action === "approve" ? "approve_wallet_topup" : "reject_wallet_topup";
      const { error } = await supabase.rpc(fn as any, { p_request_id: id, p_note: note });
      if (error) throw error;
      toast.success(action === "approve" ? "Top-up approved & wallet credited" : "Top-up rejected");
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActing(null);
    }
  };

  const openReceipt = async (path: string) => {
    const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const pending = rows.filter((r) => r.status === "pending");

  return (
    <Card className="glass-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Coins className="w-5 h-5 text-primary" /> Naira Top-up Requests
          {pending.length > 0 && (
            <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">{pending.length} pending</Badge>
          )}
        </h2>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Refresh"}
        </Button>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No top-up requests yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-background/50 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{r.profiles?.display_name || r.user_id.slice(0, 8)}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                </div>
                {r.status === "pending" ? (
                  <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
                ) : r.status === "approved" ? (
                  <Badge className="bg-green-500/20 text-green-500 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>
                ) : (
                  <Badge className="bg-red-500/20 text-red-500 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                <div><span className="text-muted-foreground">Naira</span><p className="font-bold">₦{Number(r.naira_amount).toLocaleString()}</p></div>
                <div><span className="text-muted-foreground">BTAX</span><p className="font-bold text-primary">{Number(r.btax_preview).toLocaleString()}</p></div>
                <div><span className="text-muted-foreground">Rate</span><p className="font-mono">₦{r.rate_at_submission}/BTAX</p></div>
              </div>

              {r.payer_note && <p className="text-[10px] italic text-muted-foreground mb-2">"{r.payer_note}"</p>}
              {r.review_note && <p className="text-[10px] italic text-muted-foreground mb-2">Admin: {r.review_note}</p>}

              {r.receipt_url && (
                <Button size="sm" variant="outline" onClick={() => openReceipt(r.receipt_url!)} className="h-7 text-[10px] mb-2">
                  <ExternalLink className="w-3 h-3 mr-1" /> View receipt
                </Button>
              )}

              {r.status === "pending" && (
                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  <Input
                    placeholder="Optional review note"
                    value={notes[r.id] || ""}
                    onChange={(e) => setNotes((p) => ({ ...p, [r.id]: e.target.value }))}
                    className="h-8 text-xs flex-1"
                  />
                  <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700" disabled={acting === r.id} onClick={() => act(r.id, "approve")}>
                    {acting === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><CheckCircle2 className="w-3 h-3 mr-1" />Approve</>}
                  </Button>
                  <Button size="sm" variant="destructive" className="h-8" disabled={acting === r.id} onClick={() => act(r.id, "reject")}>
                    <XCircle className="w-3 h-3 mr-1" />Reject
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};
