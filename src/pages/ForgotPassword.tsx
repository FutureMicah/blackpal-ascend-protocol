import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";

const ForgotPassword = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast({ title: "Check your email", description: "We sent you a reset link." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="glass-card max-w-md w-full p-6 sm:p-8 rounded-2xl border-primary/20">
        <Link to="/auth" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 focus-visible:ring-2 focus-visible:ring-primary rounded">
          <ArrowLeft className="w-3 h-3" /> Back to sign in
        </Link>
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold gradient-text-cyber">Forgot your access code?</h1>
          <p className="text-xs text-muted-foreground mt-1">Enter your email and we'll send a reset link.</p>
        </div>

        {sent ? (
          <div role="status" aria-live="polite" className="text-center text-sm text-muted-foreground space-y-2">
            <p>If an account exists for <strong className="text-foreground">{email}</strong>, a reset link is on its way.</p>
            <p className="text-xs">Check your spam folder if you don't see it within a minute.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="trader@blackpal.com"
                required
                autoFocus
                className="h-11"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send reset link"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
};

export default ForgotPassword;
