CREATE TABLE public.class_analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  course_id UUID,
  session_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewport_width INTEGER,
  viewport_height INTEGER,
  orientation TEXT,
  breakpoint TEXT,
  user_agent TEXT,
  duration_ms INTEGER,
  retry_count INTEGER DEFAULT 0,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT INSERT, SELECT ON public.class_analytics_events TO authenticated;
GRANT ALL ON public.class_analytics_events TO service_role;

ALTER TABLE public.class_analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own analytics events"
  ON public.class_analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Admins can read all analytics events"
  ON public.class_analytics_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_class_analytics_event_type ON public.class_analytics_events(event_type);
CREATE INDEX idx_class_analytics_session ON public.class_analytics_events(session_id);
CREATE INDEX idx_class_analytics_course ON public.class_analytics_events(course_id);
CREATE INDEX idx_class_analytics_created ON public.class_analytics_events(created_at DESC);