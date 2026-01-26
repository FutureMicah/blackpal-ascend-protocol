import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BarChart3, Sword, Radio, GraduationCap, 
  Wallet, ArrowLeft, Sparkles, BookOpen,
  Signal, PieChart, Swords, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AITradingAssistant, AIAssistantTrigger } from "@/components/AITradingAssistant";
import { PaperTradingSimulator } from "@/components/PaperTradingSimulator";
import { BattlePassSystem } from "@/components/BattlePassSystem";
import { LiveTradingRooms } from "@/components/LiveTradingRooms";
import { MentorMatchingSystem } from "@/components/MentorMatchingSystem";
import { TradingJournal } from "@/components/TradingJournal";
import { TradingSignals } from "@/components/TradingSignals";
import { CompetitionArena } from "@/components/CompetitionArena";

type Feature = "simulator" | "battlepass" | "rooms" | "mentors" | "journal" | "signals" | "competition" | null;

const features = [
  { id: "simulator" as Feature, icon: BarChart3, label: "Paper Trading", desc: "Practice with $100k virtual funds", color: "from-green-500/20" },
  { id: "battlepass" as Feature, icon: Sword, label: "Battle Pass", desc: "Seasonal rewards & progression", color: "from-purple-500/20" },
  { id: "rooms" as Feature, icon: Radio, label: "Live Rooms", desc: "Trade with the community", color: "from-red-500/20" },
  { id: "mentors" as Feature, icon: GraduationCap, label: "Mentors", desc: "1-on-1 coaching sessions", color: "from-blue-500/20" },
  { id: "journal" as Feature, icon: BookOpen, label: "Trade Journal", desc: "AI-powered trade analysis", color: "from-orange-500/20" },
  { id: "signals" as Feature, icon: Signal, label: "Signals", desc: "Follow top traders", color: "from-cyan-500/20" },
  { id: "competition" as Feature, icon: Swords, label: "Compete", desc: "Win prizes in tournaments", color: "from-yellow-500/20" },
];

const BlackArenaPlus = () => {
  const [activeFeature, setActiveFeature] = useState<Feature>(null);
  const [showAI, setShowAI] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
      else navigate("/auth");
    });
  }, [navigate]);

  const renderFeature = () => {
    switch (activeFeature) {
      case "simulator": return <PaperTradingSimulator />;
      case "battlepass": return <BattlePassSystem />;
      case "rooms": return <LiveTradingRooms />;
      case "mentors": return <MentorMatchingSystem />;
      case "journal": return <TradingJournal />;
      case "signals": return <TradingSignals />;
      case "competition": return <CompetitionArena />;
      default: return null;
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => activeFeature ? setActiveFeature(null) : navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Black Arena Pro
            </h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
            <Wallet className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
        </div>
      </header>

      <main className="container px-4 py-8">
        <AnimatePresence mode="wait">
          {!activeFeature ? (
            <motion.div
              key="menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* Hero */}
              <div className="text-center mb-8">
                <h2 className="text-4xl font-bold mb-4">Premium Trading Hub</h2>
                <p className="text-muted-foreground max-w-lg mx-auto">
                  Access exclusive tools, compete in challenges, and level up your trading game
                </p>
              </div>

              {/* Feature Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {features.map((feature, i) => (
                  <motion.button
                    key={feature.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setActiveFeature(feature.id)}
                    className={`p-5 rounded-2xl border border-border bg-gradient-to-br ${feature.color} to-transparent text-left transition-all hover:border-primary/50 hover:scale-[1.02]`}
                  >
                    <feature.icon className="w-8 h-8 text-primary mb-3" />
                    <h3 className="text-lg font-semibold mb-1">{feature.label}</h3>
                    <p className="text-muted-foreground text-sm">{feature.desc}</p>
                  </motion.button>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                {[
                  { label: "Active Traders", value: "2,345" },
                  { label: "Total Trades", value: "156K" },
                  { label: "Prize Pool", value: "$50K" },
                  { label: "Mentors", value: "48" },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="p-4 rounded-xl bg-card/50 border border-border text-center"
                  >
                    <p className="text-2xl font-bold text-primary">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={activeFeature}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {renderFeature()}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* AI Assistant */}
      <AITradingAssistant isOpen={showAI} onClose={() => setShowAI(false)} />
      {!showAI && <AIAssistantTrigger onClick={() => setShowAI(true)} />}
    </div>
  );
};

export default BlackArenaPlus;
