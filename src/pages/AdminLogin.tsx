import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, AlertTriangle, KeyRound } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/blackpal-logo.jpg";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (attempts >= 5) {
      toast.error("Too many attempts. Please try again later.");
      return;
    }
    if (!/^\d{4,8}$/.test(pin)) {
      toast.error("PIN must be 4–8 digits.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error("Login failed");

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .in("role", ["admin", "super_admin", "editor", "customer_support", "finance"]);

      if (!roles || roles.length === 0) {
        await supabase.auth.signOut();
        setAttempts((p) => p + 1);
        toast.error("Access denied. No admin privileges.");
        return;
      }

      const { data: pinOk, error: pinErr } = await supabase.rpc("verify_admin_pin", { _pin: pin });
      if (pinErr) throw pinErr;
      if (!pinOk) {
        await supabase.auth.signOut();
        setAttempts((p) => p + 1);
        toast.error("Invalid admin PIN.");
        return;
      }

      toast.success("Admin access granted!");
      navigate("/admin");
    } catch (error: any) {
      setAttempts((p) => p + 1);
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
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
          <CardTitle className="text-2xl font-bold text-foreground">Admin Control Panel</CardTitle>
          <p className="text-sm text-muted-foreground">Authorized personnel only. All access is logged.</p>
          {attempts > 2 && (
            <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 p-2 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
              <span>Warning: {5 - attempts} attempts remaining</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
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
            <div className="space-y-2">
              <Label htmlFor="admin-pin" className="flex items-center gap-1">
                <KeyRound className="w-3 h-3" /> Admin PIN
              </Label>
              <Input
                id="admin-pin"
                type="password"
                inputMode="numeric"
                maxLength={8}
                placeholder="4–8 digit PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                required
                className="border-destructive/20 focus:border-destructive tracking-widest text-center"
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
            <p className="text-[10px] text-muted-foreground text-center pt-1">
              New admin?{" "}
              <Link to="/admin-signup" className="text-destructive underline">
                Request access
              </Link>{" "}
              — super admin approval required.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
