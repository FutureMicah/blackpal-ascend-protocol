import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Bell, TrendingUp, MessageSquare, Trophy, Settings, CheckCheck, Trash2, Filter } from "lucide-react";
import { FloatingNav } from "@/components/FloatingNav";

const BlackNotify = () => {
  const [notifications, setNotifications] = useState([
    { id: 1, type: "trade", title: "Trade Signal Alert", message: "EUR/USD bullish setup detected. Entry: 1.0850", time: "5m ago", read: false },
    { id: 2, type: "social", title: "New Comment", message: "Shadow Trader commented on your post", time: "1h ago", read: false },
    { id: 3, type: "achievement", title: "Achievement Unlocked!", message: "You've completed 100 trades with 70%+ win rate", time: "2h ago", read: false },
    { id: 4, type: "trade", title: "Stop Loss Hit", message: "GBP/USD position closed at SL: 1.2650", time: "3h ago", read: true },
    { id: 5, type: "social", title: "New Follower", message: "Dark Knight started following you", time: "5h ago", read: true },
  ]);

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "trade": return <TrendingUp className="w-5 h-5 text-primary" />;
      case "social": return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case "achievement": return <Trophy className="w-5 h-5 text-gold" />;
      default: return <Bell className="w-5 h-5 text-primary" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Notification background effects */}
      <div className="absolute inset-0 -z-10">
        {[...Array(20)].map((_, i) => (
          <div
            key={`ring-${i}`}
            className="absolute rounded-full border border-primary/10 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${50 + Math.random() * 100}px`,
              height: `${50 + Math.random() * 100}px`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <FloatingNav />

      <div className="container mx-auto px-4 py-8 pt-24 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <Bell className="w-10 h-10 text-primary animate-pulse" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-red-500 text-white px-2 py-0 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <h1 className="text-5xl font-bold gradient-text-cyber">BlackNotify</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Stay updated with real-time alerts and never miss a trading opportunity
          </p>
        </div>

        {/* Actions Bar */}
        <Card className="glass-strong p-4 border-primary/20 mb-6 animate-slide-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-primary">
                <CheckCheck className="w-4 h-4 mr-2" />
                Mark All Read
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </Card>

        {/* Notifications List */}
        <div className="space-y-3">
          {notifications.map((notification, idx) => (
            <Card
              key={notification.id}
              className={`glass-strong p-5 border-primary/20 animate-slide-up hover:border-primary/40 transition-all group ${
                !notification.read ? 'bg-primary/5' : ''
              }`}
              style={{ animationDelay: `${0.05 * idx}s` }}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full ${!notification.read ? 'bg-primary/20' : 'bg-background/50'}`}>
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className={`font-semibold ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {notification.title}
                    </h3>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{notification.time}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                  {!notification.read && (
                    <Badge variant="outline" className="mt-2 text-xs border-primary/30 text-primary">
                      New
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteNotification(notification.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Notification Preferences */}
        <Card className="glass-strong p-6 border-primary/20 mt-8 animate-slide-up" style={{ animationDelay: '0.5s' }}>
          <h2 className="text-2xl font-bold gradient-text-cyber mb-6 flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Notification Preferences
          </h2>
          <div className="space-y-4">
            {[
              { title: "Trade Signals", desc: "Get notified when new trading opportunities are detected" },
              { title: "Social Interactions", desc: "Likes, comments, and new followers" },
              { title: "Achievements", desc: "Milestones and badge unlocks" },
              { title: "Portfolio Updates", desc: "Daily performance summaries" },
              { title: "Market Alerts", desc: "Major market movements and news" },
            ].map((pref, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-background/30">
                <div className="flex-1">
                  <h3 className="font-medium mb-1">{pref.title}</h3>
                  <p className="text-sm text-muted-foreground">{pref.desc}</p>
                </div>
                <Switch defaultChecked />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BlackNotify;
