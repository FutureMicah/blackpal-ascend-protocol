import { useEffect, useState } from "react";
import { FloatingNav } from "@/components/FloatingNav";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Trophy, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Contest {
  id: string;
  title: string;
  description: string | null;
  prize_btax: number;
  starts_at: string | null;
  ends_at: string | null;
  rules: string | null;
  cover_url: string | null;
}

export default function Contest() {
  const [loading, setLoading] = useState(true);
  const [contests, setContests] = useState<Contest[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("contests")
        .select("*")
        .eq("is_active", true)
        .order("starts_at", { ascending: false });
      setContests((data as Contest[]) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <FloatingNav />
      <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-16 pb-20">
        <header className="mb-5">
          <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5" /> Contests
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Live contests posted by the academy. Win BTAX rewards.
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : contests.length === 0 ? (
          <Card className="p-8 text-center">
            <Trophy className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <h2 className="text-sm font-bold">No active contests yet</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Check back soon — the academy will post the next contest here.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {contests.map((c) => (
              <Card key={c.id} className="p-4 space-y-2">
                {c.cover_url && (
                  <img src={c.cover_url} alt={c.title} className="w-full h-32 object-cover rounded-lg" />
                )}
                <h3 className="text-sm font-bold">{c.title}</h3>
                {c.description && (
                  <p className="text-xs text-muted-foreground">{c.description}</p>
                )}
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-primary font-semibold">
                    Prize: {Number(c.prize_btax).toLocaleString()} BTAX
                  </span>
                  {c.ends_at && (
                    <span className="text-muted-foreground">
                      Ends {format(new Date(c.ends_at), "MMM d")}
                    </span>
                  )}
                </div>
                {c.rules && (
                  <details className="text-[10px]">
                    <summary className="cursor-pointer text-primary">Rules</summary>
                    <p className="mt-1 text-muted-foreground whitespace-pre-wrap">{c.rules}</p>
                  </details>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
