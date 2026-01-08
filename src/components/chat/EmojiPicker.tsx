import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { motion } from "framer-motion";

const EMOJI_CATEGORIES = {
  "Smileys": ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "😮‍💨", "🤥"],
  "Gestures": ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏"],
  "Hearts": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "♥️"],
  "Trading": ["📈", "📉", "💹", "💰", "💵", "💴", "💶", "💷", "💳", "🏦", "🎰", "💎", "⚡", "🔥", "🚀", "🌙", "⭐", "🎯", "🏆", "👑"],
  "Objects": ["⌚", "📱", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "💽", "💾", "💿", "📀", "🎥", "📷", "📹", "🎬", "📺", "📻", "🎙️", "🎚️", "🎛️"],
  "Symbols": ["✅", "❌", "❓", "❗", "💯", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "⚫", "⚪", "🟤", "▶️", "⏸️", "⏹️", "⏺️", "⏭️", "⏮️"]
};

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export const EmojiPicker = ({ onSelect, onClose }: EmojiPickerProps) => {
  const [activeCategory, setActiveCategory] = useState<string>("Smileys");

  return (
    <div className="p-3 sm:p-4 bg-card max-h-[250px] sm:max-h-[300px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Emojis</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Categories */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
        {Object.keys(EMOJI_CATEGORIES).map((category) => (
          <Button
            key={category}
            variant={activeCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(category)}
            className="whitespace-nowrap"
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Emojis Grid */}
      <div className="grid grid-cols-6 sm:grid-cols-8 gap-1 max-h-[140px] sm:max-h-[180px] overflow-y-auto">
        {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].map((emoji, index) => (
          <motion.button
            key={emoji}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.01 }}
            onClick={() => onSelect(emoji)}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-xl sm:text-2xl hover:bg-muted rounded-lg transition-colors"
          >
            {emoji}
          </motion.button>
        ))}
      </div>
    </div>
  );
};
