
-- Payment proofs table
CREATE TABLE public.payment_proofs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can upload own proofs" ON public.payment_proofs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own proofs" ON public.payment_proofs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all proofs" ON public.payment_proofs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update proofs" ON public.payment_proofs
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin broadcast messages table (admin sends, all users read)
CREATE TABLE public.admin_broadcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view broadcasts" ON public.admin_broadcasts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can create broadcasts" ON public.admin_broadcasts
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete broadcasts" ON public.admin_broadcasts
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Group chat rooms
CREATE TABLE public.group_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by UUID NOT NULL,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.group_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public groups" ON public.group_chats
  FOR SELECT TO authenticated USING (is_public = true);

CREATE POLICY "Admins can create groups" ON public.group_chats
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Group chat members
CREATE TABLE public.group_chat_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.group_chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE public.group_chat_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group members" ON public.group_chat_members
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.group_chat_members gcm WHERE gcm.group_id = group_chat_members.group_id AND gcm.user_id = auth.uid())
  );

CREATE POLICY "Users can join public groups" ON public.group_chat_members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Group chat messages
CREATE TABLE public.group_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.group_chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  reply_to_id UUID REFERENCES public.group_messages(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view messages" ON public.group_messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.group_chat_members gcm WHERE gcm.group_id = group_messages.group_id AND gcm.user_id = auth.uid())
  );

CREATE POLICY "Group members can send messages" ON public.group_messages
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (SELECT 1 FROM public.group_chat_members gcm WHERE gcm.group_id = group_messages.group_id AND gcm.user_id = auth.uid())
  );

-- Enable realtime for broadcast and group messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_broadcasts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
