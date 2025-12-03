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
      if (!user) {
        navigate("/");
        return;
      }
      setUserId(user.id);
      await loadData(user.id);
    };
    init();
  }, [navigate]);

  const loadData = async (uid: string) => {
    setLoading(true);
    try {
      // Load user profile for XP
      const { data: profile } = await supabase
        .from("profiles")
        .select("xp_points, rank_level")
        .eq("id", uid)
        .single();

      setUserXP(profile?.xp_points || 0);

      // Simulated courses - in a real app, these would come from a courses table
      const mockCourses: Course[] = [
        {
          id: "1",
          title: "Technical Analysis Mastery",
          description: "Learn to read charts and identify patterns",
          lessons: 12,
          completed: Math.min(Math.floor((profile?.xp_points || 0) / 100), 12),
          progress: Math.min(Math.floor((profile?.xp_points || 0) / 100 / 12 * 100), 100),
          xpReward: 500,
          unlocked: true,
          gradient: "bg-gradient-to-br from-blue-500 to-cyan-600"
        },
        {
          id: "2",
          title: "Risk Management Fundamentals",
          description: "Protect your capital with proven strategies",
          lessons: 8,
          completed: Math.min(Math.floor((profile?.xp_points || 0) / 200), 8),
          progress: Math.min(Math.floor((profile?.xp_points || 0) / 200 / 8 * 100), 100),
          xpReward: 300,
          unlocked: true,
          gradient: "bg-gradient-to-br from-green-500 to-emerald-600"
        },
        {
          id: "3",
          title: "Advanced Trading Strategies",
          description: "Master complex trading techniques",
          lessons: 15,
          completed: Math.min(Math.floor((profile?.xp_points || 0) / 300), 15),
          progress: Math.min(Math.floor((profile?.xp_points || 0) / 300 / 15 * 100), 100),
          xpReward: 800,
          unlocked: (profile?.rank_level || 1) >= 2,
          gradient: "bg-gradient-to-br from-purple-500 to-pink-600"
        },
        {
          id: "4",
          title: "Algorithmic Trading",
          description: "Automate your trading with algorithms",
          lessons: 20,
          completed: 0,
          progress: 0,
          xpReward: 1500,
          unlocked: (profile?.rank_level || 1) >= 5,
          gradient: "bg-gradient-to-br from-orange-500 to-red-600"
        },
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
      // Award XP for completing a lesson
      const xpGain = Math.floor(courseXP / 10);
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("xp_points")
        .eq("id", userId)
        .single();

      await supabase
        .from("profiles")
        .update({ xp_points: (profile?.xp_points || 0) + xpGain })
        .eq("id", userId);

      // Post activity
      await supabase.from("friend_activities").insert({
        user_id: userId,
        activity_type: "lesson_complete",
        activity_data: { courseId, xpGain }
      });

      toast({
        title: "Lesson completed!",
        description: `+${xpGain} XP earned`,
      });

      setUserXP(prev => prev + xpGain);
      await loadData(userId);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 relative overflow-hidden">
      <FloatingNav />
      
      <div className="max-w-7xl mx-auto pt-16">
        <header className="mb-12">
          <h1 className="text-5xl font-bold mb-3 gradient-text-cyber flex items-center gap-3">
            <BookOpen className="w-12 h-12" />
            BlackBoard
          </h1>
          <p className="text-xl text-muted-foreground">
            Academy of Mastery — Your path to trading excellence
          </p>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-full">
              <Zap className="w-4 h-4 text-primary" />
              <span className="font-bold">{userXP.toLocaleString()} XP</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courses.map((course) => (
            <Card
              key={course.id}
              className={`${course.gradient} rounded-3xl p-8 relative overflow-hidden transition-all duration-300 ${
                course.unlocked ? 'hover:scale-[1.02] cursor-pointer' : 'opacity-70'
              }`}
            >
              {!course.unlocked && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-3xl">
                  <div className="text-center">
                    <Lock className="w-16 h-16 text-white/50 mx-auto mb-3" />
                    <p className="text-white/70 font-medium">Reach higher level to unlock</p>
                  </div>
                </div>
              )}
              
              <div className="relative z-[5]">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">{course.title}</h3>
                    <p className="text-white/80 text-sm">{course.description}</p>
                  </div>
                  {course.progress === 100 ? (
                    <CheckCircle className="w-8 h-8 text-white" />
                  ) : (
                    <PlayCircle className="w-8 h-8 text-white/70" />
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between text-white/90 text-sm">
                    <span>{course.completed} / {course.lessons} lessons</span>
                    <span className="font-semibold">{course.progress}%</span>
                  </div>
                  
                  <Progress value={course.progress} className="h-3 bg-white/20" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/80">
                      <Trophy className="w-4 h-4" />
                      <span className="text-sm">+{course.xpReward} XP on completion</span>
                    </div>
                  </div>

                  {course.unlocked && (
                    <Button 
                      className="w-full py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold rounded-2xl"
                      onClick={() => completeLesson(course.id, course.xpReward)}
                    >
                      {course.progress === 100 ? "Review Course" : course.progress > 0 ? "Continue Learning" : "Start Course"}
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