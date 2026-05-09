import {
  Home, Trophy, BarChart3, BookOpen, Vault, Users, CreditCard, Hammer, Coins,
  Bell, Menu, Search, Megaphone, Wallet, Globe, Copy, Gift, Activity, Map,
  Wrench, LineChart, Shield, User as UserIcon, LogOut, Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
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

// Priority items always visible in header (kept to 3)
const priorityItems = [
  { name: "Dashboard", path: "/dashboard", icon: Home },
  { name: "Contest", path: "/contest", icon: Sparkles, comingSoon: true },
  { name: "Market", path: "/market-hub", icon: Globe },
];

// Bottom tab bar (mobile) - the 4 most-used destinations + More
const mobileBottomTabs = [
  { name: "Dashboard", path: "/dashboard", icon: Home },
  { name: "Portfolio", path: "/my-accounts", icon: Wallet },
  { name: "Contest", path: "/contest", icon: Sparkles, comingSoon: true },
  { name: "Vault", path: "/blackvault", icon: Vault },
];

// Side drawer organised into groups (used on both desktop & mobile via the menu)
const drawerGroups: { label: string; items: { name: string; path: string; icon: typeof Home }[] }[] = [
  {
    label: "Trading",
    items: [
      { name: "Portfolio", path: "/my-accounts", icon: Wallet },
      { name: "Market Hub", path: "/market-hub", icon: Globe },
      { name: "Trade Terminal", path: "/cinematic-core", icon: LineChart },
      { name: "Forex Tools", path: "/forex-tools", icon: Wrench },
      { name: "Copy Trading", path: "/copy-trading", icon: Copy },
      { name: "Analytics", path: "/trade-analytics", icon: Activity },
      { name: "Transactions", path: "/blackvault", icon: Vault },
    ],
  },
  {
    label: "Community",
    items: [
      { name: "Discover", path: "/discover", icon: Search },
      { name: "Friends", path: "/friends", icon: Users },
      { name: "BlackVerse", path: "/blackverse", icon: Users },
      { name: "Community", path: "/community", icon: Megaphone },
      { name: "Trader Atlas", path: "/world-map", icon: Map },
      { name: "Referrals", path: "/referrals", icon: Gift },
    ],
  },
  {
    label: "Progress",
    items: [
      { name: "Achievements", path: "/achievements", icon: Trophy },
      { name: "Leaderboard", path: "/leaderboard", icon: BarChart3 },
      { name: "BlackBoard", path: "/blackboard", icon: BookOpen },
      { name: "BlackPass", path: "/blackpass", icon: CreditCard },
      { name: "BlackForge", path: "/blackforge", icon: Hammer },
      { name: "BlackCoin", path: "/blackcoin", icon: Coins },
    ],
  },
  {
    label: "Account",
    items: [
      { name: "Profile", path: "/profile/edit", icon: UserIcon },
      { name: "Notifications", path: "/blacknotify", icon: Bell },
      { name: "Admin", path: "/admin", icon: Shield },
    ],
  },
];

const CircularLogo = ({ size = 32 }: { size?: number }) => (
  <div
    className="relative rounded-full overflow-hidden border border-primary/30 shadow-[0_0_18px_rgba(139,92,246,0.45)] shrink-0"
    style={{ width: size, height: size }}
  >
    <img
      src="/blackpal-logo.png"
      alt="BlackPal"
      className="absolute inset-0 w-full h-full object-cover scale-[1.35]"
      draggable={false}
    />
    <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/10 pointer-events-none" />
  </div>
);

const DrawerContents = ({
  pathname,
  onNavigate,
  pendingRequests,
}: {
  pathname: string;
  onNavigate: () => void;
  pendingRequests: number;
}) => (
  <div className="flex-1 overflow-y-auto px-2 pb-6">
    {drawerGroups.map((group) => (
      <div key={group.label} className="mt-3">
        <p className="px-3 pb-1 text-[10px] uppercase tracking-[0.15em] text-muted-foreground/70 font-semibold">
          {group.label}
        </p>
        <div className="space-y-0.5">
          {group.items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            const showBadge = item.path === "/discover" && pendingRequests > 0;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onNavigate}
                className={cn(
                  "relative flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-xs",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-primary/10 text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="relative">
                  <Icon className="w-4 h-4" />
                  {showBadge && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 p-0 flex items-center justify-center text-[8px]"
                    >
                      {pendingRequests > 9 ? "9+" : pendingRequests}
                    </Badge>
                  )}
                </div>
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    ))}
    <div className="flex items-center gap-2.5 px-3 py-3 mt-4 border-t border-border">
      <ThemeToggle />
      <span className="text-xs text-muted-foreground">Theme</span>
    </div>
  </div>
);

export const FloatingNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out", description: "See you soon." });
    navigate("/");
  };

  const handleContest = (e: React.MouseEvent) => {
    e.preventDefault();
    toast({
      title: "Contest — coming soon",
      description: "We're polishing the leaderboard arena. Stay tuned.",
    });
  };

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
    const channel = supabase
      .channel("nav-friend-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "friend_connections" }, () =>
        loadPendingRequests()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (isMobile) {
    return (
      <>
        {/* Top bar — circular logo + brand + 3 priority items + menu */}
        <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-background/90 backdrop-blur-xl border-b border-border/50 flex items-center px-3 gap-2">
          <CircularLogo size={32} />
          <span className="text-sm font-bold text-foreground">BlackPal</span>
          <div className="flex-1" />
          {priorityItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const sizeCls = item.comingSoon ? "w-7 h-7" : "w-9 h-9";
            const iconCls = item.comingSoon ? "w-3 h-3" : "w-4 h-4";
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-label={item.name + (item.comingSoon ? " (coming soon)" : "")}
                title={item.comingSoon ? `${item.name} — coming soon` : item.name}
                onClick={item.comingSoon ? handleContest : undefined}
                className={cn(
                  "rounded-full flex items-center justify-center transition-colors relative",
                  sizeCls,
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-primary/10",
                  item.comingSoon && "opacity-70"
                )}
              >
                <Icon className={iconCls} />
              </Link>
            );
          })}
          <button
            onClick={handleSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] p-0 flex flex-col">
              <SheetHeader className="p-4 pb-2 flex-row items-center gap-3 space-y-0">
                <CircularLogo size={36} />
                <SheetTitle className="text-sm">BlackPal</SheetTitle>
              </SheetHeader>
              <DrawerContents
                pathname={location.pathname}
                onNavigate={() => setOpen(false)}
                pendingRequests={pendingRequests}
              />
            </SheetContent>
          </Sheet>
        </nav>

        {/* Bottom tab bar — 4 fixed destinations + More */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/50"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex items-center justify-around h-14">
            {mobileBottomTabs.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={item.comingSoon ? handleContest : undefined}
                  className={cn(
                    "relative flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-[56px]",
                    isActive ? "text-primary" : "text-muted-foreground",
                    item.comingSoon && "opacity-80"
                  )}
                >
                  <Icon className={item.comingSoon ? "w-4 h-4" : "w-5 h-5"} />
                  <span className="text-[10px] font-medium">{item.name}</span>
                  {item.comingSoon && (
                    <span className="absolute -top-0.5 right-1 text-[7px] uppercase tracking-wider bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1 rounded-full">
                      soon
                    </span>
                  )}
                </Link>
              );
            })}
            <button
              onClick={() => setOpen(true)}
              className="flex flex-col items-center gap-0.5 px-2 py-1 text-muted-foreground min-w-[56px]"
            >
              <Menu className="w-5 h-5" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </div>
        </nav>
      </>
    );
  }

  // Desktop — slim header with circular logo, 3 priority items, and side menu trigger
  return (
    <nav className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className="glass-strong rounded-full pl-2 pr-3 py-2 shadow-depth-xl border border-primary/20">
        <div className="flex items-center gap-2">
          <Link to="/dashboard" className="flex items-center gap-2 pr-2">
            <CircularLogo size={36} />
            <span className="text-sm font-bold tracking-wide hidden md:inline">BlackPal</span>
          </Link>
          <div className="w-px h-6 bg-border/60 mx-1" />
          {priorityItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={item.comingSoon ? handleContest : undefined}
                title={item.comingSoon ? `${item.name} — coming soon` : item.name}
                className={cn(
                  "group px-3.5 py-2 rounded-full transition-all duration-300 flex items-center gap-2 relative",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "hover:bg-primary/10 text-muted-foreground hover:text-foreground",
                  item.comingSoon && "opacity-80"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.name}</span>
                {item.comingSoon && (
                  <span className="text-[8px] uppercase tracking-wider bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                    soon
                  </span>
                )}
              </Link>
            );
          })}
          <div className="w-px h-6 bg-border/60 mx-1" />
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full h-9 px-3 gap-2 hover:bg-destructive/10 hover:text-destructive"
            onClick={handleSignOut}
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium hidden lg:inline">Sign out</span>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full h-9 px-3 gap-2 hover:bg-primary/10"
              >
                <Menu className="w-4 h-4" />
                <span className="text-sm font-medium">Menu</span>
                {pendingRequests > 0 && (
                  <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
                    {pendingRequests > 9 ? "9+" : pendingRequests}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[320px] p-0 flex flex-col">
              <SheetHeader className="p-4 pb-2 flex-row items-center gap-3 space-y-0">
                <CircularLogo size={40} />
                <div>
                  <SheetTitle className="text-sm">BlackPal Ascend</SheetTitle>
                  <p className="text-[10px] text-muted-foreground">All destinations</p>
                </div>
              </SheetHeader>
              <DrawerContents
                pathname={location.pathname}
                onNavigate={() => setOpen(false)}
                pendingRequests={pendingRequests}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};
