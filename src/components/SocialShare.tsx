import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Share2, Twitter, Facebook, Link as LinkIcon, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useRef } from "react";
import html2canvas from "html2canvas";

interface SocialShareProps {
  achievement: {
    name: string;
    icon: string;
    rarity: string;
    description: string;
  };
  userName: string;
}

export const SocialShare = ({ achievement, userName }: SocialShareProps) => {
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);

  const generateShareText = () => {
    return `🎉 Just unlocked "${achievement.name}" on BlackPAL Ascend Protocol! ${achievement.icon}\n\n#BlackPAL #Achievement #Gaming`;
  };

  const shareToTwitter = () => {
    const text = generateShareText();
    const url = window.location.origin;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      "_blank"
    );
  };

  const shareToFacebook = () => {
    const url = window.location.origin;
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(
        generateShareText()
      )}`,
      "_blank"
    );
  };

  const copyLink = () => {
    const url = `${window.location.origin}/achievements`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied!",
      description: "Achievement link copied to clipboard",
    });
  };

  const downloadCard = async () => {
    if (!cardRef.current) return;

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "transparent",
        scale: 2,
      });

      const link = document.createElement("a");
      link.download = `${achievement.name.replace(/\s+/g, "-")}-achievement.png`;
      link.href = canvas.toDataURL();
      link.click();

      toast({
        title: "Card Downloaded!",
        description: "Share your achievement anywhere!",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Could not generate image",
        variant: "destructive",
      });
    }
  };

  const getRarityGradient = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case "common":
        return "from-slate-500 to-slate-700";
      case "rare":
        return "from-blue-500 to-blue-700";
      case "epic":
        return "from-purple-500 to-purple-700";
      case "legendary":
        return "from-amber-500 to-amber-700";
      default:
        return "from-primary to-primary";
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Your Achievement</DialogTitle>
          <DialogDescription>Let everyone know about your accomplishment!</DialogDescription>
        </DialogHeader>

        {/* Achievement Card Preview */}
        <div ref={cardRef} className="my-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`relative p-6 rounded-xl bg-gradient-to-br ${getRarityGradient(
              achievement.rarity
            )} overflow-hidden`}
          >
            {/* Decorative elements */}
            <div className="absolute inset-0 bg-grid-white/[0.1] bg-[size:20px_20px]" />
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl" />

            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-white/90 uppercase tracking-wide">
                  {achievement.rarity} Achievement
                </span>
                <span className="text-xs text-white/70">BlackPAL Ascend</span>
              </div>

              {/* Icon and Name */}
              <div className="text-center mb-4">
                <div className="text-6xl mb-3">{achievement.icon}</div>
                <h3 className="text-2xl font-bold text-white mb-2">{achievement.name}</h3>
                <p className="text-sm text-white/80">{achievement.description}</p>
              </div>

              {/* User */}
              <div className="flex items-center justify-center gap-2 pt-4 border-t border-white/20">
                <span className="text-sm text-white/70">Unlocked by</span>
                <span className="text-sm font-semibold text-white">{userName}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Share Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={shareToTwitter} variant="outline" className="w-full">
            <Twitter className="h-4 w-4 mr-2" />
            Twitter
          </Button>
          <Button onClick={shareToFacebook} variant="outline" className="w-full">
            <Facebook className="h-4 w-4 mr-2" />
            Facebook
          </Button>
          <Button onClick={copyLink} variant="outline" className="w-full">
            <LinkIcon className="h-4 w-4 mr-2" />
            Copy Link
          </Button>
          <Button onClick={downloadCard} variant="outline" className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
