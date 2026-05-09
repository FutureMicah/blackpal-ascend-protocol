import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShieldCheck, ShieldX, UserPlus, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type Req = {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  requested_role: string;
  face_photo_path: string;
  status: string;
  created_at: string;
  review_note: string | null;
};

export function AdminApprovalsPanel() {
  const [requests, setRequests] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("admin_signup_requests" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setRequests((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-signup-reqs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_signup_requests" },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const viewPhoto = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("admin-faces")
      .createSignedUrl(path, 60 * 5);
    if (error || !data?.signedUrl) return toast.error("Could not load photo");
    setPreviewUrl(data.signedUrl);
  };

  const approve = async (id: string) => {
    const { error } = await supabase.rpc("approve_admin_request", { _request_id: id });
    if (error) return toast.error(error.message);
    toast.success("Admin approved");
  };
  const reject = async (id: string) => {
    const { error } = await supabase.rpc("reject_admin_request", { _request_id: id });
    if (error) return toast.error(error.message);
    toast.success("Request rejected");
  };

  const pending = requests.filter((r) => r.status === "pending");
  const processed = requests.filter((r) => r.status !== "pending");

  return (
    <Card className="border-border bg-card/80 md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <UserPlus className="w-4 h-4" /> Admin Approval Requests
          {pending.length > 0 && (
            <Badge variant="destructive" className="ml-2">{pending.length} pending</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {!loading && pending.length === 0 && (
          <p className="text-xs text-muted-foreground">No pending requests.</p>
        )}

        {pending.map((r) => (
          <div key={r.id} className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{r.display_name || r.email}</p>
                <p className="text-[10px] text-muted-foreground truncate">{r.email}</p>
                <p className="text-[10px] text-muted-foreground">
                  Requested role: <span className="text-foreground">{r.requested_role}</span> ·{" "}
                  {format(new Date(r.created_at), "MMM d, HH:mm")}
                </p>
              </div>
              <Badge variant="outline">pending</Badge>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => viewPhoto(r.face_photo_path)}>
                <Eye className="w-3 h-3 mr-1" /> View photo
              </Button>
              <Button size="sm" onClick={() => approve(r.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <ShieldCheck className="w-3 h-3 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => reject(r.id)}>
                <ShieldX className="w-3 h-3 mr-1" /> Reject
              </Button>
            </div>
          </div>
        ))}

        {processed.length > 0 && (
          <div className="pt-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">History</p>
            <div className="space-y-1">
              {processed.slice(0, 10).map((r) => (
                <div key={r.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/20">
                  <span className="truncate">{r.display_name || r.email}</span>
                  <Badge variant={r.status === "approved" ? "default" : "secondary"}>{r.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Face verification photo</DialogTitle></DialogHeader>
          {previewUrl && <img src={previewUrl} alt="Applicant" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
