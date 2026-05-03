import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { z } from "zod";
import { ShieldCheck, Upload, Loader2, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FloatingNav } from "@/components/FloatingNav";

const formSchema = z.object({
  fullLegalName: z
    .string()
    .trim()
    .min(2, "Enter your legal name")
    .max(120, "Name too long"),
  dateOfBirth: z.string().min(1, "Date of birth required"),
  country: z.string().trim().min(2, "Country required").max(80),
  documentType: z.enum(["passport", "national_id", "drivers_license"]),
});

const VerifyIdentity = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [status, setStatus] = useState<"unsubmitted" | "pending" | "approved" | "rejected">(
    "unsubmitted"
  );
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);

  const [fullLegalName, setFullLegalName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [country, setCountry] = useState("");
  const [documentType, setDocumentType] = useState<"passport" | "national_id" | "drivers_license">(
    "national_id"
  );
  const [docFile, setDocFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate("/auth");
        return;
      }
      setUser(data.session.user);

      const { data: prof } = await supabase
        .from("profiles")
        .select("kyc_status, full_name, country, date_of_birth")
        .eq("id", data.session.user.id)
        .maybeSingle();

      if (prof?.kyc_status && prof.kyc_status !== "unverified") {
        setStatus(prof.kyc_status as any);
      }
      if (prof?.full_name) setFullLegalName(prof.full_name);
      if (prof?.country) setCountry(prof.country);
      if (prof?.date_of_birth) setDateOfBirth(prof.date_of_birth);
    };
    init();
  }, [navigate]);

  const upload = async (file: File, kind: "doc" | "selfie") => {
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("kyc-documents")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    return path;
  };

  const handleSubmit = async () => {
    const parsed = formSchema.safeParse({ fullLegalName, dateOfBirth, country, documentType });
    if (!parsed.success) {
      toast({
        title: "Check the form",
        description: parsed.error.issues[0].message,
        variant: "destructive",
      });
      return;
    }
    if (!docFile || !selfieFile) {
      toast({
        title: "Documents required",
        description: "Upload an ID document and a selfie.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const [docPath, selfiePath] = await Promise.all([
        upload(docFile, "doc"),
        upload(selfieFile, "selfie"),
      ]);

      const rows = [
        {
          user_id: user.id,
          document_type: documentType,
          document_path: docPath,
          full_legal_name: fullLegalName,
          date_of_birth: dateOfBirth,
          country,
        },
        {
          user_id: user.id,
          document_type: "selfie" as const,
          document_path: selfiePath,
          full_legal_name: fullLegalName,
          date_of_birth: dateOfBirth,
          country,
        },
      ];
      const { error: insertErr } = await supabase.from("kyc_submissions").insert(rows);
      if (insertErr) throw insertErr;

      const { error: profErr } = await supabase
        .from("profiles")
        .update({ kyc_status: "pending" })
        .eq("id", user.id);
      if (profErr) throw profErr;

      setStatus("pending");
      toast({
        title: "Submitted for review",
        description: "We'll notify you once an admin verifies your identity.",
      });
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const skip = () => navigate("/dashboard");

  if (status === "approved") {
    return (
      <div className="min-h-screen bg-background">
        <FloatingNav />
        <div className="max-w-md mx-auto pt-24 px-4 text-center">
          <div className="glass-card p-8 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold">Identity verified</h1>
            <p className="text-sm text-muted-foreground">
              You're verified. Withdrawals and premium tiers are unlocked.
            </p>
            <Button onClick={() => navigate("/dashboard")} className="w-full">
              Go to dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <FloatingNav />
      <div className="max-w-md mx-auto pt-20 px-4 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 space-y-5"
        >
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-full bg-primary/15 flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Verify your identity</h1>
            <p className="text-xs text-muted-foreground">
              Optional, but required to enable withdrawals and earn the BlackSeal verified badge.
            </p>
            {status === "pending" && (
              <Badge variant="outline" className="border-amber-500/40 text-amber-300">
                Submission under review
              </Badge>
            )}
            {status === "rejected" && (
              <Badge variant="outline" className="border-rose-500/40 text-rose-300">
                Previous submission rejected — try again
              </Badge>
            )}
          </div>

          {status === "pending" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Your documents are with our admin team. This usually takes under 24 hours.
              </p>
              <Button onClick={() => navigate("/dashboard")} className="w-full">
                Continue to dashboard
              </Button>
            </div>
          ) : step === 1 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="legal">Full legal name</Label>
                <Input
                  id="legal"
                  value={fullLegalName}
                  onChange={(e) => setFullLegalName(e.target.value)}
                  maxLength={120}
                  placeholder="As shown on your ID"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    maxLength={80}
                    placeholder="Nigeria"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Document type</Label>
                <Select
                  value={documentType}
                  onValueChange={(v: any) => setDocumentType(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="national_id">National ID</SelectItem>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="drivers_license">Driver's license</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="ghost" onClick={skip} className="flex-1">
                  Skip for now
                </Button>
                <Button onClick={() => setStep(2)} className="flex-1">
                  Next <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <FileField
                label="ID document"
                hint="Photo or scan of the document above"
                accept="image/*,.pdf"
                file={docFile}
                onFile={setDocFile}
              />
              <FileField
                label="Selfie"
                hint="Clear photo of your face holding the document"
                accept="image/*"
                file={selfieFile}
                onFile={setSelfieFile}
              />
              <div className="flex gap-2 pt-2">
                <Button variant="ghost" onClick={() => setStep(1)} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Submitting
                    </>
                  ) : (
                    "Submit for review"
                  )}
                </Button>
              </div>
              <button
                type="button"
                onClick={skip}
                className="w-full text-xs text-muted-foreground underline"
              >
                I'll do this later
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

const FileField = ({
  label,
  hint,
  accept,
  file,
  onFile,
}: {
  label: string;
  hint: string;
  accept: string;
  file: File | null;
  onFile: (f: File | null) => void;
}) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <label className="flex items-center gap-3 p-3 border border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/30">
      <Upload className="w-4 h-4 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="text-xs truncate">
          {file ? file.name : `Tap to upload — ${hint}`}
        </div>
        {file && (
          <div className="text-[10px] text-muted-foreground">
            {(file.size / 1024).toFixed(0)} KB
          </div>
        )}
      </div>
      {file && <Check className="w-4 h-4 text-emerald-400" />}
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
    </label>
  </div>
);

export default VerifyIdentity;
