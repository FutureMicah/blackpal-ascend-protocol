import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Lock, Zap, Shield, ArrowLeft } from "lucide-react";

export default function CinematicAccess() {
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);

  // Animate in
  useState(() => {
    setTimeout(() => setStage(1), 300);
    setTimeout(() => setStage(2), 800);
  });

  const handleAccess = async () => {
    if (!accessCode.trim()) { toast.error("Enter your access code"); return; }
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      // Check if code matches any active prop account for this user
      const { data: accounts } = await supabase
        .from("user_prop_accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("access_code", accessCode.trim())
        .eq("status", "active");

      if (!accounts || accounts.length === 0) {
        // Also check if admin using master code
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        const isAdmin = roles?.some(r => ["super_admin", "admin"].includes(r.role));
        if (isAdmin && accessCode.trim() === "1234") {
          // Admin master access - check if admin has any active prop account, if not create one
          const { data: adminAccounts } = await supabase
            .from("user_prop_accounts")
            .select("*")
            .eq("user_id", user.id)
            .eq("status", "active")
            .limit(1);

          if (!adminAccounts || adminAccounts.length === 0) {
            // Get highest tier for admin
            const { data: tiers } = await supabase
              .from("prop_tiers")
              .select("*")
              .order("tier_level", { ascending: false })
              .limit(1);

            if (tiers && tiers.length > 0) {
              await supabase.from("user_prop_accounts").insert({
                user_id: user.id,
                tier_id: tiers[0].id,
                account_balance: tiers[0].account_size,
                starting_balance: tiers[0].account_size,
                current_equity: tiers[0].account_size,
                highest_balance: tiers[0].account_size,
                access_code: "1234",
                status: "active",
                phase: "funded",
                assigned_by: user.id,
              });
            }
          }
          navigate("/cinematic-core");
          return;
        }

        toast.error("Invalid access code");
        setLoading(false);
        return;
      }

      navigate("/cinematic-core");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent"
            style={{
              left: `${(i / 30) * 100}%`,
              height: `${100 + Math.random() * 200}px`,
              top: `${Math.random() * 100}%`,
              animation: `slide-down ${3 + Math.random() * 4}s linear infinite`,
              animationDelay: `${Math.random() * 3}s`,
              opacity: 0.3 + Math.random() * 0.3,
            }}
          />
        ))}
      </div>

      {/* Radial glow */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent" />

      <div className={`relative z-10 w-full max-w-md px-6 transition-all duration-1000 ${stage >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <Button variant="ghost" size="sm" className="absolute -top-12 left-0" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>

        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30 mb-4 transition-all duration-1000 delay-300 ${stage >= 2 ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}>
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Cinematic Core</h1>
          <p className="text-muted-foreground text-sm">Enter your prop account access code to begin trading</p>
        </div>

        <div className="glass-card p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Lock className="w-3 h-3" /> Access Code
            </label>
            <Input
              type="password"
              value={accessCode}
              onChange={e => setAccessCode(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAccess()}
              placeholder="Enter your code"
              className="h-12 text-center text-lg font-mono tracking-widest"
              autoFocus
            />
          </div>

          <Button onClick={handleAccess} disabled={loading} className="w-full h-12 text-sm font-bold">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
            Enter Trading Terminal
          </Button>

          <p className="text-[10px] text-center text-muted-foreground">
            Don't have a code? Complete a prop challenge to earn access.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slide-down {
          0% { transform: translateY(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
