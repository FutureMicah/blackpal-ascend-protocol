// Admin announcements manager. Lets admins create, toggle, and delete app-wide popup announcements.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Megaphone, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";

type RoleKey = "student" | "sponsor" | "admin" | "moderator";
const ROLE_OPTIONS: RoleKey[] = ["student", "sponsor", "moderator", "admin"];

interface Announcement {
  id: string;
  title: string;
  body: string;
  level: string;
  link_url: string | null;
  link_label: string | null;
  is_active: boolean;
  created_at: string;
  starts_at?: string;
  ends_at?: string | null;
  target_roles?: RoleKey[];
}

export const AdminAnnouncements = () => {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [level, setLevel] = useState("info");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [targetRoles, setTargetRoles] = useState<RoleKey[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("app_announcements")
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data ?? []) as Announcement[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleRole = (r: RoleKey) =>
    setTargetRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  const create = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const payload: any = {
      title: title.trim(),
      body: body.trim(),
      level,
      link_url: linkUrl.trim() || null,
      link_label: linkLabel.trim() || null,
      is_active: true,
      created_by: auth.user?.id,
      target_roles: targetRoles,
    };
    if (startsAt) payload.starts_at = new Date(startsAt).toISOString();
    if (endsAt) payload.ends_at = new Date(endsAt).toISOString();

    const { error } = await supabase.from("app_announcements").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Failed to create announcement: " + error.message);
      return;
    }
    toast.success("Announcement published");
    setTitle("");
    setBody("");
    setLinkUrl("");
    setLinkLabel("");
    setLevel("info");
    setStartsAt("");
    setEndsAt("");
    setTargetRoles([]);
    load();
  };

  const toggle = async (a: Announcement) => {
    await supabase.from("app_announcements").update({ is_active: !a.is_active }).eq("id", a.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    await supabase.from("app_announcements").delete().eq("id", id);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="w-4 h-4 text-primary" /> Create Announcement Popup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="ann-title">Title</Label>
            <Input id="ann-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Heads up — system maintenance" />
          </div>
          <div>
            <Label htmlFor="ann-body">Body</Label>
            <Textarea id="ann-body" value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Tell users what's going on…" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Level</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="ann-link">Link URL (optional)</Label>
              <Input id="ann-link" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" />
            </div>
            <div>
              <Label htmlFor="ann-link-label">Link label</Label>
              <Input id="ann-link-label" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="Learn more" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ann-starts">Show from (optional)</Label>
              <Input id="ann-starts" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ann-ends">Hide after (optional)</Label>
              <Input id="ann-ends" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="block mb-1.5">Target roles (leave empty for everyone)</Label>
            <div className="flex flex-wrap gap-2">
              {ROLE_OPTIONS.map((r) => {
                const on = targetRoles.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRole(r)}
                    className={`text-[10px] px-2.5 py-1 rounded-full border transition focus-visible:ring-2 focus-visible:ring-primary ${
                      on
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/30 text-muted-foreground border-border"
                    }`}
                    aria-pressed={on}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
            <p className="text-[9px] text-muted-foreground mt-1">
              {targetRoles.length === 0
                ? "Visible to everyone signed in."
                : `Visible only to: ${targetRoles.join(", ")}`}
            </p>
          </div>
          <Button onClick={create} disabled={saving} className="w-full">
            <Plus className="w-4 h-4 mr-1" /> {saving ? "Publishing…" : "Publish announcement"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Existing Announcements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-xs text-muted-foreground">No announcements yet.</p>
          ) : (
            items.map((a) => (
              <div key={a.id} className="flex items-start gap-3 border border-border/60 rounded-md p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-[9px]">{a.level}</Badge>
                    {a.is_active ? (
                      <Badge className="text-[9px] bg-green-500/20 text-green-600">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px]">Inactive</Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(a.created_at), "MMM d, HH:mm")}
                    </span>
                  </div>
                  <p className="text-sm font-semibold truncate">{a.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{a.body}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {(a.target_roles ?? []).length === 0 ? (
                      <Badge variant="outline" className="text-[8px]">everyone</Badge>
                    ) : (
                      a.target_roles!.map((r) => (
                        <Badge key={r} variant="outline" className="text-[8px]">{r}</Badge>
                      ))
                    )}
                    {a.starts_at && (
                      <span className="text-[9px] text-muted-foreground">
                        from {format(new Date(a.starts_at), "MMM d HH:mm")}
                      </span>
                    )}
                    {a.ends_at && (
                      <span className="text-[9px] text-muted-foreground">
                        → {format(new Date(a.ends_at), "MMM d HH:mm")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Switch checked={a.is_active} onCheckedChange={() => toggle(a)} aria-label="Toggle active" />
                  <Button size="icon" variant="ghost" onClick={() => remove(a.id)} aria-label="Delete">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
