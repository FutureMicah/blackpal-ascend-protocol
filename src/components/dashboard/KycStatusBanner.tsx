import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, ShieldAlert, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  userId: string;
}

const STORAGE_KEY = "kyc-banner-dismissed-at";

export const KycStatusBanner = ({ userId }: Props) => {
  const [status, setStatus] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const ts = localStorage.getItem(STORAGE_KEY);
    if (ts && Date.now() - Number(ts) < 1000 * 60 * 60 * 24 * 3) {
      setDismissed(true);
    }
    supabase
      .from("profiles")
      .select("kyc_status")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => setStatus(data?.kyc_status ?? "unverified"));
  }, [userId]);

  if (status === "verified" || dismissed || !status) return null;

  const isPending = status === "pending";
  const isRejected = status === "rejected";

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setDismissed(true);
  };

  return (
    <div
      className={`relative rounded-xl border p-3 sm:p-4 flex items-center gap-3 ${
        isPending
          ? "border-amber-500/30 bg-amber-500/5"
          : isRejected
          ? "border-rose-500/30 bg-rose-500/5"
          : "border-primary/30 bg-primary/5"
      }`}
    >
      {isPending ? (
        <Loader2 className="w-5 h-5 text-amber-400 animate-spin shrink-0" />
      ) : isRejected ? (
        <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
      ) : (
        <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-xs sm:text-sm font-semibold">
          {isPending
            ? "Verification under review"
            : isRejected
            ? "Verification was rejected"
            : "Verify your identity"}
        </div>
        <div className="text-[10px] sm:text-xs text-muted-foreground">
          {isPending
            ? "We'll notify you once an admin reviews your documents."
            : isRejected
            ? "Re-submit your documents to unlock withdrawals."
            : "Optional, but unlocks withdrawals and the BlackSeal badge."}
        </div>
      </div>
      {!isPending && (
        <Button asChild size="sm" variant="outline" className="h-8 text-[11px]">
          <Link to="/verify-identity">
            {isRejected ? "Re-submit" : "Verify"}
          </Link>
        </Button>
      )}
      <button
        onClick={dismiss}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
