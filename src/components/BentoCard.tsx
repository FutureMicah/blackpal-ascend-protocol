import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface BentoCardProps {
  icon: LucideIcon;
  title: string;
  value: string;
  subtitle?: string;
  change?: string;
  trend: "up" | "down" | "neutral";
  delay?: number;
  size?: "normal" | "large";
}

export const BentoCard = ({
  icon: Icon,
  title,
  value,
  subtitle,
  change,
  trend,
  delay = 0,
  size = "normal",
}: BentoCardProps) => {
  const trendColor = trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-foreground/90";
  
  const sizeClass = size === "large" ? "md:col-span-2" : "";

  return (
    <div
      className={`group glass-strong rounded-3xl p-6 hover:scale-[1.02] transition-all duration-500 cursor-pointer animate-scale-in shadow-depth hover:shadow-depth-xl relative overflow-hidden card-3d border border-primary/20 hover:border-primary/40 ${sizeClass}`}
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Subtle glow overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Animated border glow */}
      <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 glow-cyan" />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-6">
          <div className="p-3 rounded-2xl bg-primary/10 backdrop-blur-sm float-3d group-hover:bg-primary/20 transition-colors">
            <Icon className="w-7 h-7 text-primary" />
          </div>
          {change && (
            <div className={`flex items-center gap-1 ${trendColor} bg-background/50 backdrop-blur-sm px-3 py-1 rounded-full border border-primary/20`}>
              {trend === "up" ? (
                <TrendingUp className="w-4 h-4" />
              ) : trend === "down" ? (
                <TrendingDown className="w-4 h-4" />
              ) : null}
              <span className="text-sm font-semibold">{change}</span>
            </div>
          )}
        </div>

        <h3 className="text-sm font-medium mb-3 text-muted-foreground">
          {title}
        </h3>
        <p className="text-4xl font-bold mb-2 text-foreground gradient-text-cyber">
          {value}
        </p>
        {subtitle && (
          <p className="text-sm text-muted-foreground">
            {subtitle}
          </p>
        )}

        {/* Floating particles on hover */}
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 bg-primary rounded-full animate-particle blur-sm"
              style={{
                left: `${Math.random() * 30}px`,
                top: `${Math.random() * 30}px`,
                animationDelay: `${i * 0.15}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
