import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FloatingNav } from "@/components/FloatingNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Megaphone, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Ad {
  id: string;
  title: string;
  body: string | null;
  cta_label: string | null;
  cta_url: string | null;
  image_url: string | null;
}

const BlackPass = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState<Ad[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }
      const { data } = await supabase
        .from("academy_ads")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      setAds((data as Ad[]) || []);
      setLoading(false);
    })();
  }, [navigate]);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <FloatingNav />
      <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-16 pb-20">
        <header className="mb-5">
          <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
            <Megaphone className="w-5 h-5" /> Academy Tools
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Other tools and services from the academy. Updated by the admin.
          </p>
        </header>

        {ads.length === 0 ? (
          <Card className="p-8 text-center">
            <Megaphone className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <h2 className="text-sm font-bold">No announcements yet</h2>
            <p className="text-xs text-muted-foreground mt-1">
              The admin hasn't posted any tool ads yet.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ads.map((ad) => (
              <Card key={ad.id} className="p-4 space-y-2">
                {ad.image_url && (
                  <img src={ad.image_url} alt={ad.title} className="w-full h-32 object-cover rounded-lg" />
                )}
                <h3 className="text-sm font-bold">{ad.title}</h3>
                {ad.body && <p className="text-xs text-muted-foreground">{ad.body}</p>}
                {ad.cta_url && (
                  <Button asChild size="sm" className="w-full h-8 text-xs gap-1.5">
                    <a href={ad.cta_url} target="_blank" rel="noopener noreferrer">
                      {ad.cta_label || "Learn more"} <ExternalLink className="w-3 h-3" />
                    </a>
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlackPass;
