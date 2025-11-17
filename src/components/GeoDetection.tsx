import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { GeoData } from "@/lib/geo";
import { Globe } from "lucide-react";

interface GeoDetectionProps {
  geoData: GeoData | null;
  onComplete: () => void;
}

export const GeoDetection = ({ geoData, onComplete }: GeoDetectionProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 20);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background"
    >
      <div className="text-center space-y-8 max-w-lg px-8">
        {/* Rotating Globe */}
        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.1, 1]
          }}
          transition={{
            rotate: { duration: 3, repeat: Infinity, ease: "linear" },
            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }}
          className="inline-block"
        >
          <Globe className="w-32 h-32 text-primary" />
        </motion.div>

        {/* Detection Text */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <h2 className="text-3xl font-bold">
            Detecting Your Location
          </h2>
          
          {geoData && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="p-6 rounded-2xl border border-primary/30 bg-card/50 backdrop-blur-sm"
            >
              <p className="text-lg text-muted-foreground mb-2">
                Welcome from
              </p>
              <p className="text-2xl font-bold text-primary">
                {geoData.country}
              </p>
            </motion.div>
          )}

          {/* Progress Bar */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-primary/60"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <p className="text-sm text-muted-foreground">
            Preparing your personalized experience...
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};
