import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, TrendingUp, Users, Globe, Clock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface AnalyticsDashboardProps {
  userId: string;
  onClose: () => void;
}

interface AnalyticsSummary {
  total_views: number;
  unique_visitors: number;
  countries_count: number;
  views_last_7_days: number;
  views_last_30_days: number;
  last_viewed_at: string | null;
}

interface CountryView {
  viewer_country: string;
  count: number;
}

export const ProfileAnalyticsDashboard = ({ userId, onClose }: AnalyticsDashboardProps) => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [topCountries, setTopCountries] = useState<CountryView[]>([]);
  const [recentViews, setRecentViews] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [userId]);

  const loadAnalytics = async () => {
    try {
      // Load summary
      const { data: summaryData, error: summaryError } = await supabase
        .from("profile_analytics_summary")
        .select("*")
        .eq("profile_id", userId)
        .single();

      if (summaryError && summaryError.code !== "PGRST116") {
        throw summaryError;
      }

      setSummary(summaryData || {
        total_views: 0,
        unique_visitors: 0,
        countries_count: 0,
        views_last_7_days: 0,
        views_last_30_days: 0,
        last_viewed_at: null,
      });

      // Load top countries
      const { data: countriesData, error: countriesError } = await supabase
        .from("profile_views")
        .select("viewer_country")
        .eq("profile_id", userId)
        .not("viewer_country", "is", null);

      if (countriesError) throw countriesError;

      // Count countries
      const countryCounts = (countriesData || []).reduce((acc: any, view: any) => {
        const country = view.viewer_country;
        acc[country] = (acc[country] || 0) + 1;
        return acc;
      }, {});

      const sortedCountries = Object.entries(countryCounts)
        .map(([country, count]) => ({ viewer_country: country, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setTopCountries(sortedCountries);

      // Load recent views
      const { data: recentData, error: recentError } = await supabase
        .from("profile_views")
        .select("*")
        .eq("profile_id", userId)
        .order("viewed_at", { ascending: false })
        .limit(10);

      if (recentError) throw recentError;

      setRecentViews(recentData || []);
    } catch (error) {
      console.error("Error loading analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/95 backdrop-blur-lg"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl border border-primary/30 bg-card/90 backdrop-blur-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-bold">Profile Analytics</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Eye className="w-4 h-4 text-primary" />
                      Total Views
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary">
                      {summary?.total_views || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="w-4 h-4 text-accent" />
                      Unique Visitors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-accent">
                      {summary?.unique_visitors || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Globe className="w-4 h-4 text-secondary" />
                      Countries
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-secondary">
                      {summary?.countries_count || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      Last 7 Days
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {summary?.views_last_7_days || 0}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Countries */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Top Countries
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {topCountries.length > 0 ? (
                    <div className="space-y-3">
                      {topCountries.map((country, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="font-medium">{country.viewer_country}</span>
                          <span className="text-muted-foreground">{country.count} views</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No country data available yet
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Recent Views */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Recent Views
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentViews.length > 0 ? (
                    <div className="space-y-3">
                      {recentViews.map((view) => (
                        <div key={view.id} className="flex items-center justify-between text-sm">
                          <div>
                            <span className="font-medium">
                              {view.viewer_country || "Unknown"}
                            </span>
                            {view.viewer_city && (
                              <span className="text-muted-foreground ml-2">• {view.viewer_city}</span>
                            )}
                          </div>
                          <span className="text-muted-foreground">
                            {formatDistanceToNow(new Date(view.viewed_at), { addSuffix: true })}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No recent views
                    </p>
                  )}
                </CardContent>
              </Card>

              {summary?.last_viewed_at && (
                <p className="text-sm text-center text-muted-foreground">
                  Last viewed {formatDistanceToNow(new Date(summary.last_viewed_at), { addSuffix: true })}
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
