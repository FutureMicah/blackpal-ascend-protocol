import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FloatingNav } from "@/components/FloatingNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, PlayCircle, CheckCircle, Lock, Loader2, Trophy, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Course {
  id: string;
  title: string;
  description: string;
  lessons: number;
  completed: number;
  progress: number;
  xpReward: number;
  unlocked: boolean;
  gradient: string;
}

const BlackBoard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userXP, setUserXP] = useState(0);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }
      setUserId(user.id);
      await loadData(user.id);
    };
    init();
  }, [navigate]);

  const loadData = async (uid: string) => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("xp_points, rank_level")
        .eq("id", uid)
        .single();

      setUserXP(profile?.xp_points || 0);

      const mockCourses: Course[] = [
        { id: "1", title: "Technical Analysis Mastery", description: "Learn to read charts and identify patterns", lessons: 12, completed: Math.min(Math.floor((profile?.xp_points || 0) / 100), 12), progress: Math.min(Math.floor((profile?.xp_points || 0) / 100 / 12 * 100), 100), xpReward: 500, unlocked: true, gradient: "bg-gradient-to-br from-blue-500 to-cyan-600" },
        { id: "2", title: "Risk Management Fundamentals", description: "Protect your capital with proven strategies", lessons: 8, completed: Math.min(Math.floor((profile?.xp_points || 0) / 200), 8), progress: Math.min(Math.floor((profile?.xp_points || 0) / 200 / 8 * 100), 100), xpReward: 300, unlocked: true, gradient: "bg-gradient-to-br from-green-500 to-emerald-600" },
        { id: "3", title: "Advanced Trading Strategies", description: "Master complex trading techniques", lessons: 15, completed: Math.min(Math.floor((profile?.xp_points || 0) / 300), 15), progress: Math.min(Math.floor((profile?.xp_points || 0) / 300 / 15 * 100), 100), xpReward: 800, unlocked: (profile?.rank_level || 1) >= 2, gradient: "bg-gradient-to-br from-purple-500 to-pink-600" },
        { id: "4", title: "Algorithmic Trading", description: "Automate your trading with algorithms", lessons: 20, completed: 0, progress: 0, xpReward: 1500, unlocked: (profile?.rank_level || 1) >= 5, gradient: "bg-gradient-to-br from-orange-500 to-red-600" },
      ];
      setCourses(mockCourses);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const completeLesson = async (courseId: string, courseXP: number) => {
    if (!userId) return;
    try {
      const xpGain = Math.max(1, Math.floor(courseXP / 50));
      const { data: profile } = await supabase.from("profiles").select("xp_points").eq("id", userId).single();
      await supabase.from("profiles").update({ xp_points: (profile?.xp_points || 0) + xpGain }).eq("id", userId);
      await supabase.from("friend_activities").insert({ user_id: userId, activity_type: "lesson_complete", activity_data: { courseId, xpGain } });
      toast({ title: "Lesson completed!", description: `+${xpGain} XP earned` });
      setUserXP(prev => prev + xpGain);
      await loadData(userId);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <FloatingNav />
      <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-16 pb-8">
        <header className="mb-5">
          <h1 className="text-lg sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 sm:w-7 sm:h-7" />
            BlackBoard
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Academy of Mastery — Your path to trading excellence</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1 px-2 py-1 bg-primary/20 rounded-full text-[10px] font-bold">
              <Zap className="w-3 h-3 text-primary" />
              {userXP.toLocaleString()} XP
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {courses.map((course) => (
            <Card key={course.id} className={`${course.gradient} rounded-xl p-4 relative overflow-hidden transition-all ${course.unlocked ? 'hover:scale-[1.01] cursor-pointer' : 'opacity-70'}`}>
              {!course.unlocked && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
                  <div className="text-center">
                    <Lock className="w-8 h-8 text-white/50 mx-auto mb-1" />
                    <p className="text-white/70 text-xs font-medium">Reach higher level to unlock</p>
                  </div>
                </div>
              )}
              <div className="relative z-[5]">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white mb-0.5 truncate">{course.title}</h3>
                    <p className="text-white/80 text-[10px]">{course.description}</p>
                  </div>
                  {course.progress === 100 ? <CheckCircle className="w-5 h-5 text-white shrink-0" /> : <PlayCircle className="w-5 h-5 text-white/70 shrink-0" />}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-white/90 text-[10px]">
                    <span>{course.completed}/{course.lessons} lessons</span>
                    <span className="font-semibold">{course.progress}%</span>
                  </div>
                  <Progress value={course.progress} className="h-1.5 bg-white/20" />
                  <div className="flex items-center gap-1 text-white/80 text-[10px]">
                    <Trophy className="w-3 h-3" />
                    <span>+{course.xpReward} XP on completion</span>
                  </div>
                  {course.unlocked && (
                    <Button className="w-full h-8 text-[10px] bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold rounded-lg" onClick={() => completeLesson(course.id, course.xpReward)}>
                      {course.progress === 100 ? "Review" : course.progress > 0 ? "Continue" : "Start"}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BlackBoard;
