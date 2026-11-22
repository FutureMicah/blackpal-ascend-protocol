import { Activity, BookOpen, Trophy, Zap } from "lucide-react";

interface ActivityFeedProps {
  userId: string;
}

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

/** Static recent activity list — no motion so parent re-renders do not jump. */
export const ActivityFeed = ({ userId: _userId }: ActivityFeedProps) => {
  return (
    <div className="glass-card p-4 sm:p-6 space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-xl font-bold text-foreground flex items-center gap-2">
          <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          Recent Activity
        </h2>
      </div>

      <div className="space-y-2 sm:space-y-3">
        {mockActivities.map((activity) => {
          const Icon = activity.icon;
          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-card/50"
            >
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  activity.type === "xp"
                    ? "bg-primary/10"
                    : activity.type === "achievement"
                      ? "bg-yellow-500/10"
                      : "bg-secondary/10"
                }`}
              >
                <Icon
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${
                    activity.type === "xp"
                      ? "text-primary"
                      : activity.type === "achievement"
                        ? "text-yellow-500"
                        : "text-secondary"
                  }`}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-xs sm:text-sm text-foreground">
                    {activity.title}
                  </div>
                  {activity.amount && (
                    <div className="text-xs sm:text-sm font-semibold text-primary whitespace-nowrap">
                      {activity.amount}
                    </div>
                  )}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
                  {activity.description}
                </div>
                <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                  {activity.timestamp}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {mockActivities.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold">No recent activity</p>
        </div>
      )}
    </div>
  );
};
