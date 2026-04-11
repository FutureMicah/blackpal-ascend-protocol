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
    { id: 3, type: "achievement", title: "Achievement Unlocked!", message: "100 trades with 70%+ win rate", time: "2h ago", read: false },
    { id: 4, type: "trade", title: "Stop Loss Hit", message: "GBP/USD closed at SL: 1.2650", time: "3h ago", read: true },
    { id: 5, type: "social", title: "New Follower", message: "Dark Knight started following you", time: "5h ago", read: true },
  ]);

  const markAllAsRead = () => setNotifications(notifications.map(n => ({ ...n, read: true })));
  const deleteNotification = (id: number) => setNotifications(notifications.filter(n => n.id !== id));

  const getIcon = (type: string) => {
    switch (type) {
      case "trade": return <TrendingUp className="w-3.5 h-3.5 text-primary" />;
      case "social": return <MessageSquare className="w-3.5 h-3.5 text-blue-500" />;
      case "achievement": return <Trophy className="w-3.5 h-3.5 text-yellow-500" />;
      default: return <Bell className="w-3.5 h-3.5 text-primary" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-background">
      <FloatingNav />
      <div className="max-w-3xl mx-auto px-3 sm:px-6 pt-16 pb-8">
        {/* Header */}
        <div className="text-center mb-5">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="relative">
              <Bell className="w-5 h-5 text-primary" />
              {unreadCount > 0 && <Badge className="absolute -top-1.5 -right-1.5 bg-red-500 text-white px-1 py-0 text-[8px] h-3.5 min-w-[14px] flex items-center justify-center">{unreadCount}</Badge>}
            </div>
            <h1 className="text-lg sm:text-2xl font-bold">BlackNotify</h1>
          </div>
          <p className="text-xs text-muted-foreground">Real-time alerts & updates</p>
        </div>

        {/* Actions */}
        <Card className="p-2 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-7 text-[10px] text-primary px-2">
                <CheckCheck className="w-3 h-3 mr-1" /> Mark Read
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-[10px] text-muted-foreground px-2">
                <Filter className="w-3 h-3 mr-1" /> Filter
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-[10px] text-muted-foreground px-2">
              <Settings className="w-3 h-3 mr-1" /> Settings
            </Button>
          </div>
        </Card>

        {/* Notifications */}
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card key={n.id} className={`p-2.5 transition-all group ${!n.read ? 'bg-primary/5 border-primary/20' : ''}`}>
              <div className="flex items-start gap-2">
                <div className={`p-1.5 rounded-full shrink-0 ${!n.read ? 'bg-primary/20' : 'bg-muted/30'}`}>{getIcon(n.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1 mb-0.5">
                    <h3 className={`text-[11px] font-semibold truncate ${!n.read ? '' : 'text-muted-foreground'}`}>{n.title}</h3>
                    <span className="text-[8px] text-muted-foreground whitespace-nowrap shrink-0">{n.time}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{n.message}</p>
                  {!n.read && <Badge variant="outline" className="mt-1 text-[7px] border-primary/30 text-primary px-1 py-0">New</Badge>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteNotification(n.id)} className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-red-500 shrink-0">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Preferences */}
        <Card className="p-3 mt-5">
          <h2 className="text-xs font-bold mb-3 flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5" /> Preferences
          </h2>
          <div className="space-y-2">
            {[
              { title: "Trade Signals", desc: "New trading opportunities" },
              { title: "Social", desc: "Likes, comments, follows" },
              { title: "Achievements", desc: "Milestones & badges" },
              { title: "Portfolio", desc: "Daily summaries" },
              { title: "Market Alerts", desc: "Major movements" },
            ].map((p, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                <div className="min-w-0">
                  <h3 className="text-[10px] font-medium">{p.title}</h3>
                  <p className="text-[9px] text-muted-foreground">{p.desc}</p>
                </div>
                <Switch defaultChecked className="scale-75" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BlackNotify;
