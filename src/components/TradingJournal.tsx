import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, Plus, Calendar, TrendingUp, TrendingDown,
  Brain, Target, Clock, Image, Trash2, Edit, Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface JournalEntry {
  id: string;
  date: Date;
  symbol: string;
  type: "LONG" | "SHORT";
  entry: number;
  exit: number;
  pnl: number;
  setup: string;
  emotions: string;
  mistakes?: string;
  lessons?: string;
  screenshot?: string;
}

const mockEntries: JournalEntry[] = [
  {
    id: "1",
    date: new Date(),
    symbol: "BTC/USD",
    type: "LONG",
    entry: 43500,
    exit: 44200,
    pnl: 700,
    setup: "Breakout from ascending triangle on 4H",
    emotions: "Confident, followed my plan",
    lessons: "Patience pays off - waited for confirmation",
  },
  {
    id: "2",
    date: new Date(Date.now() - 86400000),
    symbol: "ETH/USD",
    type: "SHORT",
    entry: 2250,
    exit: 2300,
    pnl: -150,
    setup: "Rejection at resistance",
    emotions: "FOMO - entered too early",
    mistakes: "Didn't wait for confirmation candle",
    lessons: "Always wait for the setup to complete",
  },
];

export const TradingJournal = () => {
  const [entries, setEntries] = useState<JournalEntry[]>(mockEntries);
  const [showCreate, setShowCreate] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string>("");
  const { toast } = useToast();

  const [newEntry, setNewEntry] = useState({
    symbol: "",
    type: "LONG" as "LONG" | "SHORT",
    entry: "",
    exit: "",
    setup: "",
    emotions: "",
    mistakes: "",
    lessons: "",
  });

  const handleCreate = () => {
    const entry: JournalEntry = {
      id: Date.now().toString(),
      date: new Date(),
      symbol: newEntry.symbol,
      type: newEntry.type,
      entry: parseFloat(newEntry.entry),
      exit: parseFloat(newEntry.exit),
      pnl: newEntry.type === "LONG" 
        ? parseFloat(newEntry.exit) - parseFloat(newEntry.entry)
        : parseFloat(newEntry.entry) - parseFloat(newEntry.exit),
      setup: newEntry.setup,
      emotions: newEntry.emotions,
      mistakes: newEntry.mistakes,
      lessons: newEntry.lessons,
    };

    setEntries([entry, ...entries]);
    setShowCreate(false);
    setNewEntry({ symbol: "", type: "LONG", entry: "", exit: "", setup: "", emotions: "", mistakes: "", lessons: "" });
    toast({ title: "Entry added!", description: "Your trade has been journaled." });
  };

  const analyzeWithAI = async () => {
    setAnalyzing(true);
    try {
      const response = await supabase.functions.invoke("ai-trading-assistant", {
        body: {
          type: "journal_analysis",
          messages: [
            {
              role: "user",
              content: `Analyze my recent trading journal entries and provide insights:\n\n${entries.slice(0, 5).map(e => 
                `Symbol: ${e.symbol}, Type: ${e.type}, P&L: ${e.pnl}, Setup: ${e.setup}, Emotions: ${e.emotions}, Mistakes: ${e.mistakes || 'None'}`
              ).join('\n')}`
            }
          ]
        }
      });

      if (response.error) throw response.error;

      // Handle streaming response
      const reader = response.data?.getReader?.();
      if (reader) {
        let result = "";
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
          for (const line of lines) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) result += content;
            } catch {}
          }
        }
        setAnalysis(result);
      }
    } catch (error) {
      toast({ title: "Analysis failed", description: "Please try again later.", variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const totalPnL = entries.reduce((sum, e) => sum + e.pnl, 0);
  const winRate = entries.length > 0 
    ? Math.round((entries.filter(e => e.pnl > 0).length / entries.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{entries.length}</p>
            <p className="text-xs text-muted-foreground">Total Trades</p>
          </CardContent>
        </Card>
        <Card className={`border-border ${totalPnL >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
          <CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">Total P&L</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{winRate}%</p>
            <p className="text-xs text-muted-foreground">Win Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="flex-1">
              <Plus className="w-4 h-4 mr-2" />
              New Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Journal Trade</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Symbol</label>
                  <Input 
                    placeholder="BTC/USD" 
                    value={newEntry.symbol}
                    onChange={(e) => setNewEntry({ ...newEntry, symbol: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Select 
                    value={newEntry.type} 
                    onValueChange={(v) => setNewEntry({ ...newEntry, type: v as "LONG" | "SHORT" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LONG">LONG</SelectItem>
                      <SelectItem value="SHORT">SHORT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Entry Price</label>
                  <Input 
                    type="number" 
                    placeholder="0.00"
                    value={newEntry.entry}
                    onChange={(e) => setNewEntry({ ...newEntry, entry: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Exit Price</label>
                  <Input 
                    type="number" 
                    placeholder="0.00"
                    value={newEntry.exit}
                    onChange={(e) => setNewEntry({ ...newEntry, exit: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Setup / Strategy</label>
                <Textarea 
                  placeholder="Describe your trade setup..."
                  value={newEntry.setup}
                  onChange={(e) => setNewEntry({ ...newEntry, setup: e.target.value })}
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Emotions</label>
                <Textarea 
                  placeholder="How did you feel during this trade?"
                  value={newEntry.emotions}
                  onChange={(e) => setNewEntry({ ...newEntry, emotions: e.target.value })}
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Mistakes (if any)</label>
                <Textarea 
                  placeholder="What could you have done better?"
                  value={newEntry.mistakes}
                  onChange={(e) => setNewEntry({ ...newEntry, mistakes: e.target.value })}
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Lessons Learned</label>
                <Textarea 
                  placeholder="Key takeaways from this trade..."
                  value={newEntry.lessons}
                  onChange={(e) => setNewEntry({ ...newEntry, lessons: e.target.value })}
                  rows={2}
                />
              </div>
              <Button className="w-full" onClick={handleCreate}>
                Save Entry
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        <Button variant="outline" onClick={analyzeWithAI} disabled={analyzing}>
          <Brain className="w-4 h-4 mr-2" />
          {analyzing ? "Analyzing..." : "AI Analysis"}
        </Button>
      </div>

      {/* AI Analysis */}
      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  AI Trading Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{analysis}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Journal Entries */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Recent Entries
        </h3>
        
        {entries.map((entry, i) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border-border bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${entry.pnl >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      {entry.pnl >= 0 ? (
                        <TrendingUp className="w-5 h-5 text-green-500" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{entry.symbol}</span>
                        <Badge className={entry.type === "LONG" ? "bg-green-500" : "bg-red-500"}>
                          {entry.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {entry.date.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <p className={`text-xl font-bold ${entry.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {entry.pnl >= 0 ? '+' : ''}{entry.pnl.toFixed(2)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Entry:</span>
                    <span className="ml-2 font-medium">${entry.entry}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Exit:</span>
                    <span className="ml-2 font-medium">${entry.exit}</span>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Setup</p>
                    <p>{entry.setup}</p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Emotions</p>
                    <p>{entry.emotions}</p>
                  </div>
                  {entry.mistakes && (
                    <div className="p-2 rounded bg-red-500/10">
                      <p className="text-xs text-red-500 mb-1">Mistakes</p>
                      <p>{entry.mistakes}</p>
                    </div>
                  )}
                  {entry.lessons && (
                    <div className="p-2 rounded bg-green-500/10">
                      <p className="text-xs text-green-500 mb-1">Lessons</p>
                      <p>{entry.lessons}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
