import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FloatingNav } from "@/components/FloatingNav";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getBtaxToNairaRate, nairaToBtax, formatBtax, formatNaira, DEFAULT_BTAX_TO_NAIRA } from "@/lib/btax";
import { ArrowDown, Coins, Upload, Loader2, Clock, CheckCircle2, XCircle, AlertTriangle, Zap, FileText } from "lucide-react";

interface TopupRequest {
  id: string;
  naira_amount: number;
  btax_preview: number;
  rate_at_submission: number;
  status: "pending" | "approved" | "rejected";
  receipt_url: string | null;
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const NairaTopUp = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [userId, setUserId] = useState<string | null>(null);
  const [rate, setRate] = useState<number>(DEFAULT_BTAX_TO_NAIRA);
  const [rateError, setRateError] = useState<string | null>(null);
  const [naira, setNaira] = useState<string>("1000");
  const [note, setNote] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [mode, setMode] = useState<"paystack" | "manual">("paystack");
  const [history, setHistory] = useState<TopupRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUserId(user.id);
      try {
        const r = await getBtaxToNairaRate(true);
        setRate(r);
      } catch (e: any) {
        setRateError("Couldn't load live rate. Using default ₦100 / BTAX.");
      }
      await loadHistory(user.id);
      setLoading(false);
    })();
  }, [navigate]);

  const loadHistory = async (uid: string) => {
    const { data } = await supabase
      .from("wallet_topup_requests")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(20);
    setHistory((data ?? []) as TopupRequest[]);
  };

  const nairaNum = Number(naira) || 0;
  const btaxPreview = useMemo(() => nairaToBtax(nairaNum, rate), [nairaNum, rate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (nairaNum < 100) {
      toast({ variant: "destructive", title: "Minimum ₦100", description: "Enter at least ₦100." });
      return;
    }
    setSubmitting(true);
    try {
      let receipt_url: string | null = null;
      if (file) {
        const path = `${userId}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, file);
        if (upErr) throw upErr;
        receipt_url = path;
      }

      const { error } = await supabase.from("wallet_topup_requests").insert({
        user_id: userId,
        naira_amount: nairaNum,
        btax_preview: btaxPreview,
        rate_at_submission: rate,
        receipt_url,
        payer_note: note || null,
        status: "pending",
      });
      if (error) throw error;

      toast({ title: "Top-up submitted", description: "Awaiting admin verification." });
      setNaira("1000");
      setNote("");
      setFile(null);
      await loadHistory(userId);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Submission failed", description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <FloatingNav />
      <div className="w-full max-w-3xl mx-auto px-2 sm:px-6 pt-16 pb-24 space-y-4">

        <div>
          <h1 className="text-xl sm:text-2xl font-bold gradient-text-cyber flex items-center gap-2">
            <Coins className="w-5 h-5" /> Top up BTAX with Naira
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Pay Naira to fund your BTAX wallet. All top-ups are credited only after admin verification.
          </p>
        </div>

        {rateError && (
          <div role="alert" className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-2">
            <AlertTriangle className="w-3.5 h-3.5" /> {rateError}
          </div>
        )}

        <Card className="glass-card p-4 sm:p-6 rounded-2xl">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="naira">Naira amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                <Input
                  id="naira"
                  type="number"
                  inputMode="decimal"
                  min={100}
                  step={50}
                  value={naira}
                  onChange={(e) => setNaira(e.target.value)}
                  className="pl-7 h-11"
                  required
                  autoFocus
                />
              </div>
              <p className="text-[10px] text-muted-foreground">Minimum ₦100. Naira appears here only as the source currency — your wallet balance is BTAX.</p>
            </div>

            <div className="flex items-center justify-center" aria-hidden="true">
              <ArrowDown className="w-4 h-4 text-primary" />
            </div>

            <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-center" aria-live="polite">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">You will receive</p>
              <p className="text-2xl font-bold text-primary">{formatBtax(btaxPreview)}</p>
              <p className="text-[10px] text-muted-foreground">@ 1 BTAX = {formatNaira(rate)}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="receipt">Payment receipt (optional)</Label>
              <div className="flex items-center gap-2">
                <Input id="receipt" type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="h-10" />
                {file && <Badge variant="secondary" className="text-[10px]"><Upload className="w-3 h-3 mr-1" />{file.name.slice(0, 16)}…</Badge>}
              </div>
              <p className="text-[10px] text-muted-foreground">Upload a screenshot of your bank transfer to BlackPal's account. Speeds up admin approval.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reference, sender name, etc." className="min-h-[60px] text-xs" />
            </div>

            <Button type="submit" disabled={submitting} className="w-full h-11">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit for admin verification"}
            </Button>
          </form>
        </Card>

        <Card className="glass-card p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold flex items-center gap-2"><Clock className="w-4 h-4" /> Your top-ups</h2>
            <Link to="/dashboard" className="text-[10px] text-primary hover:underline">Back to dashboard</Link>
          </div>
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : history.length === 0 ? (
            <p className="text-xs text-muted-foreground">No top-ups yet. Your first one will appear here once submitted.</p>
          ) : (
            <ul className="space-y-2">
              {history.map((h) => (
                <li key={h.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs">
                  <div>
                    <p className="font-semibold">{formatNaira(h.naira_amount)} → {formatBtax(h.btax_preview)}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(h.created_at).toLocaleString()}</p>
                    {h.review_note && <p className="text-[10px] text-muted-foreground italic mt-0.5">Admin: {h.review_note}</p>}
                  </div>
                  {h.status === "approved" ? (
                    <Badge className="bg-green-500/20 text-green-500 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>
                  ) : h.status === "rejected" ? (
                    <Badge className="bg-red-500/20 text-red-500 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>
                  ) : (
                    <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};

export default NairaTopUp;
