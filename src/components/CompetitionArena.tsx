import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Trophy, Users, Clock, Medal, Flame, Target,
  TrendingUp, DollarSign, Crown, Swords
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface Competition {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  prizePool: number;
  participants: number;
  maxParticipants: number;
  status: "upcoming" | "active" | "ended";
  type: "weekly" | "monthly" | "special";
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar?: string;
  pnlPercent: number;
  trades: number;
}

const mockCompetitions: Competition[] = [
  {
    id: "1",
    name: "Weekly Trading Championship",
    description: "Compete for the highest P&L percentage",
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    prizePool: 10000,
    participants: 234,
    maxParticipants: 500,
    status: "active",
    type: "weekly",
  },
  {
    id: "2",
    name: "Crypto Masters League",
    description: "Monthly showdown for crypto traders",
    startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 33 * 24 * 60 * 60 * 1000),
    prizePool: 50000,
    participants: 89,
    maxParticipants: 1000,
    status: "upcoming",
    type: "monthly",
  },
];

const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, username: "CryptoKing", pnlPercent: 42.5, trades: 156 },
  { rank: 2, username: "TradeMaster", pnlPercent: 38.2, trades: 89 },
  { rank: 3, username: "DiamondHands", pnlPercent: 35.8, trades: 234 },
  { rank: 4, username: "BullRunner", pnlPercent: 32.1, trades: 67 },
  { rank: 5, username: "SwingTrader", pnlPercent: 28.9, trades: 45 },
];

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1: return <Crown className="w-5 h-5 text-yellow-500" />;
    case 2: return <Medal className="w-5 h-5 text-gray-400" />;
    case 3: return <Medal className="w-5 h-5 text-orange-500" />;
    default: return <span className="w-5 text-center font-bold">{rank}</span>;
  }
};

const getTimeRemaining = (endDate: Date) => {
  const diff = endDate.getTime() - Date.now();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  return `${days}d ${hours}h`;
};

export const CompetitionArena = () => {
  const [competitions, setCompetitions] = useState<Competition[]>(mockCompetitions);
  const [activeCompetition, setActiveCompetition] = useState<Competition | null>(mockCompetitions[0]);
  const [leaderboard] = useState<LeaderboardEntry[]>(mockLeaderboard);
  const [joined, setJoined] = useState(false);
  const { toast } = useToast();

  const joinCompetition = (competition: Competition) => {
    setJoined(true);
    toast({
      title: "Joined competition! 🎉",
      description: `You're now competing in ${competition.name}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Swords className="w-8 h-8 text-primary" />
          <h2 className="text-3xl font-bold">Competition Arena</h2>
        </div>
        <p className="text-muted-foreground">Compete with traders worldwide</p>
      </div>

      {/* Active Competition */}
      {activeCompetition && (
        <Card className="bg-gradient-to-br from-primary/20 via-card to-card border-primary/30 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <Badge className="mb-2" variant={activeCompetition.status === "active" ? "default" : "secondary"}>
                  {activeCompetition.status.toUpperCase()}
                </Badge>
                <h3 className="text-2xl font-bold">{activeCompetition.name}</h3>
                <p className="text-muted-foreground">{activeCompetition.description}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-primary">${activeCompetition.prizePool.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Prize Pool</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <Clock className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="font-bold">{getTimeRemaining(activeCompetition.endDate)}</p>
                <p className="text-xs text-muted-foreground">Remaining</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="font-bold">{activeCompetition.participants}</p>
                <p className="text-xs text-muted-foreground">Participants</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <Trophy className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="font-bold">Top 10</p>
                <p className="text-xs text-muted-foreground">Win Prizes</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Participants</span>
                <span>{activeCompetition.participants}/{activeCompetition.maxParticipants}</span>
              </div>
              <Progress 
                value={(activeCompetition.participants / activeCompetition.maxParticipants) * 100} 
                className="h-2"
              />
            </div>

            {!joined ? (
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => joinCompetition(activeCompetition)}
              >
                <Flame className="w-5 h-5 mr-2" />
                Join Competition
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button className="flex-1" variant="outline">
                  View My Stats
                </Button>
                <Button className="flex-1">
                  Start Trading
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      <Card className="border-border bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Live Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {leaderboard.map((entry, i) => (
            <motion.div
              key={entry.rank}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`flex items-center gap-4 p-3 rounded-lg ${
                entry.rank <= 3 
                  ? 'bg-gradient-to-r from-primary/10 to-transparent' 
                  : 'bg-muted/50'
              }`}
            >
              <div className="w-8 flex justify-center">
                {getRankIcon(entry.rank)}
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold">
                {entry.username[0]}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{entry.username}</p>
                <p className="text-xs text-muted-foreground">{entry.trades} trades</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-500">+{entry.pnlPercent}%</p>
                <p className="text-xs text-muted-foreground">P&L</p>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* Other Competitions */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Upcoming Competitions</h3>
        {competitions.filter(c => c.status === "upcoming").map((comp) => (
          <Card key={comp.id} className="border-border bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">{comp.type}</Badge>
                    <span className="font-semibold">{comp.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Starts in {Math.ceil((comp.startDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))} days
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">${comp.prizePool.toLocaleString()}</p>
                  <Button size="sm" variant="outline" className="mt-1">
                    Notify Me
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Prize Distribution */}
      <Card className="border-border bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            Prize Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { place: "1st", percent: 40, color: "text-yellow-500" },
              { place: "2nd", percent: 25, color: "text-gray-400" },
              { place: "3rd", percent: 15, color: "text-orange-500" },
              { place: "4th-5th", percent: 10, color: "text-muted-foreground" },
              { place: "6th-10th", percent: 10, color: "text-muted-foreground" },
            ].map((tier) => (
              <div key={tier.place} className="flex items-center gap-3">
                <span className={`w-16 font-semibold ${tier.color}`}>{tier.place}</span>
                <Progress value={tier.percent} className="flex-1 h-3" />
                <span className="w-12 text-right font-medium">{tier.percent}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
