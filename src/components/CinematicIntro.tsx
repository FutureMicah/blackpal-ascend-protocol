import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

interface CinematicIntroProps {
  onComplete: () => void;
}

export const CinematicIntro = ({ onComplete }: CinematicIntroProps) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 500),
      setTimeout(() => setStage(2), 2000),
      setTimeout(() => setStage(3), 4000),
      setTimeout(() => setStage(4), 6000),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-background">
      {/* Particle background */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary rounded-full animate-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Liquidity flow streaks */}
      <div className="absolute inset-0 opacity-30">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="absolute h-px bg-gradient-to-r from-transparent via-primary to-transparent"
            style={{
              width: `${200 + Math.random() * 400}px`,
              top: `${Math.random() * 100}%`,
              left: `-${200 + Math.random() * 200}px`,
              animation: `slide-right ${2 + Math.random() * 2}s ease-out`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Logo reveal */}
      <div
        className={`relative z-10 text-center px-4 transition-all duration-1000 ${
          stage >= 1 ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        <div className="relative inline-block">
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-bold mb-4 gradient-text-cyber animate-glow-pulse">
            BlackPAL
          </h1>
          <div className="absolute -inset-4 bg-primary/20 blur-3xl -z-10 animate-pulse" />
          <Sparkles className="absolute -top-6 -right-6 sm:-top-8 sm:-right-8 w-8 h-8 sm:w-12 sm:h-12 text-gold animate-spin" style={{ animationDuration: '3s' }} />
        </div>

        {/* Tagline */}
        <div
          className={`mt-8 max-w-md mx-auto transition-all duration-1000 delay-500 ${
            stage >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <p className="text-lg sm:text-xl md:text-2xl font-light text-foreground/80 mb-2">
            Your portfolio. Your strategy. Your ascent.
          </p>
          <p className="text-base sm:text-lg text-muted-foreground">
            Master the market. Command your legacy.
          </p>
        </div>

        {/* Emotional hook */}
        <div
          className={`mt-12 transition-all duration-1000 delay-1000 ${
            stage >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <p className="text-xl gradient-text-wealth font-medium">
            Capital moves. Vision defines. Every decision compounds your wealth.
          </p>
        </div>

        {/* CTA */}
        <div
          className={`mt-12 sm:mt-16 max-w-sm mx-auto transition-all duration-1000 delay-1500 ${
            stage >= 4 ? "opacity-100 scale-100" : "opacity-0 scale-95"
          }`}
        >
          <button
            onClick={onComplete}
            className="group relative w-full px-6 sm:px-12 py-3 sm:py-4 text-base sm:text-lg font-semibold bg-primary text-primary-foreground rounded-full overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl glow-cyan"
          >
            <span className="relative z-10">Enter BlackPAL. Elevate your capital.</span>
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-primary animate-gradient-x opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-0 animate-pulse">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-white rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animation: `particle-float ${2 + Math.random()}s ease-in-out infinite`,
                    animationDelay: `${Math.random() * 2}s`,
                  }}
                />
              ))}
            </div>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-right {
          to {
            transform: translateX(200vw);
          }
        }
        @keyframes gradient-x {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
      `}</style>
    </div>
  );
};
