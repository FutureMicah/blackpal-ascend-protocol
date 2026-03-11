import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/blackpal-logo.jpg";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"credentials" | "pin">("credentials");
  const [attempts, setAttempts] = useState(0);

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (attempts >= 5) {
      toast.error("Too many attempts. Please try again later.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error("Login failed");

      // Check if user has admin/super_admin role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .in("role", ["admin", "super_admin", "editor", "customer_support", "finance"]);

      if (!roles || roles.length === 0) {
        await supabase.auth.signOut();
        setAttempts(prev => prev + 1);
        toast.error("Access denied. No admin privileges.");
        return;
      }

      setStep("pin");
      toast.success("Credentials verified. Enter your PIN.");
    } catch (error: any) {
      setAttempts(prev => prev + 1);
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePinVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Verify PIN - for super admin it's 4303
    if (pin === "4303") {
      toast.success("Admin access granted!");
      navigate("/admin");
    } else {
      setAttempts(prev => prev + 1);
      toast.error("Invalid PIN. Access denied.");
      if (attempts >= 4) {
        await supabase.auth.signOut();
        setStep("credentials");
        setPin("");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 via-background to-primary/5" />
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-destructive/30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <Card className="w-full max-w-md border-destructive/20 bg-card/90 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <img src={logo} alt="Admin" className="w-20 h-20 rounded-full border-2 border-destructive/30" />
              <div className="absolute -bottom-1 -right-1 bg-destructive rounded-full p-1.5">
                <Shield className="w-4 h-4 text-destructive-foreground" />
              </div>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Admin Control Panel
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Authorized personnel only. All access is logged.
          </p>
          {attempts > 2 && (
            <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 p-2 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
              <span>Warning: {5 - attempts} attempts remaining</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {step === "credentials" ? (
            <form onSubmit={handleCredentialLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Admin Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@blackpal.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-destructive/20 focus:border-destructive"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-destructive/20 focus:border-destructive"
                />
              </div>
              <Button
                type="submit"
                disabled={loading || attempts >= 5}
                className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-destructive-foreground/30 border-t-destructive-foreground rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Lock className="w-4 h-4" /> Authenticate
                  </span>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handlePinVerify} className="space-y-4">
              <div className="text-center mb-4">
                <Lock className="w-12 h-12 mx-auto text-destructive mb-2" />
                <p className="text-sm text-muted-foreground">Enter your 4-digit security PIN</p>
              </div>
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  required
                  maxLength={4}
                  className="text-center text-2xl tracking-[1em] border-destructive/20 focus:border-destructive h-16"
                />
              </div>
              <Button
                type="submit"
                disabled={loading || pin.length !== 4}
                className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {loading ? "Verifying..." : "Unlock Admin Panel"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => { setStep("credentials"); setPin(""); }}
              >
                Back to login
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
