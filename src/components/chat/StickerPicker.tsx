import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Lock, Crown } from "lucide-react";
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

// Premium animated sticker URLs (placeholder - in production, store in DB)
const STICKER_SETS: Record<string, { id: string; url: string; name: string }[]> = {
  "Classic Emojis": [
    { id: "classic-1", url: "https://em-content.zobj.net/source/animated-noto-color-emoji/356/grinning-face_1f600.gif", name: "Grinning" },
    { id: "classic-2", url: "https://em-content.zobj.net/source/animated-noto-color-emoji/356/face-with-tears-of-joy_1f602.gif", name: "Joy" },
    { id: "classic-3", url: "https://em-content.zobj.net/source/animated-noto-color-emoji/356/smiling-face-with-heart-eyes_1f60d.gif", name: "Heart Eyes" },
    { id: "classic-4", url: "https://em-content.zobj.net/source/animated-noto-color-emoji/356/thinking-face_1f914.gif", name: "Thinking" },
    { id: "classic-5", url: "https://em-content.zobj.net/source/animated-noto-color-emoji/356/fire_1f525.gif", name: "Fire" },
    { id: "classic-6", url: "https://em-content.zobj.net/source/animated-noto-color-emoji/356/thumbs-up_1f44d.gif", name: "Thumbs Up" },
    { id: "classic-7", url: "https://em-content.zobj.net/source/animated-noto-color-emoji/356/party-popper_1f389.gif", name: "Party" },
    { id: "classic-8", url: "https://em-content.zobj.net/source/animated-noto-color-emoji/356/red-heart_2764-fe0f.gif", name: "Heart" },
  ],
  "Premium Gold": [
    { id: "gold-1", url: "https://em-content.zobj.net/source/animated-noto-color-emoji/356/star_2b50.gif", name: "Star" },
    { id: "gold-2", url: "https://em-content.zobj.net/source/animated-noto-color-emoji/356/crown_1f451.gif", name: "Crown" },
    { id: "gold-3", url: "https://em-content.zobj.net/source/animated-noto-color-emoji/356/trophy_1f3c6.gif", name: "Trophy" },
    { id: "gold-4", url: "https://em-content.zobj.net/source/animated-noto-color-emoji/356/gem-stone_1f48e.gif", name: "Diamond" },
    { id: "gold-5", url: "https://em-content.zobj.net/source/animated-noto-color-emoji/356/money-bag_1f4b0.gif", name: "Money Bag" },
    { id: "gold-6", url: "https://em-content.zobj.net/source/animated-noto-color-emoji/356/sparkles_2728.gif", name: "Sparkles" },
  ],
  "Trader Vibes": [
    { id: "trader-1", url: "https://em-content.zobj.net/source/animated-noto-color-emoji/356/chart-increasing_1f4c8.gif", name: "Bull" },
    { id: "trader-2", url: "https://em-content.zobj.net/source/animated-noto-color-emoji/356/chart-decreasing_1f4c9.gif", name: "Bear" },
    { id: "trader-3", url: "https://em-content.zobj.net/source/animated-noto-color-emoji/356/rocket_1f680.gif", name: "Rocket" },
    { id: "trader-4", url: "https://em-content.zobj.net/source/animated-noto-color-emoji/356/money-with-wings_1f4b8.gif", name: "Money Wings" },
  ],
  "Crypto Pack": [
    { id: "crypto-1", url: "https://em-content.zobj.net/source/animated-noto-color-emoji/356/coin_1fa99.gif", name: "Coin" },
    { id: "crypto-2", url: "https://em-content.zobj.net/source/animated-noto-color-emoji/356/high-voltage_26a1.gif", name: "Lightning" },
    { id: "crypto-3", url: "https://em-content.zobj.net/source/animated-noto-color-emoji/356/full-moon_1f315.gif", name: "Moon" },
    { id: "crypto-4", url: "https://em-content.zobj.net/source/animated-noto-color-emoji/356/slot-machine_1f3b0.gif", name: "Gamble" },
  ]
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
            {pack.is_premium && !ownedPacks.includes(pack.id) && (
              <Crown className="h-3 w-3 text-yellow-500" />
            )}
          </Button>
        ))}
      </div>

      {/* Stickers Grid */}
      {isPremiumLocked ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Lock className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-2">Premium Pack</p>
          <Badge variant="secondary" className="mb-4">
            {currentPack?.price_coins} coins
          </Badge>
          <Button onClick={() => currentPack && handlePurchasePack(currentPack)}>
            <Crown className="h-4 w-4 mr-2" />
            Unlock Pack
          </Button>
        </div>
      ) : (
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
      )}
    </div>
  );
};
