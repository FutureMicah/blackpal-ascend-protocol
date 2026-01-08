import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

// Trending GIFs (placeholder - in production, use GIPHY/Tenor API)
const TRENDING_GIFS = [
  { id: "1", url: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif", title: "Thumbs Up" },
  { id: "2", url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif", title: "Mind Blown" },
  { id: "3", url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif", title: "Celebrate" },
  { id: "4", url: "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif", title: "Clapping" },
  { id: "5", url: "https://media.giphy.com/media/l0MYGzh7pUHl8kllC/giphy.gif", title: "Dancing" },
  { id: "6", url: "https://media.giphy.com/media/3oz8xIsloV7zOmt81G/giphy.gif", title: "Money" },
  { id: "7", url: "https://media.giphy.com/media/l4pTdcifPZLpDjL1e/giphy.gif", title: "Shocked" },
  { id: "8", url: "https://media.giphy.com/media/26BRBKqUiq586bRVm/giphy.gif", title: "Success" },
  { id: "9", url: "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif", title: "To The Moon" },
  { id: "10", url: "https://media.giphy.com/media/l46Cy1rHbQ92uuLXa/giphy.gif", title: "Fire" },
  { id: "11", url: "https://media.giphy.com/media/3oKIPjzfv0sI2p7fDW/giphy.gif", title: "Stonks" },
  { id: "12", url: "https://media.giphy.com/media/l0HlOBZcl7sbMPvyI/giphy.gif", title: "Chart" },
];

const CATEGORY_GIFS: Record<string, typeof TRENDING_GIFS> = {
  "Reactions": [
    { id: "r1", url: "https://media.giphy.com/media/26gsspfbt1HfVQ9va/giphy.gif", title: "LOL" },
    { id: "r2", url: "https://media.giphy.com/media/l4FGuhL4U2WyjdkaY/giphy.gif", title: "Shocked" },
    { id: "r3", url: "https://media.giphy.com/media/1oJLpejP9jEvWQlZj4/giphy.gif", title: "Happy" },
    { id: "r4", url: "https://media.giphy.com/media/3og0INyCmHlNylks9O/giphy.gif", title: "Sad" },
  ],
  "Trading": [
    { id: "t1", url: "https://media.giphy.com/media/YnkMcHgNIMW4Yfmjxr/giphy.gif", title: "Stonks" },
    { id: "t2", url: "https://media.giphy.com/media/trN9ht5RlE3Dcwavg2/giphy.gif", title: "Bull" },
    { id: "t3", url: "https://media.giphy.com/media/67ThRZlYBvibtdF9JH/giphy.gif", title: "Bear" },
    { id: "t4", url: "https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif", title: "Moon" },
  ],
  "Celebrations": [
    { id: "c1", url: "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif", title: "Confetti" },
    { id: "c2", url: "https://media.giphy.com/media/l0MYJnJQ4EiYLxvQ4/giphy.gif", title: "Dance" },
    { id: "c3", url: "https://media.giphy.com/media/26tOZ42Mg6pbTUPHW/giphy.gif", title: "Win" },
    { id: "c4", url: "https://media.giphy.com/media/3oz9ZE2Oo9zRC/giphy.gif", title: "Victory" },
  ],
};

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

export const GifPicker = ({ onSelect, onClose }: GifPickerProps) => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const displayGifs = activeCategory
    ? CATEGORY_GIFS[activeCategory] || []
    : TRENDING_GIFS;

  const filteredGifs = search
    ? displayGifs.filter(gif =>
        gif.title.toLowerCase().includes(search.toLowerCase())
      )
    : displayGifs;

  return (
    <div className="p-3 sm:p-4 bg-card max-h-[300px] sm:max-h-[350px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">GIFs</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search GIFs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
        <Button
          variant={activeCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveCategory(null)}
          className="gap-2"
        >
          <TrendingUp className="h-3 w-3" />
          Trending
        </Button>
        {Object.keys(CATEGORY_GIFS).map((category) => (
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

      {/* GIFs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[160px] sm:max-h-[200px] overflow-y-auto">
        {filteredGifs.map((gif, index) => (
          <motion.button
            key={gif.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => onSelect(gif.url)}
            className="aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all"
          >
            <img
              src={gif.url}
              alt={gif.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </motion.button>
        ))}
      </div>

      {filteredGifs.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No GIFs found
        </div>
      )}
    </div>
  );
};
