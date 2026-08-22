import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ShieldCheck, Link2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accountId: string;
  defaultBroker?: string;
  onConnected?: () => void;
}

const LOGIN_RE = /^\d{4,15}$/;
const SERVER_RE = /^[A-Za-z0-9][A-Za-z0-9 ._-]{2,63}$/;

function validate(fields: { login: string; investorPassword: string; server: string }) {
  const errors: Record<string, string> = {};
  const login = fields.login.trim();
  const server = fields.server.trim();

  if (!login) errors.login = "MT5 login is required.";
  else if (!LOGIN_RE.test(login)) errors.login = "Login must be 4–15 digits — check your broker statement.";

  if (!fields.investorPassword) errors.investorPassword = "Investor password is required.";
  else if (fields.investorPassword.length < 6)
    errors.investorPassword = "Investor password looks too short — re-check your credentials.";

  if (!server) errors.server = "Server is required.";
  else if (!SERVER_RE.test(server))
    errors.server = "Server looks malformed (e.g. ICMarkets-Live01). Re-check your credentials.";

  return errors;
}

export function MT5ConnectDialog({ open, onOpenChange, accountId, defaultBroker, onConnected }: Props) {
  const [login, setLogin] = useState("");
  const [investorPassword, setInvestorPassword] = useState("");
  const [server, setServer] = useState("");
  const [broker, setBroker] = useState(defaultBroker ?? "");
  const [region, setRegion] = useState<"new-york" | "london" | "singapore">("new-york");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);

  const liveErrors = validate({ login, investorPassword, server });
  const isValid = Object.keys(liveErrors).length === 0;
  const shown = touched ? liveErrors : fieldErrors;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setTouched(true);
    const errors = validate({ login, investorPassword, server });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setErr("Please re-check your credentials before trading.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("mt5-connect", {
        body: {
          accountId,
          login: login.trim(),
          investorPassword,
          server: server.trim(),
          broker: broker.trim(),
          region,
        },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("MT5 connected — live sync will start in seconds");
      onConnected?.();
      onOpenChange(false);
    } catch (e: any) {
      setErr(e?.message ?? "Connection failed");
    } finally {
      setBusy(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Link2 className="w-4 h-4" /> Link MT5 account
          </DialogTitle>
          <DialogDescription className="text-xs">
            We use your <strong>investor (read-only) password</strong>. We can read balance, equity and
            trades — we cannot place or close trades on your behalf.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">MT5 login</Label>
            <Input value={login} onChange={(e) => setLogin(e.target.value)} inputMode="numeric" autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Investor password</Label>
            <Input
              type="password"
              value={investorPassword}
              onChange={(e) => setInvestorPassword(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Server</Label>
              <Input value={server} onChange={(e) => setServer(e.target.value)} placeholder="e.g. ICMarkets-Live01" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Broker</Label>
              <Input value={broker} onChange={(e) => setBroker(e.target.value)} placeholder="optional" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Region</Label>
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs"
              value={region}
              onChange={(e) => setRegion(e.target.value as any)}
            >
              <option value="new-york">New York (Americas)</option>
              <option value="london">London (EU / Africa)</option>
              <option value="singapore">Singapore (Asia)</option>
            </select>
          </div>

          <Alert className="bg-emerald-500/5 border-emerald-500/20">
            <ShieldCheck className="w-4 h-4" />
            <AlertDescription className="text-[10px]">
              Investor password is read-only by MT5 design. Stored encrypted at rest, never returned to the browser.
            </AlertDescription>
          </Alert>

          {err && <p className="text-xs text-destructive">{err}</p>}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Link2 className="w-3 h-3 mr-1" />}
              {busy ? "Connecting…" : "Connect & sync"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
