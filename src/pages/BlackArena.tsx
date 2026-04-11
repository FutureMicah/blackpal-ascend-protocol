import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, BarChart3, Sword, Radio, GraduationCap, Wallet, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { AITradingAssistant, AIAssistantTrigger } from "@/components/AITradingAssistant";
import { PaperTradingSimulator } from "@/components/PaperTradingSimulator";
import { BattlePassSystem } from "@/components/BattlePassSystem";
import { LiveTradingRooms } from "@/components/LiveTradingRooms";
import { MentorMatchingSystem } from "@/components/MentorMatchingSystem";

type Feature = "simulator" | "battlepass" | "rooms" | "mentors" | null;

const features = [
  { id: "simulator" as Feature, icon: BarChart3, label: "Paper Trading", desc: "Practice with $100k virtual funds", color: "from-green-500/20" },
  { id: "battlepass" as Feature, icon: Sword, label: "Battle Pass", desc: "Seasonal rewards & progression", color: "from-purple-500/20" },
  { id: "rooms" as Feature, icon: Radio, label: "Live Rooms", desc: "Trade with the community", color: "from-red-500/20" },
  { id: "mentors" as Feature, icon: GraduationCap, label: "Mentors", desc: "1-on-1 coaching sessions", color: "from-blue-500/20" },
];

const BlackArena = () => {
  const [activeFeature, setActiveFeature] = useState<Feature>(null);
  const [showAI, setShowAI] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between h-12 px-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => activeFeature ? setActiveFeature(null) : navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-sm font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Black Arena
            </h1>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" onClick={() => navigate("/dashboard")}>
            <Wallet className="w-3 h-3 mr-1" /> Dashboard
          </Button>
        </div>
      </header>

      <main className="px-3 py-4">
        <AnimatePresence mode="wait">
          {!activeFeature ? (
            <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 max-w-3xl mx-auto">
              <div className="text-center mb-4">
                <h2 className="text-lg sm:text-2xl font-bold mb-1">Premium Trading Hub</h2>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">Exclusive tools, challenges, and mentorship</p>
              </div>
              <div className="grid gap-3 grid-cols-2">
                {features.map((f, i) => (
                  <motion.button key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    onClick={() => setActiveFeature(f.id)}
                    className={`p-3 rounded-xl border border-border bg-gradient-to-br ${f.color} to-transparent text-left transition-all hover:border-primary/50`}>
                    <f.icon className="w-6 h-6 text-primary mb-2" />
                    <h3 className="text-xs font-semibold mb-0.5">{f.label}</h3>
                    <p className="text-[9px] text-muted-foreground">{f.desc}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key={activeFeature} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              {activeFeature === "simulator" && <PaperTradingSimulator />}
              {activeFeature === "battlepass" && <BattlePassSystem />}
              {activeFeature === "rooms" && <LiveTradingRooms />}
              {activeFeature === "mentors" && <MentorMatchingSystem />}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AITradingAssistant isOpen={showAI} onClose={() => setShowAI(false)} />
      {!showAI && <AIAssistantTrigger onClick={() => setShowAI(true)} />}
    </div>
  );
};

export default BlackArena;
