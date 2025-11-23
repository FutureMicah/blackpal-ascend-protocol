import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import logo from "@/assets/blackpal-logo.jpg";
import { Sparkles } from "lucide-react";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user && event === 'SIGNED_IN') {
          setShowWelcome(true);
          setTimeout(() => {
            navigate("/dashboard");
          }, 2500);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
            }
          }
        });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Account created! You can now sign in.",
        });
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Welcome message will be shown by onAuthStateChange
        toast({
          title: "Authentication Successful",
          description: "Welcome back, Trader.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* 3D Black Nebula Background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-background via-background to-primary/5">
        {/* Pulsing light rays */}
        <div className="absolute inset-0">
          {[...Array(8)].map((_, i) => (
            <div
              key={`ray-${i}`}
              className="absolute h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-pulse"
              style={{
                width: '200%',
                left: '-50%',
                top: `${(i + 1) * 12}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: '3s',
              }}
            />
          ))}
        </div>
        
        {/* Animated particles - magnetic field effect */}
        {[...Array(40)].map((_, i) => (
          <div
            key={`particle-${i}`}
            className="absolute w-1 h-1 bg-primary rounded-full animate-particle blur-sm"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 5}s`,
              opacity: 0.3 + Math.random() * 0.4,
            }}
          />
        ))}
      </div>

      {/* Holographic welcome overlay */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-lg animate-fade-in">
          <div className="text-center animate-scale-in">
            <div className="relative inline-block mb-6">
              <img 
                src={logo} 
                alt="BlackTrader Academy" 
                className="w-32 h-32 rounded-full glow-cyan animate-float"
              />
              <Sparkles className="absolute -top-4 -right-4 w-12 h-12 text-gold animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <h1 className="text-5xl font-bold gradient-text-cyber mb-4 animate-glow-pulse">
              Welcome back, Trader
            </h1>
            <p className="text-xl text-muted-foreground">
              Precision rewards patience.
            </p>
          </div>
        </div>
      )}

      {/* Central rotating BTA logo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
        <div className="relative animate-float-3d">
          <img 
            src={logo} 
            alt="BTA" 
            className="w-40 h-40 rounded-full opacity-60 blur-sm"
            style={{
              animation: 'float-3d 6s ease-in-out infinite, spin 20s linear infinite',
            }}
          />
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 animate-pulse" />
        </div>
      </div>

      {/* Glass panel - glides in from below */}
      <div className="glass-strong max-w-md w-full mx-4 p-6 sm:p-8 rounded-3xl animate-slide-up shadow-depth-xl border border-primary/20 relative overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-6">
              <img 
                src={logo} 
                alt="BlackTrader Academy" 
                className="w-24 h-24 rounded-full glow-cyan float-3d"
              />
              {/* Electromagnetic pulse effect */}
              <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
            </div>
            
            <h1 className="text-4xl font-bold gradient-text-cyber mb-3">
              {isSignUp ? "Join the Black Universe" : "Welcome Back"}
            </h1>
            <p className="text-muted-foreground text-center text-sm">
              {isSignUp 
                ? "Enter a world of precision, discipline, and prestige" 
                : "The command center awaits your return"}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {isSignUp && (
              <div className="space-y-2 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <Label htmlFor="fullName" className="text-foreground/90">Trader Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-12 bg-background/50 border-primary/30 focus:border-primary"
                />
              </div>
            )}

            <div className="space-y-2 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Label htmlFor="email" className="text-foreground/90">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="trader@blackpal.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 bg-background/50 border-primary/30 focus:border-primary"
              />
            </div>

            <div className="space-y-2 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <Label htmlFor="password" className="text-foreground/90">Access Code</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your secure code"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-12 bg-background/50 border-primary/30 focus:border-primary"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 text-lg font-semibold bg-gradient-cyber hover:opacity-90 transition-all duration-300 hover:scale-[1.02] glow-cyan animate-slide-up"
              style={{ animationDelay: '0.4s' }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isSignUp ? "Initializing..." : "Authenticating..."}
                </span>
              ) : (
                isSignUp ? "Enter BlackTrader Academy" : "Access Command Center"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center animate-slide-up border-t border-primary/10 pt-6" style={{ animationDelay: '0.4s' }}>
            <p className="text-sm text-muted-foreground mb-3">
              Want the full premium experience?
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/signup")}
              className="w-full border-primary/30 hover:bg-primary/10"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Premium Sign-Up (Investor & Student Paths)
            </Button>
          </div>

          <div className="mt-6 text-center animate-slide-up" style={{ animationDelay: '0.5s' }}>
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
            >
              {isSignUp 
                ? "Already a member? → Sign in" 
                : "New trader? → Create account"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default Auth;
