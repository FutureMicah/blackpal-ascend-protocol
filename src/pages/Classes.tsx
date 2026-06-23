import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { FloatingNav } from "@/components/FloatingNav";
import { toast } from "sonner";
import {
  GraduationCap, Search, Play, Clock, Coins, Sparkles, Users, Calendar,
  CheckCircle2, Lock, Radio, Award, BookOpen, ChevronRight,
} from "lucide-react";
import { format, isAfter, isBefore } from "date-fns";
import { LiveSessionRoom } from "@/components/classes/LiveSessionRoom";

type Course = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  category: string | null;
  level: string | null;
  instructor_name: string | null;
  price_btax: number;
  xp_reward: number;
  duration_minutes: number | null;
  tags: string[] | null;
  is_published: boolean;
};

type Lesson = {
  id: string;
  course_id: string;
  title: string;
  body: string | null;
  video_url: string | null;
  resource_url: string | null;
  duration_minutes: number | null;
  display_order: number | null;
};

type Enrollment = {
  id: string;
  course_id: string;
  progress_percent: number;
  completed_at: string | null;
  enrolled_at: string;
};

type LiveSession = {
  id: string;
  course_id: string | null;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  stream_url: string | null;
  replay_url: string | null;
  host_name: string | null;
  is_live: boolean;
  attendees_count: number;
  provider?: "jitsi" | "daily" | "external" | null;
  room_name?: string | null;
};

const LEVELS = ["all", "beginner", "intermediate", "advanced"];

export default function Classes() {
  const [user, setUser] = useState<any>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [openCourse, setOpenCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveRoom, setLiveRoom] = useState<LiveSession | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await Promise.all([loadCourses(), loadEnrollments(session.user.id), loadSessions()]);
      setLoading(false);
    })();
  }, [navigate]);

  const loadCourses = async () => {
    const { data } = await supabase.from("academy_courses")
      .select("*").eq("is_published", true).order("display_order", { ascending: true });
    setCourses((data || []) as any);
  };

  const loadEnrollments = async (uid: string) => {
    const { data } = await supabase.from("class_enrollments").select("*").eq("user_id", uid);
    setEnrollments((data || []) as any);
  };

  const loadSessions = async () => {
    const { data } = await supabase.from("class_live_sessions").select("*")
      .order("starts_at", { ascending: true });
    setSessions((data || []) as any);
  };

  const isEnrolled = (cid: string) => enrollments.some(e => e.course_id === cid);
  const getEnrollment = (cid: string) => enrollments.find(e => e.course_id === cid);

  const filteredCourses = courses.filter(c => {
    if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (levelFilter !== "all" && c.level !== levelFilter) return false;
    if (categoryFilter !== "all" && c.category !== categoryFilter) return false;
    return true;
  });

  const categories = ["all", ...new Set(courses.map(c => c.category).filter(Boolean) as string[])];

  const handleEnroll = async (course: Course) => {
    if (!user) return;
    if (course.price_btax > 0) {
      // check BTAX balance
      const { data: wallet } = await supabase.from("wallets").select("btax_balance").eq("user_id", user.id).maybeSingle();
      if (!wallet || (wallet.btax_balance || 0) < course.price_btax) {
        toast.error(`You need ${course.price_btax} BTAX to enroll`);
        return;
      }
      await supabase.from("wallets").update({ btax_balance: (wallet.btax_balance || 0) - course.price_btax }).eq("user_id", user.id);
      await supabase.from("wallet_transactions").insert({
        user_id: user.id, amount: -course.price_btax, type: "debit",
        description: `Class enrollment: ${course.title}`,
      } as any);
    }
    const { error } = await supabase.from("class_enrollments").insert({
      user_id: user.id, course_id: course.id, paid_btax: course.price_btax,
    } as any);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Enrolled in ${course.title}!`);
    await loadEnrollments(user.id);
  };

  const openCourseDetails = async (course: Course) => {
    setOpenCourse(course);
    const { data: lessonsData } = await supabase.from("academy_lessons")
      .select("*").eq("course_id", course.id).order("display_order", { ascending: true });
    setLessons((lessonsData || []) as any);
    const { data: progress } = await supabase.from("class_lesson_progress")
      .select("lesson_id").eq("user_id", user.id).eq("course_id", course.id).eq("completed", true);
    setCompletedLessons(new Set((progress || []).map((p: any) => p.lesson_id)));
    setActiveLesson(null);
  };

  const markLessonComplete = async (lesson: Lesson) => {
    if (!user || !openCourse) return;
    await supabase.from("class_lesson_progress").upsert({
      user_id: user.id, lesson_id: lesson.id, course_id: openCourse.id,
      completed: true, completed_at: new Date().toISOString(),
    } as any, { onConflict: "user_id,lesson_id" });
    setCompletedLessons(prev => new Set([...prev, lesson.id]));
    toast.success("Lesson completed! +XP awarded");
    await loadEnrollments(user.id);

    // Award XP if all lessons done
    const all = lessons.length;
    const done = completedLessons.size + 1;
    if (done >= all && openCourse.xp_reward) {
      await supabase.from("xp_ledger").insert({
        user_id: user.id, xp_amount: openCourse.xp_reward,
        source: "class_completion", description: `Completed ${openCourse.title}`,
      } as any);
      toast.success(`Class complete! +${openCourse.xp_reward} XP`);
    }
  };

  const joinSession = async (s: LiveSession) => {
    if (!user) return;
    await supabase.from("class_session_attendance").upsert({
      session_id: s.id, user_id: user.id,
    } as any, { onConflict: "session_id,user_id" });
    // External link → open in new tab. Jitsi/Daily → open in-app room.
    if ((s.provider === "external") || (!s.provider && s.stream_url && !s.room_name)) {
      if (s.stream_url) window.open(s.stream_url, "_blank");
      return;
    }
    setLiveRoom(s);
  };

  const now = new Date();
  const liveNow = sessions.filter(s => s.is_live || (isBefore(new Date(s.starts_at), now) && (!s.ends_at || isAfter(new Date(s.ends_at), now))));
  const upcoming = sessions.filter(s => isAfter(new Date(s.starts_at), now));
  const replays = sessions.filter(s => s.replay_url && isBefore(new Date(s.starts_at), now));

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading classes…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <FloatingNav />

      <div className="container mx-auto px-3 sm:px-6 pt-20 sm:pt-24 max-w-6xl">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/60 to-card/80 backdrop-blur-xl p-5 sm:p-8 mb-5"
        >
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="relative flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary/80 mb-2">
                <GraduationCap className="w-3.5 h-3.5" /> BlackPal Academy
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold text-foreground">Classes</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-md">
                Browse, enroll, learn live, and earn XP + BTAX while you sharpen your edge.
              </p>
            </div>
            <div className="flex gap-2">
              <Card className="bg-card/60 backdrop-blur border border-border px-3 py-2">
                <p className="text-[10px] text-muted-foreground">Enrolled</p>
                <p className="text-xl font-bold text-primary">{enrollments.length}</p>
              </Card>
              <Card className="bg-card/60 backdrop-blur border border-border px-3 py-2">
                <p className="text-[10px] text-muted-foreground">Completed</p>
                <p className="text-xl font-bold text-green-400">
                  {enrollments.filter(e => e.completed_at).length}
                </p>
              </Card>
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="browse" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="browse"><BookOpen className="w-3.5 h-3.5 mr-1" />Browse</TabsTrigger>
            <TabsTrigger value="live"><Radio className="w-3.5 h-3.5 mr-1" />Live</TabsTrigger>
            <TabsTrigger value="mine"><Award className="w-3.5 h-3.5 mr-1" />My Classes</TabsTrigger>
          </TabsList>

          {/* Browse */}
          <TabsContent value="browse" className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[150px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search classes…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {LEVELS.map(l => (
                <Button key={l} size="sm" variant={levelFilter === l ? "default" : "outline"}
                  onClick={() => setLevelFilter(l)} className="capitalize h-7 text-[10px] px-3">{l}</Button>
              ))}
              <div className="w-px bg-border mx-1" />
              {categories.map(c => (
                <Button key={c} size="sm" variant={categoryFilter === c ? "default" : "outline"}
                  onClick={() => setCategoryFilter(c)} className="capitalize h-7 text-[10px] px-3 whitespace-nowrap">{c}</Button>
              ))}
            </div>

            {filteredCourses.length === 0 ? (
              <Card className="p-8 text-center bg-card/60 border-border">
                <GraduationCap className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No classes match your filters yet.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredCourses.map((course, i) => {
                  const enrolled = isEnrolled(course.id);
                  const enrollment = getEnrollment(course.id);
                  return (
                    <motion.div key={course.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}>
                      <Card className="overflow-hidden bg-card/60 backdrop-blur border-border hover:border-primary/40 transition group">
                        <div className="aspect-[16/9] relative bg-gradient-to-br from-primary/20 to-card overflow-hidden">
                          {course.cover_url ? (
                            <img src={course.cover_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <GraduationCap className="w-12 h-12 text-primary/40" />
                            </div>
                          )}
                          {course.level && (
                            <Badge variant="secondary" className="absolute top-2 left-2 text-[10px] capitalize">{course.level}</Badge>
                          )}
                          {course.price_btax > 0 ? (
                            <Badge className="absolute top-2 right-2 bg-yellow-500/90 text-black text-[10px] gap-1">
                              <Coins className="w-3 h-3" />{course.price_btax}
                            </Badge>
                          ) : (
                            <Badge className="absolute top-2 right-2 bg-green-500/90 text-black text-[10px]">FREE</Badge>
                          )}
                        </div>
                        <div className="p-3 space-y-2">
                          <h3 className="font-semibold text-sm text-foreground line-clamp-1">{course.title}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-2">{course.description}</p>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground gap-2">
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{course.instructor_name || "Academy"}</span>
                            {course.duration_minutes ? <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{course.duration_minutes}m</span> : null}
                            <span className="flex items-center gap-1 text-primary"><Sparkles className="w-3 h-3" />{course.xp_reward} XP</span>
                          </div>
                          {enrolled && enrollment && (
                            <div className="space-y-1">
                              <Progress value={enrollment.progress_percent} className="h-1" />
                              <p className="text-[10px] text-muted-foreground">{enrollment.progress_percent}% complete</p>
                            </div>
                          )}
                          {enrolled ? (
                            <div className="flex gap-1">
                              <Button size="sm" className="flex-1 h-8 text-xs" variant="secondary" onClick={() => openCourseDetails(course)}>
                                <Play className="w-3 h-3 mr-1" />Continue
                              </Button>
                              <Button size="sm" className="h-8 text-xs px-2" variant="outline" onClick={() => setChatCourse(course)}>
                                <MessageCircle className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" className="w-full h-8 text-xs" onClick={() => handleEnroll(course)}>
                              Enroll <ChevronRight className="w-3 h-3 ml-1" />
                            </Button>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Live */}
          <TabsContent value="live" className="space-y-4">
            {liveNow.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs uppercase tracking-widest text-red-400 flex items-center gap-2">
                  <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" /></span>
                  Live Now
                </h3>
                {liveNow.map(s => (
                  <Card key={s.id} className="p-3 bg-card/60 backdrop-blur border-red-500/40">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground">{s.title}</p>
                        <p className="text-[10px] text-muted-foreground">{s.host_name} • {s.attendees_count} watching</p>
                      </div>
                      <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white h-8 text-xs" onClick={() => joinSession(s)}>
                        <Radio className="w-3 h-3 mr-1" />Join
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Calendar className="w-3 h-3" />Upcoming</h3>
              {upcoming.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No upcoming sessions scheduled.</p>
              ) : upcoming.map(s => (
                <Card key={s.id} className="p-3 bg-card/60 backdrop-blur border-border">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground">{s.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(s.starts_at), "MMM d, h:mm a")} • {s.host_name}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {format(new Date(s.starts_at), "MMM d")}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>

            <div className="space-y-2">
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Play className="w-3 h-3" />Replays</h3>
              {replays.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No replays available yet.</p>
              ) : replays.map(s => (
                <Card key={s.id} className="p-3 bg-card/60 backdrop-blur border-border">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground">{s.title}</p>
                      <p className="text-[10px] text-muted-foreground">{format(new Date(s.starts_at), "MMM d, yyyy")}</p>
                    </div>
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => s.replay_url && window.open(s.replay_url, "_blank")}>
                      <Play className="w-3 h-3 mr-1" />Watch
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* My Classes */}
          <TabsContent value="mine" className="space-y-3">
            {enrollments.length === 0 ? (
              <Card className="p-8 text-center bg-card/60 border-border">
                <Award className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">You haven't enrolled in any classes yet.</p>
              </Card>
            ) : (
              enrollments.map(e => {
                const c = courses.find(x => x.id === e.course_id);
                if (!c) return null;
                return (
                  <Card key={e.id} className="p-3 bg-card/60 backdrop-blur border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        {c.cover_url ? <img src={c.cover_url} alt="" className="w-full h-full rounded-lg object-cover" /> : <GraduationCap className="w-6 h-6 text-primary/60" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground line-clamp-1">{c.title}</p>
                        <Progress value={e.progress_percent} className="h-1 mt-1" />
                        <p className="text-[10px] text-muted-foreground mt-1">{e.progress_percent}% • enrolled {format(new Date(e.enrolled_at), "MMM d")}</p>
                      </div>
                      <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={() => openCourseDetails(c)}>
                        {e.completed_at ? <CheckCircle2 className="w-3 h-3 mr-1 text-green-400" /> : <Play className="w-3 h-3 mr-1" />}
                        {e.completed_at ? "Done" : "Resume"}
                      </Button>
                    </div>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Course details / lesson player */}
      <Dialog open={!!openCourse} onOpenChange={(o) => { if (!o) { setOpenCourse(null); setActiveLesson(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" /> {openCourse?.title}
            </DialogTitle>
          </DialogHeader>
          {openCourse && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">{openCourse.description}</p>
              {activeLesson ? (
                <div className="space-y-3">
                  <Button size="sm" variant="ghost" onClick={() => setActiveLesson(null)} className="text-xs">← Back to lessons</Button>
                  <h3 className="font-semibold">{activeLesson.title}</h3>
                  {activeLesson.video_url && (
                    <div className="aspect-video rounded-lg overflow-hidden bg-black">
                      <iframe src={activeLesson.video_url} className="w-full h-full" allow="autoplay; encrypted-media" allowFullScreen />
                    </div>
                  )}
                  {activeLesson.body && (
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">{activeLesson.body}</div>
                  )}
                  {activeLesson.resource_url && (
                    <Button size="sm" variant="outline" onClick={() => window.open(activeLesson.resource_url!, "_blank")}>
                      Download resources
                    </Button>
                  )}
                  <Button size="sm" className="w-full"
                    disabled={completedLessons.has(activeLesson.id)}
                    onClick={() => markLessonComplete(activeLesson)}>
                    {completedLessons.has(activeLesson.id) ? <><CheckCircle2 className="w-4 h-4 mr-1" />Completed</> : "Mark as complete"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Lessons</p>
                  {lessons.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No lessons published yet.</p>
                  ) : lessons.map((l, i) => {
                    const done = completedLessons.has(l.id);
                    return (
                      <button key={l.id} onClick={() => setActiveLesson(l)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 text-left transition">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${done ? "bg-green-500/20 text-green-400" : "bg-primary/10 text-primary"}`}>
                          {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{l.title}</p>
                          {l.duration_minutes ? <p className="text-[10px] text-muted-foreground">{l.duration_minutes} min</p> : null}
                        </div>
                        <Play className="w-4 h-4 text-muted-foreground" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {user && (
        <LiveSessionRoom
          open={!!liveRoom}
          onClose={() => setLiveRoom(null)}
          session={liveRoom}
          courseTitle={courses.find(c => c.id === liveRoom?.course_id)?.title}
          courseRules={(courses.find(c => c.id === liveRoom?.course_id) as any)?.rules}
          userId={user.id}
          userName={user.user_metadata?.full_name || user.email?.split("@")[0] || "Trader"}
        />
      )}
    </div>
  );
}
