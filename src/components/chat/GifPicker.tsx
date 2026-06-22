import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

type Gif = { id: string; url: string; title: string };

const g = (id: string, hash: string, title: string): Gif => ({
  id,
  url: `https://media.giphy.com/media/${hash}/giphy.gif`,
  title,
});

const TRENDING: Gif[] = [
  g("tr1", "3oEjI6SIIHBdRxXI40", "Thumbs Up"),
  g("tr2", "l0MYt5jPR6QX5pnqM", "Mind Blown"),
  g("tr3", "3o7abKhOpu0NwenH3O", "Celebrate"),
  g("tr4", "26u4cqiYI30juCOGY", "Clapping"),
  g("tr5", "l0MYGzh7pUHl8kllC", "Dancing"),
  g("tr6", "3oz8xIsloV7zOmt81G", "Money Rain"),
  g("tr7", "l4pTdcifPZLpDjL1e", "Shocked"),
  g("tr8", "26BRBKqUiq586bRVm", "Success"),
  g("tr9", "xT0xeJpnrWC4XWblEk", "To The Moon"),
  g("tr10", "l46Cy1rHbQ92uuLXa", "Fire"),
  g("tr11", "3oKIPjzfv0sI2p7fDW", "Stonks"),
  g("tr12", "l0HlOBZcl7sbMPvyI", "Chart"),
];

const CATEGORIES: Record<string, Gif[]> = {
  Reactions: [
    g("re1", "26gsspfbt1HfVQ9va", "LOL"),
    g("re2", "l4FGuhL4U2WyjdkaY", "Shocked"),
    g("re3", "1oJLpejP9jEvWQlZj4", "Happy"),
    g("re4", "3og0INyCmHlNylks9O", "Sad"),
    g("re5", "ToMjGpx9F5ktZw8qPUQ", "Eye Roll"),
    g("re6", "3o6Zt0hNCfak3QCqsw", "Yes"),
    g("re7", "26tn33aiTi1jkl6H6", "No Way"),
    g("re8", "26gsbpQuw1Yn3SQuQ", "Wow"),
  ],
  Trading: [
    g("td1", "YnkMcHgNIMW4Yfmjxr", "Stonks"),
    g("td2", "trN9ht5RlE3Dcwavg2", "Bull"),
    g("td3", "67ThRZlYBvibtdF9JH", "Bear"),
    g("td4", "xT9IgzoKnwFNmISR8I", "Moon"),
    g("td5", "l0HUgsm6FjeJZ7Q3K", "Pump"),
    g("td6", "3o7TKMt1VVNkHV2PaE", "Money Print"),
    g("td7", "MT5UUV1d4CXE2A37Dg", "Rocket"),
    g("td8", "26FPq7s8b8FCfjlpu", "Cash"),
  ],
  Celebrations: [
    g("ce1", "g9582DNuQppxC", "Confetti"),
    g("ce2", "l0MYJnJQ4EiYLxvQ4", "Dance"),
    g("ce3", "26tOZ42Mg6pbTUPHW", "Win"),
    g("ce4", "3oz9ZE2Oo9zRC", "Victory"),
    g("ce5", "26AHONQ79FdWZhAI0", "Party"),
    g("ce6", "26ufdipQqU2lhNA4g", "Trophy"),
    g("ce7", "26gsuDqMo2GzeIDP2", "Cheers"),
    g("ce8", "l0HlBO7eyXzSZkJri", "Fireworks"),
  ],
  Approval: [
    g("ap1", "111ebonMs90YLu", "Yes"),
    g("ap2", "26FPJGjhefSJuaRhu", "OK"),
    g("ap3", "l0HlNQ03J5JxX6lva", "Nice"),
    g("ap4", "l3q2K5jinAlChoCLS", "Thumbs"),
    g("ap5", "1g2cBmqA7s4cAVR2vY", "Perfect"),
    g("ap6", "l0HU7JI5pP6yyDqWQ", "Bravo"),
  ],
  Hype: [
    g("hy1", "3oz8xAFtqoOUUrsh7W", "Hyped"),
    g("hy2", "l1J3GIXk9R5RYxJ3i", "Let's go"),
    g("hy3", "l0HlvtIPzPdt2usKs", "Fire"),
    g("hy4", "Sb3y8sWFNc1z53y9P5", "Energy"),
    g("hy5", "l0Iy9eyEYxJ0Q5JX6", "Boom"),
    g("hy6", "3ohzdYJK1wAdPWVk88", "Pumped"),
  ],
  Confused: [
    g("co1", "3oEjI8c64hUUI3MtLG", "Confused"),
    g("co2", "l4Ki2obCyAQS5WhFe", "Huh"),
    g("co3", "3o6gE5o6JNxYUyJxNm", "Wat"),
    g("co4", "BmmfETghGOPrW", "Thinking"),
  ],
  Sad: [
    g("sa1", "L95W4wv8nnb9K", "Tears"),
    g("sa2", "OPU6wzx8JrHna", "Crying"),
    g("sa3", "ROF8OQvDmxytW", "Sad"),
    g("sa4", "d2lcHJTG5Tscg", "Heartbreak"),
  ],
  Greetings: [
    g("gr1", "xT0xezQGU5xCDJuCPe", "Hello"),
    g("gr2", "3o6Zt481isNVuQI1l6", "Hi"),
    g("gr3", "26FPq3KGq3WpYpJW0", "Wave"),
    g("gr4", "l0MYsZBGMmRJ47R0Y", "Bye"),
  ],
};

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

export const GifPicker = ({ onSelect, onClose }: GifPickerProps) => {
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<string | null>(null);

  const gifs = useMemo(() => {
    const base = active ? CATEGORIES[active] : TRENDING;
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    const allPool = [...TRENDING, ...Object.values(CATEGORIES).flat()];
    return allPool.filter(x => x.title.toLowerCase().includes(q));
  }, [active, search]);

  return (
    <div className="p-3 bg-card max-h-[380px] flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">GIFs</h3>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input placeholder="Search GIFs…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
      </div>
      <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
        <Button size="sm" variant={active === null ? "default" : "outline"} onClick={() => setActive(null)} className="gap-1 h-7 text-[10px] px-2">
          <TrendingUp className="h-3 w-3" />Trending
        </Button>
        {Object.keys(CATEGORIES).map(c => (
          <Button key={c} size="sm" variant={active === c ? "default" : "outline"}
            onClick={() => setActive(c)} className="whitespace-nowrap h-7 text-[10px] px-2">{c}</Button>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto flex-1">
        {gifs.map((gif, i) => (
          <motion.button key={gif.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(i * 0.02, 0.3) }}
            onClick={() => onSelect(gif.url)}
            className="aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all bg-muted">
            <img src={gif.url} alt={gif.title} className="w-full h-full object-cover" loading="lazy" />
          </motion.button>
        ))}
        {gifs.length === 0 && <p className="col-span-full text-center text-xs text-muted-foreground py-6">No GIFs found</p>}
      </div>
    </div>
  );
};
