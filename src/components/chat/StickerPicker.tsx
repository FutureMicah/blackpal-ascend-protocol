import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface StickerPack {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  is_premium: boolean;
  price_coins: number;
}

interface StickerPickerProps {
  onSelect: (stickerId: string, stickerUrl: string) => void;
  onClose: () => void;
}

import stickerHeadphones from "@/assets/stickers/memoji-headphones.png";
import stickerWink from "@/assets/stickers/memoji-wink.png";
import stickerGhost from "@/assets/stickers/memoji-ghost.png";
import stickerInspiring from "@/assets/stickers/memoji-inspiring.png";
import stickerFingerHeart from "@/assets/stickers/memoji-finger-heart.png";
import stickerPotion from "@/assets/stickers/memoji-potion.png";
import stickerVerified from "@/assets/stickers/memoji-verified.png";
import stickerCat from "@/assets/stickers/memoji-cat.png";

// 3D Memoji-style stickers — all free, premium feel like Apple/Snapchat stickers.
const STICKER_SETS: Record<string, { id: string; url: string; name: string }[]> = {
  "Classic Emojis": [
    { id: "memoji-headphones", url: stickerHeadphones, name: "Beats" },
    { id: "memoji-wink", url: stickerWink, name: "Pink Vibes" },
    { id: "memoji-ghost", url: stickerGhost, name: "Boo Heart" },
    { id: "memoji-cat", url: stickerCat, name: "Cool Cat" },
    { id: "memoji-inspiring", url: stickerInspiring, name: "Inspiring" },
    { id: "memoji-finger-heart", url: stickerFingerHeart, name: "Love" },
    { id: "memoji-verified", url: stickerVerified, name: "Verified" },
    { id: "memoji-potion", url: stickerPotion, name: "Potion" },
  ],
  "Premium Gold": [
    { id: "memoji-verified", url: stickerVerified, name: "Verified" },
    { id: "memoji-potion", url: stickerPotion, name: "Potion" },
    { id: "memoji-inspiring", url: stickerInspiring, name: "Inspiring" },
    { id: "memoji-finger-heart", url: stickerFingerHeart, name: "Love" },
    { id: "memoji-headphones", url: stickerHeadphones, name: "Gold Beats" },
    { id: "memoji-wink", url: stickerWink, name: "Royal Wink" },
  ],
  "Trader Vibes": [
    { id: "memoji-headphones", url: stickerHeadphones, name: "Focus" },
    { id: "memoji-wink", url: stickerWink, name: "Hype" },
    { id: "memoji-ghost", url: stickerGhost, name: "Spirit" },
    { id: "memoji-cat", url: stickerCat, name: "Chill" },
    { id: "memoji-verified", url: stickerVerified, name: "Confirmed" },
    { id: "memoji-inspiring", url: stickerInspiring, name: "Visionary" },
  ],
  "Crypto Pack": [
    { id: "memoji-potion", url: stickerPotion, name: "Alchemy" },
    { id: "memoji-verified", url: stickerVerified, name: "Verified" },
    { id: "memoji-inspiring", url: stickerInspiring, name: "Inspiring" },
    { id: "memoji-finger-heart", url: stickerFingerHeart, name: "Love" },
    { id: "memoji-ghost", url: stickerGhost, name: "Anon" },
    { id: "memoji-cat", url: stickerCat, name: "Degen Cat" },
  ],
  "Reactions": [
    { id: "memoji-finger-heart", url: stickerFingerHeart, name: "Heart" },
    { id: "memoji-wink", url: stickerWink, name: "Wink" },
    { id: "memoji-cat", url: stickerCat, name: "Cool" },
    { id: "memoji-ghost", url: stickerGhost, name: "Spooky" },
    { id: "memoji-headphones", url: stickerHeadphones, name: "Vibes" },
    { id: "memoji-verified", url: stickerVerified, name: "Approved" },
  ],
  "Hype": [
    { id: "memoji-inspiring", url: stickerInspiring, name: "Power Up" },
    { id: "memoji-headphones", url: stickerHeadphones, name: "Loud" },
    { id: "memoji-potion", url: stickerPotion, name: "Magic" },
    { id: "memoji-verified", url: stickerVerified, name: "Legit" },
    { id: "memoji-wink", url: stickerWink, name: "Smooth" },
    { id: "memoji-finger-heart", url: stickerFingerHeart, name: "Love It" },
  ],
};


export const StickerPicker = ({ onSelect, onClose }: StickerPickerProps) => {
  const [packs, setPacks] = useState<StickerPack[]>([]);
  const [ownedPacks, setOwnedPacks] = useState<string[]>([]);
  const [activePack, setActivePack] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPacks();
  }, []);

  const fetchPacks = async () => {
    try {
      const { data: packsData, error: packsError } = await supabase
        .from('sticker_packs')
        .select('*');

      if (packsError) throw packsError;
      setPacks(packsData || []);

      if (packsData && packsData.length > 0) {
        setActivePack(packsData[0].name);
      }

      // Fetch owned packs
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: owned } = await supabase
          .from('user_sticker_packs')
          .select('pack_id')
          .eq('user_id', user.id);

        setOwnedPacks(owned?.map(o => o.pack_id) || []);
      }
    } catch (error) {
      console.error('Error fetching sticker packs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchasePack = async (pack: StickerPack) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to purchase sticker packs');
        return;
      }

      // Check user's virtual currency
      const { data: profile } = await supabase
        .from('profiles')
        .select('virtual_currency')
        .eq('id', user.id)
        .single();

      if (!profile || (profile.virtual_currency || 0) < pack.price_coins) {
        toast.error('Not enough coins to purchase this pack');
        return;
      }

      // Deduct coins and add pack
      await supabase
        .from('profiles')
        .update({ virtual_currency: (profile.virtual_currency || 0) - pack.price_coins })
        .eq('id', user.id);

      await supabase
        .from('user_sticker_packs')
        .insert({ user_id: user.id, pack_id: pack.id });

      setOwnedPacks(prev => [...prev, pack.id]);
      toast.success(`Purchased ${pack.name}!`);
    } catch (error) {
      console.error('Error purchasing pack:', error);
      toast.error('Failed to purchase pack');
    }
  };

  const currentPack = packs.find(p => p.name === activePack);
  const isPremiumLocked = currentPack?.is_premium && !ownedPacks.includes(currentPack?.id || '');
  const stickers = activePack ? STICKER_SETS[activePack] || [] : [];

  return (
    <div className="p-4 bg-card max-h-[350px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Stickers</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Pack Tabs */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
        {packs.map((pack) => (
          <Button
            key={pack.id}
            variant={activePack === pack.name ? "default" : "outline"}
            size="sm"
            onClick={() => setActivePack(pack.name)}
            className="whitespace-nowrap gap-2"
          >
            <span className="text-lg">{pack.thumbnail_url}</span>
            {pack.name}
          </Button>
        ))}
      </div>

      {/* Stickers Grid - all free */}
      <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto">
        {stickers.map((sticker, index) => (
          <motion.button
            key={sticker.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => onSelect(sticker.id, sticker.url)}
            className="w-16 h-16 flex items-center justify-center hover:bg-muted rounded-lg transition-colors p-1"
          >
            <img
              src={sticker.url}
              alt={sticker.name}
              className="w-full h-full object-contain"
            />
          </motion.button>
        ))}
      </div>
    </div>
  );
};
