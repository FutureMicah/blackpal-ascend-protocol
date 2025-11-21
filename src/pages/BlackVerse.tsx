import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, MessageSquare, TrendingUp, Award, Zap, Globe, Send, Heart, Share2, Crown } from "lucide-react";
import { FloatingNav } from "@/components/FloatingNav";

const BlackVerse = () => {
  const [newPost, setNewPost] = useState("");

  const topTraders = [
    { name: "Shadow Trader", rank: 1, roi: "+847%", avatar: "ST", tier: "Diamond" },
    { name: "Quantum Fox", rank: 2, roi: "+692%", avatar: "QF", tier: "Platinum" },
    { name: "Dark Knight", rank: 3, roi: "+581%", avatar: "DK", tier: "Platinum" },
  ];

  const communityPosts = [
    { author: "Shadow Trader", time: "2h ago", content: "Just closed a perfect 10:1 RR trade on EUR/USD. Patience pays.", likes: 234, comments: 45 },
    { author: "Quantum Fox", time: "5h ago", content: "Market volatility increasing. Perfect conditions for our strategy.", likes: 189, comments: 32 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 -z-10">
        {[...Array(30)].map((_, i) => (
          <div
            key={`particle-${i}`}
            className="absolute w-1 h-1 bg-primary rounded-full animate-particle blur-sm"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${8 + Math.random() * 8}s`,
              opacity: 0.2 + Math.random() * 0.3,
            }}
          />
        ))}
      </div>

      <FloatingNav />

      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Header Section */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Globe className="w-10 h-10 text-primary animate-pulse" />
            <h1 className="text-5xl font-bold gradient-text-cyber">BlackVerse</h1>
            <Crown className="w-8 h-8 text-gold animate-float" />
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Connect with elite traders, share insights, and grow together in the most prestigious trading community
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Create Post Card */}
            <Card className="glass-strong p-6 border-primary/20 animate-slide-up">
              <div className="flex items-start gap-4">
                <Avatar className="w-12 h-12 ring-2 ring-primary/50">
                  <AvatarFallback className="bg-gradient-cyber text-white">You</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Input
                    placeholder="Share your trading insight or strategy..."
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    className="mb-3 h-20 bg-background/50 border-primary/30 resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-primary">
                              <TrendingUp className="w-4 h-4 mr-2" />
                              Chart
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Attach trading chart</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Button className="bg-gradient-cyber hover:opacity-90 glow-cyan">
                      <Send className="w-4 h-4 mr-2" />
                      Post
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Community Posts */}
            {communityPosts.map((post, idx) => (
              <Card key={idx} className="glass-strong p-6 border-primary/20 animate-slide-up hover:border-primary/40 transition-all" style={{ animationDelay: `${0.1 * (idx + 1)}s` }}>
                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12 ring-2 ring-primary/50">
                    <AvatarFallback className="bg-gradient-cyber text-white">
                      {post.author.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-foreground">{post.author}</h3>
                      <Badge className="bg-primary/20 text-primary border-primary/30">Elite</Badge>
                      <span className="text-sm text-muted-foreground">{post.time}</span>
                    </div>
                    <p className="text-foreground/90 mb-4">{post.content}</p>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <button className="flex items-center gap-2 hover:text-primary transition-colors">
                        <Heart className="w-4 h-4" />
                        {post.likes}
                      </button>
                      <button className="flex items-center gap-2 hover:text-primary transition-colors">
                        <MessageSquare className="w-4 h-4" />
                        {post.comments}
                      </button>
                      <button className="flex items-center gap-2 hover:text-primary transition-colors">
                        <Share2 className="w-4 h-4" />
                        Share
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-6">
            {/* Top Traders Leaderboard */}
            <Card className="glass-strong p-6 border-primary/20 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center gap-2 mb-6">
                <Award className="w-5 h-5 text-gold" />
                <h2 className="text-xl font-bold gradient-text-cyber">Top Traders</h2>
              </div>
              <div className="space-y-4">
                {topTraders.map((trader, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-background/30 hover:bg-background/50 transition-all cursor-pointer group">
                    <div className="relative">
                      <Avatar className="w-10 h-10 ring-2 ring-gold/50">
                        <AvatarFallback className="bg-gradient-to-br from-gold to-primary text-white font-bold">
                          {trader.avatar}
                        </AvatarFallback>
                      </Avatar>
                      {idx === 0 && <Crown className="w-4 h-4 text-gold absolute -top-1 -right-1" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">#{trader.rank}</span>
                        <span className="text-foreground font-medium">{trader.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs border-gold/30 text-gold">
                          {trader.tier}
                        </Badge>
                        <span className="text-xs text-green-500 font-bold">{trader.roi}</span>
                      </div>
                    </div>
                    <Zap className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            </Card>

            {/* Community Stats */}
            <Card className="glass-strong p-6 border-primary/20 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <h2 className="text-xl font-bold gradient-text-cyber mb-6">Community Pulse</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-background/30">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <span className="text-sm text-muted-foreground">Active Traders</span>
                  </div>
                  <span className="font-bold text-foreground">2,847</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-background/30">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    <span className="text-sm text-muted-foreground">Daily Posts</span>
                  </div>
                  <span className="font-bold text-foreground">1,293</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-background/30">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-muted-foreground">Avg Win Rate</span>
                  </div>
                  <span className="font-bold text-green-500">73.4%</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlackVerse;
