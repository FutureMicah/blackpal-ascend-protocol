-- Add message_type and media fields to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'text',
ADD COLUMN IF NOT EXISTS media_url text,
ADD COLUMN IF NOT EXISTS media_type text,
ADD COLUMN IF NOT EXISTS sticker_id text,
ADD COLUMN IF NOT EXISTS gif_url text,
ADD COLUMN IF NOT EXISTS voice_url text,
ADD COLUMN IF NOT EXISTS video_url text,
ADD COLUMN IF NOT EXISTS duration_seconds integer,
ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.messages(id);

-- Create sticker packs table
CREATE TABLE IF NOT EXISTS public.sticker_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  thumbnail_url text,
  is_premium boolean DEFAULT false,
  price_coins integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Create stickers table
CREATE TABLE IF NOT EXISTS public.stickers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid REFERENCES public.sticker_packs(id) ON DELETE CASCADE,
  name text NOT NULL,
  image_url text NOT NULL,
  emoji_shortcode text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create user owned sticker packs
CREATE TABLE IF NOT EXISTS public.user_sticker_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pack_id uuid REFERENCES public.sticker_packs(id) ON DELETE CASCADE,
  purchased_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, pack_id)
);

-- Enable RLS
ALTER TABLE public.sticker_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sticker_packs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view sticker packs" ON public.sticker_packs FOR SELECT USING (true);
CREATE POLICY "Anyone can view stickers" ON public.stickers FOR SELECT USING (true);
CREATE POLICY "Users can view their sticker packs" ON public.user_sticker_packs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can purchase sticker packs" ON public.user_sticker_packs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insert default sticker packs
INSERT INTO public.sticker_packs (name, description, thumbnail_url, is_premium, price_coins) VALUES
('Classic Emojis', 'Essential emoji stickers', '😀', false, 0),
('Premium Gold', 'Exclusive gold animated stickers', '✨', true, 500),
('Trader Vibes', 'Trading and finance themed stickers', '📈', true, 300),
('Crypto Pack', 'Cryptocurrency themed stickers', '₿', true, 400)
ON CONFLICT DO NOTHING;