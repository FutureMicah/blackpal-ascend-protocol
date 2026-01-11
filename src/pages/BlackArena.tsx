import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bot, BarChart3, Sword, Radio, GraduationCap, 
  Wallet, ArrowLeft, Sparkles
} from "lucide-react";
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
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => activeFeature ? setActiveFeature(null) : navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Black Arena
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
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4">Premium Trading Hub</h2>
                <p className="text-muted-foreground max-w-lg mx-auto">
                  Access exclusive tools, compete in challenges, and level up your trading game
                </p>
              </div>

              {/* Feature Grid */}
              <div className="grid gap-6 md:grid-cols-2">
                {features.map((feature, i) => (
                  <motion.button
                    key={feature.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => setActiveFeature(feature.id)}
                    className={`p-6 rounded-2xl border border-border bg-gradient-to-br ${feature.color} to-transparent text-left transition-all hover:border-primary/50 hover:scale-[1.02]`}
                  >
                    <feature.icon className="w-10 h-10 text-primary mb-4" />
                    <h3 className="text-xl font-semibold mb-1">{feature.label}</h3>
                    <p className="text-muted-foreground text-sm">{feature.desc}</p>
                  </motion.button>
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
              {activeFeature === "simulator" && <PaperTradingSimulator />}
              {activeFeature === "battlepass" && <BattlePassSystem />}
              {activeFeature === "rooms" && <LiveTradingRooms />}
              {activeFeature === "mentors" && <MentorMatchingSystem />}
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

export default BlackArena;
