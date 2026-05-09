import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Camera, Check, Loader2, Image, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PaymentProofUploadProps {
  userId: string;
  paymentId?: string;
  onUploaded: () => void;
}

export const PaymentProofUpload = ({ userId, paymentId, onUploaded }: PaymentProofUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    
    if (!selected.type.startsWith('image/')) {
      toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" });
      return;
    }
    
    if (selected.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 5MB.", variant: "destructive" });
      return;
    }

    setFile(selected);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(selected);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    try {
      const ext = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      // payment-proofs is a PRIVATE bucket — generate a short-lived signed URL
      // for the preview. The DB stores only the file path.
      const { data: urlData } = await supabase.storage
        .from('payment-proofs')
        .createSignedUrl(fileName, 3600);

      const { error: dbError } = await supabase
        .from('payment_proofs')
        .insert({
          user_id: userId,
          payment_id: paymentId || null,
          image_url: fileName,
          notes: notes.trim() || null,
          status: 'pending',
        } as any);

      if (dbError) throw dbError;

      setUploaded(true);
      toast({ title: "Proof uploaded!", description: "Your payment proof has been submitted for review." });
      onUploaded();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (uploaded) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-6 rounded-2xl border border-primary/30 bg-card/60 backdrop-blur-sm text-center space-y-3"
      >
        <Check className="w-12 h-12 mx-auto text-primary" />
        <h4 className="font-semibold text-foreground">Proof Submitted</h4>
        <p className="text-xs text-muted-foreground">
          Your payment proof is being reviewed. You'll be notified once verified.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-2xl border border-primary/20 bg-card/60 backdrop-blur-sm space-y-4"
    >
      <h4 className="font-semibold text-foreground flex items-center gap-2">
        <Camera className="w-4 h-4 text-primary" />
        Upload Payment Proof
      </h4>
      <p className="text-xs text-muted-foreground">
        Upload a screenshot of your transfer receipt to speed up verification.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {!preview ? (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-colors"
        >
          <Upload className="w-8 h-8 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Tap to upload screenshot</span>
          <span className="text-xs text-muted-foreground/60">JPG, PNG up to 5MB</span>
        </button>
      ) : (
        <div className="relative">
          <img src={preview} alt="Payment proof" className="w-full h-40 object-cover rounded-xl border border-border" />
          <button
            onClick={() => { setFile(null); setPreview(null); }}
            className="absolute top-2 right-2 p-1 rounded-full bg-background/80 backdrop-blur-sm border border-border"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      <Textarea
        placeholder="Add a note (optional) — e.g., 'Sent from GTBank at 2:30pm'"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="text-sm resize-none"
        rows={2}
      />

      <Button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full"
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Image className="w-4 h-4 mr-2" />
            Submit Proof
          </>
        )}
      </Button>
    </motion.div>
  );
};
