import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FloatingNav } from "@/components/FloatingNav";
import { Card } from "@/components/ui/card";
import { BookOpen, Loader2, PlayCircle, FileText, Image as ImageIcon, Music, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Course {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
}

interface Lesson {
  id: string;
  course_id: string;
  title: string;
  body: string | null;
  media_url: string | null;
  media_type: string | null;
}

const mediaIcon = (t: string | null) => {
  if (t === "video") return Video;
  if (t === "audio") return Music;
  if (t === "image") return ImageIcon;
  if (t === "file") return FileText;
  return PlayCircle;
};

const BlackBoard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessonsByCourse, setLessonsByCourse] = useState<Record<string, Lesson[]>>({});

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }

      const { data: c } = await supabase
        .from("academy_courses")
        .select("id, title, description, cover_url")
        .eq("is_published", true)
        .order("display_order", { ascending: true });

      const list = (c as Course[]) || [];
      setCourses(list);

      if (list.length > 0) {
        const { data: l } = await supabase
          .from("academy_lessons")
          .select("id, course_id, title, body, media_url, media_type")
          .in("course_id", list.map((x) => x.id))
          .order("display_order", { ascending: true });
        const grouped: Record<string, Lesson[]> = {};
        ((l as Lesson[]) || []).forEach((lesson) => {
          (grouped[lesson.course_id] ||= []).push(lesson);
        });
        setLessonsByCourse(grouped);
      }
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
            <BookOpen className="w-5 h-5" /> BlackBoard
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Academy lessons. Only the academy admin can publish content here.
          </p>
        </header>

        {courses.length === 0 ? (
          <Card className="p-8 text-center">
            <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <h2 className="text-sm font-bold">No lessons published yet</h2>
            <p className="text-xs text-muted-foreground mt-1">
              The academy admin hasn't uploaded any videos, audios, files, or notes yet. Check back soon.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {courses.map((course) => (
              <Card key={course.id} className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  {course.cover_url && (
                    <img src={course.cover_url} alt={course.title} className="w-16 h-16 rounded-lg object-cover" />
                  )}
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold">{course.title}</h3>
                    {course.description && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{course.description}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  {(lessonsByCourse[course.id] || []).map((lesson) => {
                    const Icon = mediaIcon(lesson.media_type);
                    return (
                      <a
                        key={lesson.id}
                        href={lesson.media_url || "#"}
                        target={lesson.media_url ? "_blank" : undefined}
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <Icon className="w-4 h-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{lesson.title}</p>
                          {lesson.body && (
                            <p className="text-[10px] text-muted-foreground truncate">{lesson.body}</p>
                          )}
                        </div>
                      </a>
                    );
                  })}
                  {(lessonsByCourse[course.id] || []).length === 0 && (
                    <p className="text-[10px] text-muted-foreground italic">No lessons in this course yet.</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlackBoard;
