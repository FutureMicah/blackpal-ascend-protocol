import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RotateCcw, Clock, User, FileText, MapPin, Phone, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface ProfileHistoryEntry {
  id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  country: string | null;
  phone_number: string | null;
  changed_fields: string[];
  created_at: string;
}

interface ProfileHistoryTimelineProps {
  userId: string;
  onClose: () => void;
  onRevert: (historyEntry: ProfileHistoryEntry) => void;
}

const fieldIcons: Record<string, any> = {
  display_name: User,
  bio: FileText,
  country: MapPin,
  phone_number: Phone,
  avatar_url: ImageIcon,
};

const fieldLabels: Record<string, string> = {
  display_name: "Display Name",
  bio: "Bio",
  country: "Country",
  phone_number: "Phone Number",
  avatar_url: "Avatar",
};

export const ProfileHistoryTimeline = ({
  userId,
  onClose,
  onRevert,
}: ProfileHistoryTimelineProps) => {
  const [history, setHistory] = useState<ProfileHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [userId]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("profile_history")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      setHistory(data || []);
    } catch (error) {
      console.error("Error loading profile history:", error);
      toast.error("Failed to load profile history");
    } finally {
      setLoading(false);
    }
  };

  const handleRevert = async (entry: ProfileHistoryEntry) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: entry.display_name,
          bio: entry.bio,
          avatar_url: entry.avatar_url,
          country: entry.country,
          phone_number: entry.phone_number,
        })
        .eq("id", userId);

      if (error) throw error;

      toast.success("Profile reverted successfully!");
      onRevert(entry);
      onClose();
    } catch (error) {
      console.error("Error reverting profile:", error);
      toast.error("Failed to revert profile");
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
        className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl border border-primary/30 bg-card/90 backdrop-blur-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-bold">Profile History</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No profile changes recorded yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative pl-8 pb-8 last:pb-0"
                >
                  {/* Timeline line */}
                  {index !== history.length - 1 && (
                    <div className="absolute left-2 top-8 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 to-transparent" />
                  )}

                  {/* Timeline dot */}
                  <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-primary border-2 border-background" />

                  {/* Entry card */}
                  <div className="p-4 rounded-lg border border-border bg-card/50 hover:bg-card/80 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-1">
                          {formatDistanceToNow(new Date(entry.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {entry.changed_fields.map((field) => {
                            const Icon = fieldIcons[field] || FileText;
                            return (
                              <span
                                key={field}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-xs font-medium"
                              >
                                <Icon className="w-3 h-3" />
                                {fieldLabels[field] || field}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevert(entry)}
                        className="ml-4"
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Revert
                      </Button>
                    </div>

                    {/* Changed values preview */}
                    <div className="space-y-2 text-sm">
                      {entry.changed_fields.includes("display_name") && entry.display_name && (
                        <div>
                          <span className="text-muted-foreground">Name: </span>
                          <span className="font-medium">{entry.display_name}</span>
                        </div>
                      )}
                      {entry.changed_fields.includes("country") && entry.country && (
                        <div>
                          <span className="text-muted-foreground">Country: </span>
                          <span className="font-medium">{entry.country}</span>
                        </div>
                      )}
                      {entry.changed_fields.includes("bio") && entry.bio && (
                        <div>
                          <span className="text-muted-foreground">Bio: </span>
                          <span className="font-medium line-clamp-2">{entry.bio}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
