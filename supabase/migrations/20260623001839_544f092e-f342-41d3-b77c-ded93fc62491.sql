
GRANT SELECT ON public.academy_courses TO anon, authenticated;
GRANT ALL ON public.academy_courses TO service_role;

GRANT SELECT ON public.academy_lessons TO anon, authenticated;
GRANT ALL ON public.academy_lessons TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_enrollments TO authenticated;
GRANT ALL ON public.class_enrollments TO service_role;

GRANT SELECT ON public.class_live_sessions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.class_live_sessions TO authenticated;
GRANT ALL ON public.class_live_sessions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_chat_messages TO authenticated;
GRANT ALL ON public.class_chat_messages TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_chat_roles TO authenticated;
GRANT ALL ON public.class_chat_roles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_chat_announcements TO authenticated;
GRANT ALL ON public.class_chat_announcements TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_lesson_progress TO authenticated;
GRANT ALL ON public.class_lesson_progress TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_session_attendance TO authenticated;
GRANT ALL ON public.class_session_attendance TO service_role;
