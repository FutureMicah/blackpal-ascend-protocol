import { useEffect, useState } from "react";

interface AchievementCinematicProps {
  title: string;
  description: string;
  xpEarned?: number;
  coinsEarned?: number;
  onComplete?: () => void;
}

export const AchievementCinematic = ({
  title,
  description,
  xpEarned,
  coinsEarned,
  onComplete,
}: AchievementCinematicProps) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 300),
      setTimeout(() => setStage(2), 800),
      setTimeout(() => setStage(3), 1500),
      setTimeout(() => {
        setStage(4);
        if (onComplete) {
          setTimeout(onComplete, 1000);
        }
      }, 3000),
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-lg flex items-center justify-center z-50 overflow-hidden">
      {/* Particle burst effect */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-2 h-2 rounded-full transition-all duration-1000 ${
              stage >= 1 ? "opacity-0 scale-0" : "opacity-100 scale-100"
            }`}
            style={{
              left: "50%",
              top: "50%",
              background: `hsl(${Math.random() * 360}, 100%, 60%)`,
              transform: `translate(${Math.cos((i / 50) * Math.PI * 2) * (stage * 200)}px, ${
                Math.sin((i / 50) * Math.PI * 2) * (stage * 200)
              }px)`,
              boxShadow: `0 0 10px hsl(${Math.random() * 360}, 100%, 60%)`,
            }}
          />
        ))}
      </div>

      {/* Central coin animation */}
      <div className="relative z-10 text-center space-y-6">
        <div
          className={`transition-all duration-1000 ${
            stage >= 1
              ? "opacity-100 scale-100 rotate-0"
              : "opacity-0 scale-0 rotate-180"
          }`}
        >
          <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-gold via-orange to-gold animate-glow-pulse shadow-depth-xl glow-gold relative">
            <div className="absolute inset-0 flex items-center justify-center text-6xl">
              🎯
            </div>
            {/* Orbiting particles */}
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-3 h-3 bg-primary rounded-full"
                style={{
                  left: "50%",
                  top: "50%",
                  animation: `orbit 2s linear infinite`,
                  animationDelay: `${i * 0.25}s`,
                  transformOrigin: "0 0",
                }}
              />
            ))}
          </div>
        </div>

        {/* Achievement title */}
        <div
          className={`transition-all duration-700 delay-300 ${
            stage >= 2
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
          }`}
        >
          <h1 className="text-5xl font-bold gradient-text-wealth mb-3">
            {title}
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            {description}
          </p>
        </div>

        {/* Rewards */}
        {(xpEarned || coinsEarned) && (
          <div
            className={`flex gap-6 justify-center transition-all duration-700 delay-500 ${
              stage >= 3
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
          >
            {xpEarned && (
              <div className="glass-strong px-8 py-4 rounded-2xl space-y-1">
                <p className="text-sm text-muted-foreground">XP Earned</p>
                <p className="text-3xl font-bold gradient-text-cyber">
                  +{xpEarned}
                </p>
              </div>
            )}
            {coinsEarned && (
              <div className="glass-strong px-8 py-4 rounded-2xl space-y-1">
                <p className="text-sm text-muted-foreground">Coins Earned</p>
                <p className="text-3xl font-bold gradient-text-wealth">
                  +{coinsEarned}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Light sweep effect */}
        <div
          className={`absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent transition-all duration-1000 ${
            stage >= 2 ? "translate-x-full" : "-translate-x-full"
          }`}
          style={{
            width: "200%",
          }}
        />
      </div>

      <style>{`
        @keyframes orbit {
          from {
            transform: translate(-50%, -50%) rotate(0deg) translateX(80px);
          }
          to {
            transform: translate(-50%, -50%) rotate(360deg) translateX(80px);
          }
        }
      `}</style>
    </div>
  );
};
