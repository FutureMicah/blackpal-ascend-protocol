
-- Create in-app notifications table
CREATE TABLE public.in_app_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  icon TEXT DEFAULT '🔔',
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.in_app_notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.in_app_notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete own notifications
CREATE POLICY "Users can delete own notifications"
ON public.in_app_notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Service role / triggers can insert
CREATE POLICY "System can insert notifications"
ON public.in_app_notifications
FOR INSERT
WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.in_app_notifications;

-- Index for fast lookups
CREATE INDEX idx_notifications_user_unread ON public.in_app_notifications (user_id, is_read) WHERE is_read = false;
