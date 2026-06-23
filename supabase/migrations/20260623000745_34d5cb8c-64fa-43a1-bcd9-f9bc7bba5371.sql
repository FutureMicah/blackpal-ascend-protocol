
ALTER TABLE public.academy_courses ADD COLUMN IF NOT EXISTS rules TEXT;

DO $$ BEGIN
  CREATE TYPE public.class_role AS ENUM ('mentor','moderator','student','muted','banned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.class_chat_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.class_role NOT NULL DEFAULT 'student',
  assigned_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_chat_roles TO authenticated;
GRANT ALL ON public.class_chat_roles TO service_role;
ALTER TABLE public.class_chat_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "class_roles_read_enrolled" ON public.class_chat_roles
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.class_enrollments e
               WHERE e.course_id = class_chat_roles.course_id AND e.user_id = auth.uid())
  );
CREATE POLICY "class_roles_admin_write" ON public.class_chat_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.is_class_staff(_course_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id,'admin')
      OR EXISTS (SELECT 1 FROM public.class_chat_roles
                  WHERE course_id=_course_id AND user_id=_user_id AND role IN ('mentor','moderator'))
      OR EXISTS (SELECT 1 FROM public.academy_courses
                  WHERE id=_course_id AND instructor_id=_user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_class_member(_course_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_class_staff(_course_id,_user_id)
      OR EXISTS (SELECT 1 FROM public.class_enrollments
                  WHERE course_id=_course_id AND user_id=_user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_class_muted(_course_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.class_chat_roles
                  WHERE course_id=_course_id AND user_id=_user_id AND role IN ('muted','banned'));
$$;

CREATE TABLE IF NOT EXISTS public.class_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.class_live_sessions(id) ON DELETE SET NULL,
  sender_id UUID NOT NULL,
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  media_url TEXT,
  media_type TEXT,
  duration_seconds INTEGER,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  reply_to UUID REFERENCES public.class_chat_messages(id) ON DELETE SET NULL,
  reactions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_class_chat_course_time ON public.class_chat_messages(course_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_class_chat_session ON public.class_chat_messages(session_id, created_at DESC) WHERE session_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_chat_messages TO authenticated;
GRANT ALL ON public.class_chat_messages TO service_role;
ALTER TABLE public.class_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "class_chat_read_members" ON public.class_chat_messages
  FOR SELECT TO authenticated USING (public.is_class_member(course_id, auth.uid()));
CREATE POLICY "class_chat_post_members" ON public.class_chat_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid()
    AND public.is_class_member(course_id, auth.uid())
    AND NOT public.is_class_muted(course_id, auth.uid())
  );
CREATE POLICY "class_chat_edit_own_or_staff" ON public.class_chat_messages
  FOR UPDATE TO authenticated USING (sender_id = auth.uid() OR public.is_class_staff(course_id, auth.uid()));
CREATE POLICY "class_chat_delete_own_or_staff" ON public.class_chat_messages
  FOR DELETE TO authenticated USING (sender_id = auth.uid() OR public.is_class_staff(course_id, auth.uid()));

CREATE TABLE IF NOT EXISTS public.class_chat_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.class_live_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  send_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_chat_announcements TO authenticated;
GRANT ALL ON public.class_chat_announcements TO service_role;
ALTER TABLE public.class_chat_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ann_read_members" ON public.class_chat_announcements
  FOR SELECT TO authenticated USING (public.is_class_member(course_id, auth.uid()));
CREATE POLICY "ann_write_staff" ON public.class_chat_announcements
  FOR ALL TO authenticated
  USING (public.is_class_staff(course_id, auth.uid()))
  WITH CHECK (public.is_class_staff(course_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.notify_class_event(
  p_course_id UUID, p_title TEXT, p_message TEXT,
  p_icon TEXT DEFAULT '📚', p_type TEXT DEFAULT 'info'
) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INTEGER := 0;
BEGIN
  IF NOT public.is_class_staff(p_course_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only class staff can send class notifications';
  END IF;
  INSERT INTO public.in_app_notifications (user_id, title, message, type, icon, action_url)
  SELECT e.user_id, p_title, p_message, p_type, p_icon, '/classes'
  FROM public.class_enrollments e WHERE e.course_id = p_course_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

CREATE OR REPLACE FUNCTION public.tg_class_session_went_live()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_title TEXT; v_msg TEXT;
BEGIN
  IF NEW.is_live = true AND COALESCE(OLD.is_live, false) = false AND NEW.course_id IS NOT NULL THEN
    v_title := '🔴 ' || COALESCE(NEW.host_name,'Your mentor') || ' is LIVE';
    v_msg := COALESCE(NEW.title,'Live class') || ' just started. Tap to join the stream and class chat now!';
    INSERT INTO public.in_app_notifications (user_id, title, message, type, icon, action_url)
    SELECT e.user_id, v_title, v_msg, 'success', '🔴', '/classes'
    FROM public.class_enrollments e WHERE e.course_id = NEW.course_id;

    IF NEW.created_by IS NOT NULL THEN
      INSERT INTO public.class_chat_messages (course_id, session_id, sender_id, content, message_type)
      VALUES (NEW.course_id, NEW.id, NEW.created_by, '🔴 Live stream started — join now!', 'system');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_class_session_went_live ON public.class_live_sessions;
CREATE TRIGGER trg_class_session_went_live
AFTER UPDATE OF is_live ON public.class_live_sessions
FOR EACH ROW EXECUTE FUNCTION public.tg_class_session_went_live();

ALTER PUBLICATION supabase_realtime ADD TABLE public.class_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.class_chat_announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.class_chat_roles;
