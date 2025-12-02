-- Create friend activity feed table
CREATE TABLE public.friend_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL, -- 'achievement', 'level_up', 'streak', 'profile_update', 'payment', 'milestone'
  activity_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.friend_activities ENABLE ROW LEVEL SECURITY;

-- Users can insert their own activities
CREATE POLICY "Users can insert their own activities"
ON public.friend_activities
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view activities from their friends or themselves
CREATE POLICY "Users can view friend activities"
ON public.friend_activities
FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM friend_connections
    WHERE (
      (friend_connections.user_id = auth.uid() AND friend_connections.friend_id = friend_activities.user_id)
      OR
      (friend_connections.friend_id = auth.uid() AND friend_connections.user_id = friend_activities.user_id)
    )
    AND friend_connections.status = 'accepted'
  )
);

-- Enable realtime for friend activities
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_activities;

-- Create index for faster queries
CREATE INDEX idx_friend_activities_user_id ON public.friend_activities(user_id);
CREATE INDEX idx_friend_activities_created_at ON public.friend_activities(created_at DESC);