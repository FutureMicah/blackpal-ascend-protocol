import { FloatingNav } from "@/components/FloatingNav";
import { BookOpen, PlayCircle, CheckCircle, Lock } from "lucide-react";

const BlackBoard = () => {
  const courses = [
    {
      title: "Technical Analysis Mastery",
      progress: 75,
      lessons: 12,
      completed: 9,
      gradient: "bg-gradient-blue",
      unlocked: true
    },
    {
      title: "Risk Management Fundamentals",
      progress: 100,
      lessons: 8,
      completed: 8,
      gradient: "bg-gradient-green",
      unlocked: true
    },
    {
      title: "Advanced Trading Strategies",
      progress: 30,
      lessons: 15,
      completed: 5,
      gradient: "bg-gradient-purple",
      unlocked: true
    },
    {
      title: "Algorithmic Trading",
      progress: 0,
      lessons: 20,
      completed: 0,
      gradient: "bg-gradient-orange",
      unlocked: false
    },
  ];

  return (
    <div className="min-h-screen p-8 relative overflow-hidden">
      <FloatingNav />
      
      {/* Animated background */}
      <div className="absolute inset-0 -z-10">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-primary/20 rounded-full animate-particle blur-sm"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto">
        <header className="mb-12 animate-slide-up">
          <h1 className="text-5xl font-bold mb-3 gradient-text-cyber flex items-center gap-3">
            <BookOpen className="w-12 h-12" />
            BlackBoard
          </h1>
          <p className="text-xl text-muted-foreground">
            Academy of Mastery — Your path to trading excellence
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courses.map((course, index) => (
            <div
              key={course.title}
              className={`${course.gradient} rounded-3xl p-8 hover:scale-[1.02] transition-all duration-500 cursor-pointer shadow-depth hover:shadow-depth-xl relative overflow-hidden card-3d animate-scale-in`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {!course.unlocked && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-3xl">
                  <div className="text-center">
                    <Lock className="w-16 h-16 text-white/50 mx-auto mb-3" />
                    <p className="text-white/70 font-medium">Complete previous modules to unlock</p>
                  </div>
                </div>
              )}
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-6">
                  <h3 className="text-2xl font-bold text-white">{course.title}</h3>
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
                  
                  <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                    <div 
                      className="h-full bg-white rounded-full transition-all duration-1000 shadow-lg"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>

                  {course.unlocked && (
                    <button className="mt-4 w-full py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold rounded-2xl transition-all duration-300 hover:scale-105">
                      {course.progress === 100 ? "Review Course" : "Continue Learning"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BlackBoard;
