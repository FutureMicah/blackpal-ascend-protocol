import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lightbulb, ChevronRight, Sparkles, TrendingUp } from "lucide-react";
import { calculateProfileCompletion } from "@/lib/profile-utils";

interface ProfileSuggestionsProps {
  profile: any;
  onActionClick?: (action: string) => void;
}

interface Suggestion {
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  action: string;
  xpReward: number;
  icon: React.ReactNode;
}

export function ProfileSuggestions({ profile, onActionClick }: ProfileSuggestionsProps) {
  const completion = calculateProfileCompletion(profile);

  const getSuggestions = (): Suggestion[] => {
    const suggestions: Suggestion[] = [];

    // High priority suggestions
    if (!profile?.avatar_url) {
      suggestions.push({
        priority: "high",
        title: "Add a profile photo",
        description: "Upload a photo to make your profile stand out. Profiles with photos get 3x more views!",
        action: "upload_photo",
        xpReward: 50,
        icon: <Sparkles className="w-4 h-4" />,
      });
    }

    if (!profile?.bio || profile.bio.length < 50) {
      suggestions.push({
        priority: "high",
        title: profile?.bio ? "Expand your bio" : "Write a bio",
        description: profile?.bio 
          ? "Add more details to your bio (aim for 50+ characters) to help others understand who you are."
          : "Tell others about yourself! A compelling bio increases profile engagement by 5x.",
        action: "write_bio",
        xpReward: 30,
        icon: <Sparkles className="w-4 h-4" />,
      });
    }

    if (!profile?.username) {
      suggestions.push({
        priority: "high",
        title: "Choose a unique username",
        description: "Make your profile easier to find with a memorable username.",
        action: "set_username",
        xpReward: 25,
        icon: <Sparkles className="w-4 h-4" />,
      });
    }

    // Medium priority suggestions
    if (!profile?.date_of_birth) {
      suggestions.push({
        priority: "medium",
        title: "Add your date of birth",
        description: "Help us personalize your experience and connect with others your age.",
        action: "add_dob",
        xpReward: 15,
        icon: <TrendingUp className="w-4 h-4" />,
      });
    }

    const socialLinks = [
      { key: 'twitter_handle', name: 'Twitter' },
      { key: 'linkedin_url', name: 'LinkedIn' },
      { key: 'github_handle', name: 'GitHub' },
      { key: 'instagram_handle', name: 'Instagram' },
    ];

    const missingSocialLinks = socialLinks.filter(link => !profile?.[link.key]);
    
    if (missingSocialLinks.length > 2) {
      suggestions.push({
        priority: "medium",
        title: "Connect your social media",
        description: `Add ${missingSocialLinks.length} social links to help others connect with you across platforms.`,
        action: "add_social",
        xpReward: 20,
        icon: <TrendingUp className="w-4 h-4" />,
      });
    }

    // Low priority suggestions
    if (!profile?.website_url) {
      suggestions.push({
        priority: "low",
        title: "Add your website",
        description: "Showcase your personal website, portfolio, or blog.",
        action: "add_website",
        xpReward: 10,
        icon: <Lightbulb className="w-4 h-4" />,
      });
    }

    if (!completion.hasCustomTheme) {
      suggestions.push({
        priority: "low",
        title: "Customize your profile theme",
        description: "Stand out with a unique profile theme. Choose your colors, fonts, and layout!",
        action: "customize_theme",
        xpReward: 50,
        icon: <Lightbulb className="w-4 h-4" />,
      });
    }

    if (!profile?.phone_number) {
      suggestions.push({
        priority: "low",
        title: "Add your phone number",
        description: "Optional but helps with account security and verification.",
        action: "add_phone",
        xpReward: 10,
        icon: <Lightbulb className="w-4 h-4" />,
      });
    }

    return suggestions;
  };

  const suggestions = getSuggestions();

  if (suggestions.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6 text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-3 text-primary" />
          <h3 className="font-bold text-lg mb-2">Perfect Profile! 🎉</h3>
          <p className="text-sm text-muted-foreground">
            Your profile is fully optimized. Keep engaging and earning achievements!
          </p>
        </CardContent>
      </Card>
    );
  }

  const getPriorityColor = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case "high":
        return "from-red-500 to-orange-500";
      case "medium":
        return "from-yellow-500 to-amber-500";
      case "low":
        return "from-blue-500 to-cyan-500";
    }
  };

  const getPriorityLabel = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case "high":
        return "High Impact";
      case "medium":
        return "Medium Impact";
      case "low":
        return "Nice to Have";
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-primary" />
          Profile Improvement Tips
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.slice(0, 5).map((suggestion, index) => (
          <motion.div
            key={suggestion.action}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-border/50 hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {suggestion.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm">{suggestion.title}</h4>
                      <Badge
                        className={`bg-gradient-to-r ${getPriorityColor(suggestion.priority)} text-white border-0 text-xs`}
                      >
                        {getPriorityLabel(suggestion.priority)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {suggestion.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        +{suggestion.xpReward} XP
                      </Badge>
                      {onActionClick && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onActionClick(suggestion.action)}
                          className="h-7 text-xs"
                        >
                          Complete
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {suggestions.length > 5 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            +{suggestions.length - 5} more suggestions available
          </p>
        )}
      </CardContent>
    </Card>
  );
}
