import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Inbox, Check, X, PackageCheck } from "lucide-react";

interface Row {
  id: string;
  user_id: string;
  requested_tier: number;
  requested_size_naira: number;
  status: string;
  rejection_reason: string | null;
  admin_notes: string | null;
  package_id: string | null;
  created_at: string;
  profiles?: { display_name: string | null; email: string | null } | null;
  xp_tier_config?: { tier_name: string; badge_icon: string | null; payout_naira: number } | null;
}

const statusColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary", approved: "default", rejected: "destructive", fulfilled: "outline",
};

export function AdminAccountRequests() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState<Row | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("account_requests")
      .select("*, profiles:user_id(display_name,email), xp_tier_config:package_id(tier_name,badge_icon,payout_naira)")
      .order("created_at", { ascending: false });
    setRows((data || []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const update = async (id: string, status: string, _reason?: string) => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_update_account_request" as any, {
      _request_id: id, _status: status, _reason: _reason ?? null, _admin_notes: null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Request ${status}`);
    setRejecting(null); setReason("");
    load();
  };

  return (
    <TabsContent value="account-requests" className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2"><Inbox className="w-5 h-5 text-primary" /> Account Requests</h3>
        <Button size="sm" variant="ghost" onClick={load}>Refresh</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : rows.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-10 text-center text-sm text-muted-foreground">No requests yet.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {rows.map(r => {
            const pkg = r.xp_tier_config;
            return (
              <Card key={r.id} className="border-border">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold flex items-center gap-1.5">
                        <span>{pkg?.badge_icon || "🏆"}</span>
                        {pkg?.tier_name || `Tier ${r.requested_tier}`}
                        <Badge variant={statusColor[r.status] || "secondary"} className="text-[9px] ml-1">{r.status}</Badge>
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {r.profiles?.display_name || r.profiles?.email || r.user_id.slice(0,8)} • ₦{Number(r.requested_size_naira).toLocaleString()}
                        {pkg?.payout_naira ? ` • payout ₦${Number(pkg.payout_naira).toLocaleString()}` : ""}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                      {r.rejection_reason && <p className="text-[10px] text-destructive mt-1">Reason: {r.rejection_reason}</p>}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {r.status === "pending" && (
                        <>
                          <Button size="sm" className="h-7 px-2 text-[10px]" disabled={busy} onClick={() => update(r.id, "approved")}>
                            <Check className="w-3 h-3 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="destructive" className="h-7 px-2 text-[10px]" disabled={busy} onClick={() => { setRejecting(r); setReason(""); }}>
                            <X className="w-3 h-3 mr-1" /> Reject
                          </Button>
                        </>
                      )}
                      {r.status === "approved" && (
                        <Button size="sm" variant="outline" className="h-7 px-2 text-[10px]" disabled={busy} onClick={() => update(r.id, "fulfilled")}>
                          <PackageCheck className="w-3 h-3 mr-1" /> Mark fulfilled
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!rejecting} onOpenChange={o => !o && setRejecting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Reject request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">The user will be notified with this reason.</p>
            <Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. XP threshold not met yet. Try again after the next challenge." />
            <Button className="w-full" variant="destructive" disabled={busy || !reason.trim()} onClick={() => rejecting && update(rejecting.id, "rejected", reason.trim())}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <X className="w-4 h-4 mr-2" />} Send rejection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TabsContent>
  );
}
