import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Bell, X, Trophy, Star, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Notification {
  id: string;
  type: "achievement" | "challenge" | "trade" | "guild" | "combo";
  title: string;
  message: string;
  icon: string;
  timestamp: string;
  read: boolean;
}

interface NotificationCenterProps {
  userId: string;
}

export const NotificationCenter = ({ userId }: NotificationCenterProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [latestNotification, setLatestNotification] = useState<Notification | null>(null);

  useEffect(() => {
    loadNotifications();
    subscribeToAchievements();
    subscribeToChallenges();
    subscribeToTrades();
  }, [userId]);

  const loadNotifications = () => {
    // Load from localStorage for demo
    const stored = localStorage.getItem(`notifications_${userId}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      setNotifications(parsed);
      setUnreadCount(parsed.filter((n: Notification) => !n.read).length);
    }
  };

  const saveNotifications = (notifs: Notification[]) => {
    localStorage.setItem(`notifications_${userId}`, JSON.stringify(notifs));
    setNotifications(notifs);
    setUnreadCount(notifs.filter((n) => !n.read).length);
  };

  const addNotification = (notification: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotif: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false,
    };

    const updated = [newNotif, ...notifications].slice(0, 50); // Keep last 50
    saveNotifications(updated);

    // Show toast
    setLatestNotification(newNotif);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);
  };

  const subscribeToAchievements = () => {
    const channel = supabase
      .channel("achievement-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_achievements",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const { data: achievement } = await supabase
            .from("achievements")
            .select("name, icon")
            .eq("id", payload.new.achievement_id)
            .single();

          if (achievement) {
            addNotification({
              type: "achievement",
              title: "Achievement Unlocked!",
              message: `You've earned: ${achievement.name}`,
              icon: achievement.icon,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToChallenges = () => {
    const channel = supabase
      .channel("challenge-notifications")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_challenge_progress",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          if (payload.new.is_completed && !payload.old.is_completed) {
            const { data: challenge } = await supabase
              .from("achievement_challenges")
              .select("challenge_name, challenge_icon")
              .eq("id", payload.new.challenge_id)
              .single();

            if (challenge) {
              addNotification({
                type: "challenge",
                title: "Challenge Completed!",
                message: `You've completed: ${challenge.challenge_name}`,
                icon: challenge.challenge_icon,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToTrades = () => {
    const channel = supabase
      .channel("trade-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "achievement_trades",
          filter: `to_user_id=eq.${userId}`,
        },
        async (payload) => {
          const { data: achievement } = await supabase
            .from("achievements")
            .select("name, icon")
            .eq("id", payload.new.achievement_id)
            .single();

          if (achievement) {
            addNotification({
              type: "trade",
              title: "Trade Offer Received!",
              message: `Someone offered you: ${achievement.name}`,
              icon: achievement.icon,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    saveNotifications(updated);
  };

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    saveNotifications(updated);
  };

  const deleteNotification = (id: string) => {
    const updated = notifications.filter((n) => n.id !== id);
    saveNotifications(updated);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "achievement":
        return <Trophy className="h-5 w-5 text-primary" />;
      case "challenge":
        return <Star className="h-5 w-5 text-secondary" />;
      case "combo":
        return <Sparkles className="h-5 w-5 text-accent" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  return (
    <>
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && latestNotification && (
          <motion.div
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            className="fixed top-4 right-4 z-50 w-80"
          >
            <div className="p-4 rounded-lg bg-card border border-primary shadow-lg">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{latestNotification.icon}</span>
                <div className="flex-1">
                  <p className="font-semibold">{latestNotification.title}</p>
                  <p className="text-sm text-muted-foreground">{latestNotification.message}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowToast(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Center Sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                  Mark all read
                </Button>
              )}
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-120px)] mt-6">
            <div className="space-y-2">
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-4 rounded-lg border ${
                      notification.read ? "bg-muted/30" : "bg-primary/5 border-primary/30"
                    }`}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{getNotificationIcon(notification.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-sm flex items-center gap-2">
                              <span className="text-2xl">{notification.icon}</span>
                              {notification.title}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(notification.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="h-6 w-6 p-0 flex-shrink-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
};
