import { motion } from "framer-motion";
import { Activity, BookOpen, Trophy, Zap } from "lucide-react";

interface ActivityFeedProps {
  userId: string;
}

// Mock activity data
const mockActivities = [
  {
    id: 1,
    type: "xp",
    title: "XP Gained",
    description: "Completed profile setup",
    amount: "+50 XP",
    timestamp: "2 hours ago",
    icon: Zap,
  },
  {
    id: 2,
    type: "lesson",
    title: "Lesson Started",
    description: "Introduction to Trading",
    timestamp: "1 day ago",
    icon: BookOpen,
  },
  {
    id: 3,
    type: "achievement",
    title: "Achievement Unlocked",
    description: "First Steps - Complete your profile",
    timestamp: "2 days ago",
    icon: Trophy,
  },
];

export const ActivityFeed = ({ userId }: ActivityFeedProps) => {
  return (
    <motion.div
      className="glass-card p-6 space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Recent Activity
        </h2>
      </div>

      {/* Activity List */}
      <div className="space-y-3">
        {mockActivities.map((activity, index) => {
          const Icon = activity.icon;
          return (
            <motion.div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-card/50 hover:bg-card transition-colors"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                activity.type === "xp" ? "bg-primary/10" :
                activity.type === "achievement" ? "bg-yellow-500/10" :
                "bg-secondary/10"
              }`}>
                <Icon className={`w-5 h-5 ${
                  activity.type === "xp" ? "text-primary" :
                  activity.type === "achievement" ? "text-yellow-500" :
                  "text-secondary"
                }`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-sm text-foreground">
                    {activity.title}
                  </div>
                  {activity.amount && (
                    <div className="text-sm font-semibold text-primary whitespace-nowrap">
                      {activity.amount}
                    </div>
                  )}
                </div>
                <div className="text-sm text-muted-foreground line-clamp-1">
                  {activity.description}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {activity.timestamp}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Empty state if no activities */}
      {mockActivities.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No recent activity</p>
        </div>
      )}
    </motion.div>
  );
};
