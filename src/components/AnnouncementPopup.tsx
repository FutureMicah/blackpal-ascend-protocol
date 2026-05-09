// Global admin-controlled announcement popup. Shows the latest active announcement
// the user hasn't dismissed yet. Mounted once in App.tsx.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Megaphone } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  body: string;
  level: string;
  link_url: string | null;
  link_label: string | null;
  created_at: string;
}

export const AnnouncementPopup = () => {
  const [item, setItem] = useState<Announcement | null>(null);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      if (!mounted) return;
      setUserId(uid);
      if (!uid) return;

      const { data: anns } = await supabase
        .from("app_announcements")
        .select("id, title, body, level, link_url, link_label, created_at")
        .order("starts_at", { ascending: false })
        .limit(10);

      if (!anns || !anns.length) return;

      const { data: dismissed } = await supabase
        .from("app_announcement_dismissals")
        .select("announcement_id")
        .eq("user_id", uid);
      const seen = new Set((dismissed ?? []).map((d: any) => d.announcement_id));

      const next = (anns as Announcement[]).find((a) => !seen.has(a.id));
      if (next && mounted) {
        setItem(next);
        setOpen(true);
      }
    };

    load();

    const ch = supabase
      .channel("announcements-stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "app_announcements" },
        () => load()
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, []);

  const dismiss = async () => {
    if (item && userId) {
      await supabase.from("app_announcement_dismissals").insert({
        user_id: userId,
        announcement_id: item.id,
      });
    }
    setOpen(false);
  };

  if (!item) return null;

  const levelColor =
    item.level === "warning"
      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
      : item.level === "critical"
      ? "bg-destructive/15 text-destructive"
      : "bg-primary/15 text-primary";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && dismiss()}>
      <DialogContent
        className="max-w-md"
        aria-live="polite"
        role="alertdialog"
      >
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Megaphone className="w-4 h-4 text-primary" aria-hidden="true" />
            <Badge variant="secondary" className={`text-[10px] ${levelColor}`}>
              {item.level.toUpperCase()}
            </Badge>
          </div>
          <DialogTitle>{item.title}</DialogTitle>
          <DialogDescription className="whitespace-pre-wrap">{item.body}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-row gap-2 justify-end">
          {item.link_url && (
            <a
              href={item.link_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary"
            >
              {item.link_label ?? "Learn more"}
            </a>
          )}
          <Button variant="outline" onClick={dismiss}>
            Dismiss
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
