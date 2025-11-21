import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface WelcomeSceneProps {
  name: string;
  onEnter: () => void;
}

export const WelcomeScene = ({ name, onEnter }: WelcomeSceneProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="text-center space-y-12 px-4"
      >
        {/* Logo split reveal */}
        <div className="relative h-48 flex items-center justify-center">
          <motion.div
            initial={{ x: 0 }}
            animate={{ x: -60 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="absolute"
          >
            <img
              src="/blackpal-logo.png"
              alt="BlackPAL"
              className="w-24 h-24 object-contain"
              style={{
                filter: "drop-shadow(0 0 20px hsl(var(--primary)))",
                clipPath: "inset(0 50% 0 0)"
              }}
            />
          </motion.div>
          
          <motion.div
            initial={{ x: 0 }}
            animate={{ x: 60 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="absolute"
          >
            <img
              src="/blackpal-logo.png"
              alt="BlackPAL"
              className="w-24 h-24 object-contain"
              style={{
                filter: "drop-shadow(0 0 20px hsl(var(--secondary)))",
                clipPath: "inset(0 0 0 50%)"
              }}
            />
          </motion.div>

          {/* Center reveal - user identity */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.2, ease: "backOut" }}
            className="relative z-10"
          >
            <div 
              className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border-2 border-primary/50"
              style={{ boxShadow: "var(--shadow-voltage)" }}
            >
              <span className="text-4xl font-bold text-foreground">
                {name.charAt(0).toUpperCase()}
              </span>
            </div>
          </motion.div>
        </div>

        {/* Welcome text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.6 }}
          className="space-y-4"
        >
          <h1 className="text-4xl md:text-5xl font-semibold">
            Welcome, <span className="text-primary">{name}</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            You've entered BlackPAL Ascend.
          </p>
          <p className="text-lg text-muted-foreground font-light tracking-wide">
            Explore. Connect. Master. Evolve.
          </p>
        </motion.div>

        {/* Enter button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 2.2 }}
        >
          <Button
            onClick={onEnter}
            size="lg"
            className="voltage-button px-12 py-6 text-lg"
          >
            Enter Dashboard
          </Button>
        </motion.div>

        {/* Ambient particles around */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [0, 1, 0],
              opacity: [0, 0.6, 0],
              x: [0, (Math.cos(i * Math.PI / 4) * 200)],
              y: [0, (Math.sin(i * Math.PI / 4) * 200)]
            }}
            transition={{ 
              duration: 2,
              delay: 1.2 + (i * 0.1),
              ease: "easeOut"
            }}
            className="absolute w-2 h-2 rounded-full bg-primary"
            style={{
              left: "50%",
              top: "30%",
              boxShadow: "0 0 10px hsl(var(--primary))"
            }}
          />
        ))}
      </motion.div>
    </div>
  );
};
