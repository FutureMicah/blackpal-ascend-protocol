import { Home, Trophy, BarChart3, BookOpen, Vault, Users, CreditCard, Hammer, Coins, Bell, Menu, X, Search, Megaphone, Wallet, Globe, Headphones } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { name: "Dashboard", path: "/dashboard", icon: Home },
  { name: "My Accounts", path: "/my-accounts", icon: Wallet },
  { name: "Market Hub", path: "/market-hub", icon: Globe },
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

    // Subscribe to realtime updates for friend requests
    const channel = supabase
      .channel("nav-friend-requests")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friend_connections",
        },
        () => {
          loadPendingRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const renderNavItem = (item: typeof navItems[0], isActive: boolean, onClick?: () => void) => {
    const Icon = item.icon;
    const showBadge = item.path === "/discover" && pendingRequests > 0;
    
    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={onClick}
        className={cn(
          "relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300",
          isActive
            ? "bg-primary text-primary-foreground shadow-lg"
            : "hover:bg-primary/10 text-muted-foreground hover:text-foreground"
        )}
      >
        <div className="relative">
          <Icon className="w-5 h-5" />
          {showBadge && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
            >
              {pendingRequests > 9 ? "9+" : pendingRequests}
            </Badge>
          )}
        </div>
        <span className="text-sm font-medium">{item.name}</span>
      </Link>
    );
  };

  if (isMobile) {
    return (
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="glass-strong rounded-full shadow-depth-xl border border-primary/20"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="top" className="glass-strong border-primary/20">
            <SheetHeader>
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <div className="grid gap-2 py-4">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return renderNavItem(item, isActive, () => setOpen(false));
              })}
              <div className="flex items-center gap-3 px-4 py-3">
                <ThemeToggle />
                <span className="text-sm font-medium text-muted-foreground">Toggle Theme</span>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
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
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "relative group px-4 py-2 rounded-full transition-all duration-300 flex items-center gap-2",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "hover:bg-primary/10 text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="relative">
                  <Icon className="w-4 h-4" />
                  {showBadge && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                    >
                      {pendingRequests > 9 ? "9+" : pendingRequests}
                    </Badge>
                  )}
                </div>
                <span className="text-sm font-medium hidden lg:inline">
                  {item.name}
                </span>
                {isActive && (
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
                )}
              </Link>
            );
          })}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
};
