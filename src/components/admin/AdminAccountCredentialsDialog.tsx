import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accountId: string | null;
  onSaved?: () => void;
}

interface Form {
  mt5_broker: string;
  mt5_server: string;
  mt5_login: string;
  mt5_password: string;
  mt5_investor_password: string;
  account_rules: string;
  admin_message: string;
  contest_id: string;
}

const EMPTY: Form = {
  mt5_broker: "",
  mt5_server: "",
  mt5_login: "",
  mt5_password: "",
  mt5_investor_password: "",
  account_rules: "",
  admin_message: "",
  contest_id: "none",
};

export function AdminAccountCredentialsDialog({ open, onOpenChange, accountId, onSaved }: Props) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contests, setContests] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    if (!open || !accountId) return;
    let alive = true;
    setLoading(true);
    (async () => {
      const [acct, ctst] = await Promise.all([
        supabase
          .from("user_prop_accounts")
          .select(
            "mt5_broker,mt5_server,mt5_login,mt5_password,mt5_investor_password,account_rules,admin_message,contest_id",
          )
          .eq("id", accountId)
          .maybeSingle(),
        supabase.from("contests").select("id,title").order("created_at", { ascending: false }).limit(50),
      ]);
      if (!alive) return;
      const d = (acct.data ?? {}) as any;
      setForm({
        mt5_broker: d.mt5_broker ?? "",
        mt5_server: d.mt5_server ?? "",
        mt5_login: d.mt5_login ?? "",
        mt5_password: d.mt5_password ?? "",
        mt5_investor_password: d.mt5_investor_password ?? "",
        account_rules: d.account_rules ?? "",
        admin_message: d.admin_message ?? "",
        contest_id: d.contest_id ?? "none",
      });
      setContests((ctst.data as any) ?? []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [open, accountId]);

  const set = (k: keyof Form) => (e: any) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (send: boolean) => {
    if (!accountId) return;
    setSaving(true);
    const payload: any = {
      mt5_broker: form.mt5_broker.trim() || null,
      mt5_server: form.mt5_server.trim() || null,
      mt5_login: form.mt5_login.trim() || null,
      mt5_password: form.mt5_password.trim() || null,
      mt5_investor_password: form.mt5_investor_password.trim() || null,
      account_rules: form.account_rules.trim() || null,
      admin_message: form.admin_message.trim() || null,
      contest_id: form.contest_id === "none" ? null : form.contest_id,
    };
    if (send) payload.credentials_sent_at = new Date().toISOString();

    const { error } = await supabase.from("user_prop_accounts").update(payload).eq("id", accountId);
    setSaving(false);
    if (error) {
      toast.error("Could not save: " + error.message);
      return;
    }
    toast.success(send ? "Details sent to the trader" : "Saved");
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[360px] sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">Account details & login</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">Broker</label>
                <Input className="h-8 text-xs" value={form.mt5_broker} onChange={set("mt5_broker")} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">MT5 server</label>
                <Input className="h-8 text-xs" value={form.mt5_server} onChange={set("mt5_server")} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Login</label>
                <Input className="h-8 text-xs font-mono" value={form.mt5_login} onChange={set("mt5_login")} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Password</label>
                <Input className="h-8 text-xs font-mono" value={form.mt5_password} onChange={set("mt5_password")} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Investor password</label>
                <Input
                  className="h-8 text-xs font-mono"
                  value={form.mt5_investor_password}
                  onChange={set("mt5_investor_password")}
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Linked contest</label>
                <Select value={form.contest_id} onValueChange={(v) => setForm((f) => ({ ...f, contest_id: v }))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {contests.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground">Account rules</label>
              <Textarea className="text-xs" rows={4} value={form.account_rules} onChange={set("account_rules")} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Message to trader</label>
              <Textarea className="text-xs" rows={3} value={form.admin_message} onChange={set("admin_message")} />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-9 text-xs" disabled={saving} onClick={() => save(false)}>
                Save draft
              </Button>
              <Button className="flex-1 h-9 text-xs" disabled={saving} onClick={() => save(true)}>
                {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                Send to trader
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
