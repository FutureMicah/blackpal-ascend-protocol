import { Home, Trophy, BarChart3, BookOpen, Vault, Users, CreditCard, Hammer, Coins, Bell } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard", path: "/dashboard", icon: Home },
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
                <span className="text-sm font-medium hidden md:inline">
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
