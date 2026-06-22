
-- Extend academy_courses
ALTER TABLE public.academy_courses 
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'beginner',
  ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS instructor_name TEXT,
  ADD COLUMN IF NOT EXISTS price_btax INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xp_reward INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::text[];

ALTER TABLE public.academy_lessons
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS resource_url TEXT;

-- Enrollments
CREATE TABLE IF NOT EXISTS public.class_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  progress_percent INTEGER NOT NULL DEFAULT 0,
  paid_btax INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, course_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_enrollments TO authenticated;
GRANT ALL ON public.class_enrollments TO service_role;
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enroll_own_select" ON public.class_enrollments FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "enroll_own_insert" ON public.class_enrollments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "enroll_own_update" ON public.class_enrollments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "enroll_admin_all" ON public.class_enrollments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Lesson progress
CREATE TABLE IF NOT EXISTS public.class_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.academy_lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  watch_seconds INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_lesson_progress TO authenticated;
GRANT ALL ON public.class_lesson_progress TO service_role;
ALTER TABLE public.class_lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lp_own_all" ON public.class_lesson_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lp_admin_select" ON public.class_lesson_progress FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Live sessions
CREATE TABLE IF NOT EXISTS public.class_live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  stream_url TEXT,
  replay_url TEXT,
  host_name TEXT,
  is_live BOOLEAN NOT NULL DEFAULT false,
  attendees_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.class_live_sessions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.class_live_sessions TO authenticated;
GRANT ALL ON public.class_live_sessions TO service_role;
ALTER TABLE public.class_live_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live_public_read" ON public.class_live_sessions FOR SELECT USING (true);
CREATE POLICY "live_admin_write" ON public.class_live_sessions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Live attendance log
CREATE TABLE IF NOT EXISTS public.class_session_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.class_live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);
GRANT SELECT, INSERT ON public.class_session_attendance TO authenticated;
GRANT ALL ON public.class_session_attendance TO service_role;
ALTER TABLE public.class_session_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "att_self_insert" ON public.class_session_attendance FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "att_self_select" ON public.class_session_attendance FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Allow public to read published courses + lessons for Browse
DROP POLICY IF EXISTS "courses_public_read" ON public.academy_courses;
CREATE POLICY "courses_public_read" ON public.academy_courses FOR SELECT USING (is_published = true);
GRANT SELECT ON public.academy_courses TO anon;
GRANT SELECT ON public.academy_lessons TO anon;

-- updated_at trigger for live sessions
CREATE OR REPLACE FUNCTION public.tg_class_live_sessions_updated() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS class_live_sessions_updated_at ON public.class_live_sessions;
CREATE TRIGGER class_live_sessions_updated_at BEFORE UPDATE ON public.class_live_sessions
  FOR EACH ROW EXECUTE FUNCTION public.tg_class_live_sessions_updated();

-- Auto-update enrollment progress when lesson completed
CREATE OR REPLACE FUNCTION public.tg_update_enrollment_progress() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE total INT; done INT;
BEGIN
  SELECT COUNT(*) INTO total FROM public.academy_lessons WHERE course_id = NEW.course_id;
  SELECT COUNT(*) INTO done FROM public.class_lesson_progress
    WHERE course_id = NEW.course_id AND user_id = NEW.user_id AND completed = true;
  IF total > 0 THEN
    UPDATE public.class_enrollments
      SET progress_percent = LEAST(100, (done * 100 / total)),
          completed_at = CASE WHEN done >= total THEN now() ELSE NULL END
      WHERE user_id = NEW.user_id AND course_id = NEW.course_id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS class_lesson_progress_rollup ON public.class_lesson_progress;
CREATE TRIGGER class_lesson_progress_rollup AFTER INSERT OR UPDATE ON public.class_lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.tg_update_enrollment_progress();
