import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Share2, Download, Twitter, Linkedin, Facebook, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AchievementShareProps {
  achievement: {
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: string;
  };
  userStats: {
    displayName: string;
    xpPoints: number;
    achievementCount: number;
  };
}

export const AchievementShare = ({ achievement, userStats }: AchievementShareProps) => {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const generateShareImage = async () => {
    setGenerating(true);
    try {
      const prompt = `Create a beautiful achievement card graphic with the following details:
Achievement: ${achievement.icon} ${achievement.name}
Description: ${achievement.description}
Rarity: ${achievement.rarity}
Player: ${userStats.displayName}
Stats: ${userStats.xpPoints} XP | ${userStats.achievementCount} Achievements
Style: Modern, gaming aesthetic with vibrant colors, sharp typography, and a professional look. Include decorative elements that match the ${achievement.rarity} rarity level.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          modalities: ["image", "text"]
        })
      });

      const data = await response.json();
      const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      
      if (generatedImageUrl) {
        setImageUrl(generatedImageUrl);
        toast({
          title: "Image Generated!",
          description: "Your achievement card is ready to share.",
        });
      } else {
        throw new Error("Failed to generate image");
      }
    } catch (error) {
      console.error("Error generating image:", error);
      toast({
        title: "Error",
        description: "Failed to generate share image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!imageUrl) return;
    
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${achievement.name.replace(/\s+/g, '-')}-achievement.png`;
    link.click();
  };

  const shareToTwitter = () => {
    const text = `Just unlocked the ${achievement.icon} ${achievement.name} achievement! 🎉\n\n${achievement.description}\n\n#Achievement #Gaming`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareToLinkedIn = () => {
    const url = window.location.href;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
  };

  const shareToFacebook = () => {
    const url = window.location.href;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  };

  const handleOpen = () => {
    setOpen(true);
    if (!imageUrl) {
      generateShareImage();
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="flex items-center gap-2"
      >
        <Share2 className="h-4 w-4" />
        Share
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Share Achievement
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Generated Image Preview */}
            <div className="relative aspect-video bg-card rounded-lg border overflow-hidden">
              <AnimatePresence mode="wait">
                {generating ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="text-center space-y-4">
                      <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                      <p className="text-sm text-muted-foreground">Generating your achievement card...</p>
                    </div>
                  </motion.div>
                ) : imageUrl ? (
                  <motion.img
                    key="image"
                    src={imageUrl}
                    alt="Achievement card"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-muted"
                  >
                    <p className="text-muted-foreground">Click generate to create your card</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {!imageUrl && !generating && (
                <Button
                  onClick={generateShareImage}
                  className="w-full"
                  size="lg"
                >
                  Generate Share Image
                </Button>
              )}

              {imageUrl && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={downloadImage}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button
                      onClick={generateShareImage}
                      variant="outline"
                      disabled={generating}
                    >
                      Regenerate
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Share to:</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        onClick={shareToTwitter}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Twitter className="h-4 w-4" />
                        Twitter
                      </Button>
                      <Button
                        onClick={shareToLinkedIn}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Linkedin className="h-4 w-4" />
                        LinkedIn
                      </Button>
                      <Button
                        onClick={shareToFacebook}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Facebook className="h-4 w-4" />
                        Facebook
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
