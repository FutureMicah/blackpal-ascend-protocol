import { Home, Trophy, BarChart3, BookOpen, Vault, Users, CreditCard, Hammer, Coins, Bell, Menu, X, Search } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navItems = [
  { name: "Dashboard", path: "/dashboard", icon: Home },
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
];

export const FloatingNav = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

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
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : "hover:bg-primary/10 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </Link>
                );
              })}
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
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium hidden lg:inline">
                  {item.name}
                </span>
                {isActive && (
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
