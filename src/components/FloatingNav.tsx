import { Home, Trophy, BarChart3, BookOpen, Vault, Users, CreditCard, Hammer, Coins, Bell, Menu, X, Search, Megaphone, Wallet, Globe, Headphones, Copy, Gift, Activity } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { name: "Dashboard", path: "/dashboard", icon: Home },
  { name: "My Accounts", path: "/my-accounts", icon: Wallet },
  { name: "Market Hub", path: "/market-hub", icon: Globe },
  { name: "Copy Trading", path: "/copy-trading", icon: Copy },
  { name: "Analytics", path: "/trade-analytics", icon: Activity },
  { name: "Referrals", path: "/referrals", icon: Gift },
  { name: "Discover", path: "/discover", icon: Search },
  { name: "Achievements", path: "/achievements", icon: Trophy },
  { name: "Leaderboard", path: "/leaderboard", icon: BarChart3 },
  { name: "BlackBoard", path: "/blackboard", icon: BookOpen },
  { name: "BlackVault", path: "/blackvault", icon: Vault },
  { name: "BlackVerse", path: "/blackverse", icon: Users },
  { name: "BlackPass", path: "/blackpass", icon: CreditCard },
  { name: "BlackForge", path: "/blackforge", icon: Hammer },
  { name: "BlackCoin", path: "/blackcoin", icon: Coins },
  { name: "BlackNotify", path: "/blacknotify", icon: Bell },
  { name: "Community", path: "/community", icon: Megaphone },
];

// Bottom tab items for quick mobile access
const mobileQuickTabs = [
  { name: "Home", path: "/dashboard", icon: Home },
  { name: "Accounts", path: "/my-accounts", icon: Wallet },
  { name: "Market", path: "/market-hub", icon: Globe },
  { name: "Discover", path: "/discover", icon: Search },
];

export const FloatingNav = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);

  useEffect(() => {
    const loadPendingRequests = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { count } = await supabase
        .from("friend_connections")
        .select("*", { count: "exact", head: true })
        .eq("friend_id", user.id)
        .eq("status", "pending");
      setPendingRequests(count || 0);
    };
    loadPendingRequests();
    const channel = supabase.channel("nav-friend-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "friend_connections" }, () => loadPendingRequests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (isMobile) {
    return (
      <>
        {/* Top bar with menu */}
        <nav className="fixed top-0 left-0 right-0 z-50 h-12 bg-background/90 backdrop-blur-xl border-b border-border/50 flex items-center px-3">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[260px] p-0">
              <SheetHeader className="p-4 pb-2">
                <SheetTitle className="text-sm">Navigation</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-2 pb-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  const showBadge = item.path === "/discover" && pendingRequests > 0;
                  return (
                    <Link key={item.path} to={item.path} onClick={() => setOpen(false)}
                      className={cn("relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all text-xs", isActive ? "bg-primary text-primary-foreground" : "hover:bg-primary/10 text-muted-foreground hover:text-foreground")}>
                      <div className="relative">
                        <Icon className="w-4 h-4" />
                        {showBadge && <Badge variant="destructive" className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 p-0 flex items-center justify-center text-[8px]">{pendingRequests > 9 ? "9+" : pendingRequests}</Badge>}
                      </div>
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  );
                })}
                <div className="flex items-center gap-2.5 px-3 py-2.5 mt-2 border-t border-border">
                  <ThemeToggle />
                  <span className="text-xs text-muted-foreground">Theme</span>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <span className="text-xs font-bold text-foreground ml-2">BlackPal</span>
          <div className="flex-1" />
          <ThemeToggle />
        </nav>

        {/* Bottom tab bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/50 safe-area-pb">
          <div className="flex items-center justify-around h-12">
            {mobileQuickTabs.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path} className={cn("flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors", isActive ? "text-primary" : "text-muted-foreground")}>
                  <Icon className="w-4 h-4" />
                  <span className="text-[9px] font-medium">{item.name}</span>
                </Link>
              );
            })}
            <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground">
              <Menu className="w-4 h-4" />
              <span className="text-[9px] font-medium">More</span>
            </button>
          </div>
        </nav>
      </>
    );
  }

  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className="glass-strong rounded-full px-6 py-3 shadow-depth-xl border border-primary/20">
        <div className="flex items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const showBadge = item.path === "/discover" && pendingRequests > 0;
            return (
              <Link key={item.path} to={item.path}
                className={cn("relative group px-4 py-2 rounded-full transition-all duration-300 flex items-center gap-2", isActive ? "bg-primary text-primary-foreground shadow-lg" : "hover:bg-primary/10 text-muted-foreground hover:text-foreground")}>
                <div className="relative">
                  <Icon className="w-4 h-4" />
                  {showBadge && <Badge variant="destructive" className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px]">{pendingRequests > 9 ? "9+" : pendingRequests}</Badge>}
                </div>
                <span className="text-sm font-medium hidden lg:inline">{item.name}</span>
                {isActive && <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />}
              </Link>
            );
          })}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
};
