import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, BookOpen, Radio } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type Course = any;
type Lesson = any;
type Live = any;

export const AdminClassesManager = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<Live[]>([]);
  const [openCourse, setOpenCourse] = useState<Course | null>(null);
  const [openLesson, setOpenLesson] = useState<Lesson | null>(null);
  const [openSession, setOpenSession] = useState<Live | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [{ data: c }, { data: s }] = await Promise.all([
      supabase.from("academy_courses").select("*").order("display_order"),
      supabase.from("class_live_sessions").select("*").order("starts_at", { ascending: false }),
    ]);
    setCourses(c || []); setSessions(s || []);
  };

  const loadLessons = async (cid: string) => {
    setActiveCourseId(cid);
    const { data } = await supabase.from("academy_lessons").select("*").eq("course_id", cid).order("display_order");
    setLessons(data || []);
  };

  const saveCourse = async (c: Course) => {
    const payload = {
      title: c.title, description: c.description, cover_url: c.cover_url,
      category: c.category, level: c.level, instructor_name: c.instructor_name,
      price_btax: Number(c.price_btax) || 0, xp_reward: Number(c.xp_reward) || 50,
      duration_minutes: Number(c.duration_minutes) || 0,
      is_published: !!c.is_published, display_order: Number(c.display_order) || 0,
    };
    const op = c.id
      ? supabase.from("academy_courses").update(payload).eq("id", c.id)
      : supabase.from("academy_courses").insert(payload as any);
    const { error } = await op;
    if (error) toast.error(error.message);
    else { toast.success("Saved"); setOpenCourse(null); load(); }
  };

  const deleteCourse = async (id: string) => {
    if (!confirm("Delete this course and all its lessons?")) return;
    const { error } = await supabase.from("academy_courses").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  const saveLesson = async (l: Lesson) => {
    if (!activeCourseId) return;
    const payload = {
      course_id: activeCourseId, title: l.title, body: l.body,
      video_url: l.video_url, resource_url: l.resource_url,
      duration_minutes: Number(l.duration_minutes) || 0,
      display_order: Number(l.display_order) || 0,
    };
    const op = l.id
      ? supabase.from("academy_lessons").update(payload).eq("id", l.id)
      : supabase.from("academy_lessons").insert(payload as any);
    const { error } = await op;
    if (error) toast.error(error.message);
    else { toast.success("Lesson saved"); setOpenLesson(null); loadLessons(activeCourseId); }
  };

  const deleteLesson = async (id: string) => {
    if (!confirm("Delete this lesson?")) return;
    const { error } = await supabase.from("academy_lessons").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); if (activeCourseId) loadLessons(activeCourseId); }
  };

  const saveSession = async (s: Live) => {
    const provider = s.provider || "jitsi";
    const slugify = (t: string) => (t || "session").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
    const room_name = s.room_name?.trim() || `blackpal-${slugify(s.title)}-${Math.random().toString(36).slice(2, 6)}`;
    const payload = {
      course_id: s.course_id || null, title: s.title, description: s.description,
      starts_at: s.starts_at, ends_at: s.ends_at || null,
      stream_url: s.stream_url, replay_url: s.replay_url,
      host_name: s.host_name, is_live: !!s.is_live,
      provider, room_name,
    };
    const op = s.id
      ? supabase.from("class_live_sessions").update(payload).eq("id", s.id)
      : supabase.from("class_live_sessions").insert(payload as any);
    const { error } = await op;
    if (error) toast.error(error.message);
    else { toast.success("Session saved"); setOpenSession(null); load(); }
  };

  const deleteSession = async (id: string) => {
    if (!confirm("Delete this live session?")) return;
    const { error } = await supabase.from("class_live_sessions").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <Card className="p-4 bg-card/80 border-border">
      <Tabs defaultValue="courses">
        <TabsList>
          <TabsTrigger value="courses"><BookOpen className="w-4 h-4 mr-1" />Courses</TabsTrigger>
          <TabsTrigger value="live"><Radio className="w-4 h-4 mr-1" />Live Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="space-y-3 mt-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Manage Classes</h3>
            <Button size="sm" onClick={() => setOpenCourse({ is_published: true, level: "beginner", xp_reward: 50, price_btax: 0 })}>
              <Plus className="w-4 h-4 mr-1" />New Course
            </Button>
          </div>
          {courses.map(c => (
            <div key={c.id} className="p-3 border border-border rounded-lg space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{c.title} {c.is_published ? <span className="text-[10px] text-green-400">• Live</span> : <span className="text-[10px] text-muted-foreground">• Draft</span>}</p>
                  <p className="text-[10px] text-muted-foreground">{c.level} • {c.category || "uncategorized"} • {c.price_btax || 0} BTAX • {c.xp_reward || 0} XP</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => { loadLessons(c.id); }}>Lessons</Button>
                  <Button size="icon" variant="ghost" onClick={() => setOpenCourse(c)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteCourse(c.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                </div>
              </div>
              {activeCourseId === c.id && (
                <div className="bg-muted/30 rounded-lg p-2 space-y-1">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-medium">Lessons ({lessons.length})</p>
                    <Button size="sm" variant="ghost" onClick={() => setOpenLesson({ display_order: lessons.length })}>
                      <Plus className="w-3 h-3 mr-1" />Add
                    </Button>
                  </div>
                  {lessons.map(l => (
                    <div key={l.id} className="flex items-center justify-between gap-2 p-2 bg-card rounded text-xs">
                      <span>{l.display_order + 1}. {l.title} {l.duration_minutes ? `• ${l.duration_minutes}m` : ""}</span>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setOpenLesson(l)}><Pencil className="w-3 h-3" /></Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteLesson(l.id)}><Trash2 className="w-3 h-3 text-red-400" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="live" className="space-y-3 mt-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Live Sessions</h3>
            <Button size="sm" onClick={() => setOpenSession({ starts_at: new Date().toISOString().slice(0, 16), provider: "jitsi" })}>
              <Plus className="w-4 h-4 mr-1" />New Session
            </Button>
          </div>
          {sessions.map(s => (
            <div key={s.id} className="p-3 border border-border rounded-lg flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-sm">{s.title} {s.is_live && <span className="text-[10px] text-red-400">• LIVE</span>}</p>
                <p className="text-[10px] text-muted-foreground">{format(new Date(s.starts_at), "MMM d, h:mm a")} • {s.host_name} • {s.attendees_count} attendees • <span className="uppercase">{s.provider || "jitsi"}</span></p>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => setOpenSession(s)}><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => deleteSession(s.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      {/* Course editor */}
      <Dialog open={!!openCourse} onOpenChange={o => !o && setOpenCourse(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{openCourse?.id ? "Edit" : "New"} Course</DialogTitle></DialogHeader>
          {openCourse && (
            <div className="space-y-2">
              <Input placeholder="Title" value={openCourse.title || ""} onChange={e => setOpenCourse({ ...openCourse, title: e.target.value })} />
              <Textarea placeholder="Description" value={openCourse.description || ""} onChange={e => setOpenCourse({ ...openCourse, description: e.target.value })} />
              <Input placeholder="Cover image URL" value={openCourse.cover_url || ""} onChange={e => setOpenCourse({ ...openCourse, cover_url: e.target.value })} />
              <Input placeholder="Category (e.g. Forex)" value={openCourse.category || ""} onChange={e => setOpenCourse({ ...openCourse, category: e.target.value })} />
              <Input placeholder="Instructor name" value={openCourse.instructor_name || ""} onChange={e => setOpenCourse({ ...openCourse, instructor_name: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <select className="border border-border bg-background rounded px-2 py-2 text-sm"
                  value={openCourse.level || "beginner"}
                  onChange={e => setOpenCourse({ ...openCourse, level: e.target.value })}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
                <Input type="number" placeholder="Duration (min)" value={openCourse.duration_minutes || ""} onChange={e => setOpenCourse({ ...openCourse, duration_minutes: e.target.value })} />
                <Input type="number" placeholder="Price (BTAX)" value={openCourse.price_btax || 0} onChange={e => setOpenCourse({ ...openCourse, price_btax: e.target.value })} />
                <Input type="number" placeholder="XP reward" value={openCourse.xp_reward || 50} onChange={e => setOpenCourse({ ...openCourse, xp_reward: e.target.value })} />
                <Input type="number" placeholder="Order" value={openCourse.display_order || 0} onChange={e => setOpenCourse({ ...openCourse, display_order: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!openCourse.is_published} onChange={e => setOpenCourse({ ...openCourse, is_published: e.target.checked })} />
                Published
              </label>
              <Button className="w-full" onClick={() => saveCourse(openCourse)}>Save Course</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lesson editor */}
      <Dialog open={!!openLesson} onOpenChange={o => !o && setOpenLesson(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{openLesson?.id ? "Edit" : "New"} Lesson</DialogTitle></DialogHeader>
          {openLesson && (
            <div className="space-y-2">
              <Input placeholder="Title" value={openLesson.title || ""} onChange={e => setOpenLesson({ ...openLesson, title: e.target.value })} />
              <Textarea placeholder="Lesson content / notes" rows={5} value={openLesson.body || ""} onChange={e => setOpenLesson({ ...openLesson, body: e.target.value })} />
              <Input placeholder="Video URL (YouTube embed / mp4)" value={openLesson.video_url || ""} onChange={e => setOpenLesson({ ...openLesson, video_url: e.target.value })} />
              <Input placeholder="Resources URL" value={openLesson.resource_url || ""} onChange={e => setOpenLesson({ ...openLesson, resource_url: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" placeholder="Duration (min)" value={openLesson.duration_minutes || ""} onChange={e => setOpenLesson({ ...openLesson, duration_minutes: e.target.value })} />
                <Input type="number" placeholder="Order" value={openLesson.display_order || 0} onChange={e => setOpenLesson({ ...openLesson, display_order: e.target.value })} />
              </div>
              <Button className="w-full" onClick={() => saveLesson(openLesson)}>Save Lesson</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Session editor */}
      <Dialog open={!!openSession} onOpenChange={o => !o && setOpenSession(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{openSession?.id ? "Edit" : "New"} Live Session</DialogTitle></DialogHeader>
          {openSession && (
            <div className="space-y-2">
              <Input placeholder="Title" value={openSession.title || ""} onChange={e => setOpenSession({ ...openSession, title: e.target.value })} />
              <Textarea placeholder="Description" value={openSession.description || ""} onChange={e => setOpenSession({ ...openSession, description: e.target.value })} />
              <select className="w-full border border-border bg-background rounded px-2 py-2 text-sm"
                value={openSession.course_id || ""}
                onChange={e => setOpenSession({ ...openSession, course_id: e.target.value || null })}>
                <option value="">No related course</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <Input type="datetime-local" value={openSession.starts_at?.slice(0, 16) || ""} onChange={e => setOpenSession({ ...openSession, starts_at: new Date(e.target.value).toISOString() })} />
              <Input type="datetime-local" placeholder="Ends at" value={openSession.ends_at?.slice(0, 16) || ""} onChange={e => setOpenSession({ ...openSession, ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
              <Input placeholder="Host name" value={openSession.host_name || ""} onChange={e => setOpenSession({ ...openSession, host_name: e.target.value })} />

              <div className="border border-border rounded-lg p-2 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Video provider</p>
                <select className="w-full border border-border bg-background rounded px-2 py-2 text-sm"
                  value={openSession.provider || "jitsi"}
                  onChange={e => setOpenSession({ ...openSession, provider: e.target.value })}>
                  <option value="jitsi">Jitsi — free, in-app video + screen share (default)</option>
                  <option value="daily">Daily.co — premium HD, requires DAILY_API_KEY</option>
                  <option value="external">External link — Zoom / Meet / YouTube Live</option>
                </select>
                {(openSession.provider || "jitsi") !== "external" && (
                  <Input
                    placeholder="Room name (auto-generated if blank, a-z 0-9 - _)"
                    value={openSession.room_name || ""}
                    onChange={e => setOpenSession({ ...openSession, room_name: e.target.value.replace(/[^a-zA-Z0-9_-]/g, "") })}
                  />
                )}
                {openSession.provider === "external" && (
                  <Input placeholder="Stream URL (Zoom / YouTube Live)" value={openSession.stream_url || ""} onChange={e => setOpenSession({ ...openSession, stream_url: e.target.value })} />
                )}
              </div>

              <Input placeholder="Replay URL (after the session)" value={openSession.replay_url || ""} onChange={e => setOpenSession({ ...openSession, replay_url: e.target.value })} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!openSession.is_live} onChange={e => setOpenSession({ ...openSession, is_live: e.target.checked })} />
                Live now
              </label>
              <Button className="w-full" onClick={() => saveSession(openSession)}>Save Session</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
