import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { AchievementPaths } from "@/components/AchievementPaths";
import { TimedChallenges } from "@/components/TimedChallenges";
import { supabase } from "@/integrations/supabase/client";
import { ParticleField } from "@/components/ParticleField";

const AchievementPathsPage = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/");
      return;
    }
    setUserId(user.id);
  };

  if (!userId) return null;

  return (
    <div className="min-h-screen bg-background relative">
      <ParticleField />
      
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/20 to-accent/20 border-b relative z-10">
        <div className="max-w-7xl mx-auto p-6 space-y-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/achievements")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Achievements
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <h1 className="text-4xl font-bold">Achievement Progression</h1>
            <p className="text-muted-foreground">
              Explore achievement paths and take on time-limited challenges
            </p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6 space-y-8 relative z-10">
        {/* Time-Limited Challenges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <TimedChallenges userId={userId} />
        </motion.div>

        {/* Achievement Paths */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <AchievementPaths userId={userId} />
        </motion.div>
      </div>
    </div>
  );
};

export default AchievementPathsPage;
