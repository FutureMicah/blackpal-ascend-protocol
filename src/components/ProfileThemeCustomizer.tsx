import { motion } from "framer-motion";
import { X, Palette, Type, Layout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";

export type ProfileTheme = {
  background: string;
  font: string;
  layout: string;
  accentColor: string;
};

interface ProfileThemeCustomizerProps {
  currentTheme: ProfileTheme;
  onSave: (theme: ProfileTheme) => void;
  onClose: () => void;
}

// Broadcast a live preview to any listening surface (PublicProfile, NFTProfileCard, etc.)
export const emitThemePreview = (theme: ProfileTheme | null) => {
  window.dispatchEvent(new CustomEvent("blackpal:theme-preview", { detail: theme }));
};

const backgrounds = [
  { id: "default", name: "Default", preview: "bg-gradient-to-br from-background to-background border" },
  { id: "dark", name: "Dark Night", preview: "bg-gradient-to-br from-gray-900 to-black" },
  // African aesthetic presets
  { id: "afro-savanna", name: "Savanna Sun", preview: "bg-gradient-to-t from-[#1a0a05] via-[#f06a1f] to-[#ffb04a]" },
  { id: "afro-tribal",  name: "Tribal Onyx", preview: "bg-gradient-to-br from-[#1a0f08] via-[#3a1f0c] to-[#5c2e10]" },
  { id: "afro-clay",    name: "Clay Heritage", preview: "bg-gradient-to-br from-[#f5e9d4] via-[#e8c79a] to-[#b97840]" },
  { id: "afro-ankara",  name: "Ankara Bloom", preview: "bg-gradient-to-br from-[#0a2818] via-[#c47a2b] to-[#1a0a05]" },
  { id: "heritage-frost", name: "Heritage Frost", preview: "bg-gradient-to-br from-sky-100 via-white to-amber-100" },
  { id: "liquid-glass", name: "Liquid Glass", preview: "bg-gradient-to-br from-sky-200 via-white to-slate-200" },
  { id: "royal-blue", name: "Royal Blue", preview: "theme-pattern theme-bg-royal-blue" },
  { id: "royal-purple", name: "Royal Purple", preview: "theme-pattern theme-bg-royal-purple" },
  { id: "emerald", name: "Emerald Heritage", preview: "theme-pattern theme-bg-emerald" },
  { id: "royal-gold", name: "Royal Gold", preview: "theme-pattern theme-bg-royal-gold" },
  { id: "rose", name: "Rose Crown", preview: "theme-pattern theme-bg-rose" },
  { id: "purple", name: "Purple Dream", preview: "bg-gradient-to-br from-purple-900 to-indigo-900" },
  { id: "ocean", name: "Ocean Blue", preview: "bg-gradient-to-br from-blue-900 to-cyan-900" },
  { id: "sunset", name: "Sunset", preview: "bg-gradient-to-br from-orange-900 to-red-900" },
  { id: "forest", name: "Forest", preview: "bg-gradient-to-br from-green-900 to-emerald-900" },
];

const fonts = [
  { id: "inter", name: "Inter", class: "font-sans" },
  { id: "playfair", name: "Playfair Display", class: "font-serif" },
  { id: "mono", name: "Monospace", class: "font-mono" },
  { id: "raleway", name: "Raleway", class: "font-sans" },
];

const layouts = [
  { id: "standard", name: "Standard", desc: "Classic two-column layout" },
  { id: "centered", name: "Centered", desc: "Single centered column" },
  { id: "minimal", name: "Minimal", desc: "Clean and spacious" },
];

const accentColors = [
  { id: "purple", name: "Purple", color: "hsl(280, 100%, 70%)" },
  { id: "blue", name: "Blue", color: "hsl(217, 91%, 60%)" },
  { id: "green", name: "Green", color: "hsl(142, 71%, 45%)" },
  { id: "orange", name: "Orange", color: "hsl(25, 95%, 53%)" },
  { id: "pink", name: "Pink", color: "hsl(330, 81%, 60%)" },
  { id: "cyan", name: "Cyan", color: "hsl(189, 85%, 43%)" },
  { id: "amber", name: "Amber", color: "hsl(38, 92%, 50%)" },
  { id: "earth", name: "Earth Clay", color: "hsl(28, 65%, 45%)" },
];

export const ProfileThemeCustomizer = ({
  currentTheme,
  onSave,
  onClose,
}: ProfileThemeCustomizerProps) => {
  const [theme, setTheme] = useState<ProfileTheme>(currentTheme);

  // Live preview: throttle emissions through rAF so dragging colour swatches
  // doesn't queue dozens of state updates per frame on low-end phones.
  useEffect(() => {
    let raf = 0;
    raf = requestAnimationFrame(() => emitThemePreview(theme));
    return () => cancelAnimationFrame(raf);
  }, [theme]);

  // Always clear the preview when the customizer leaves the tree, no matter
  // how it was dismissed (save, cancel, escape, route change).
  useEffect(() => {
    return () => emitThemePreview(null);
  }, []);

  const handleSave = () => {
    onSave(theme);
    emitThemePreview(null);
    // Tell GlobalThemeProvider to re-fetch the persisted theme so it themes
    // the whole app immediately after save (incl. African presets).
    window.dispatchEvent(new CustomEvent("blackpal:theme-saved"));
    onClose();
  };

  const handleCancel = () => {
    // Reset to persisted theme immediately before closing.
    setTheme(currentTheme);
    emitThemePreview(null);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/95 backdrop-blur-lg"
      onClick={handleCancel}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-primary/30 bg-card/90 backdrop-blur-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-bold">Customize Your Theme</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={handleCancel}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Background */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Background
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {backgrounds.map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => setTheme({ ...theme, background: bg.id })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    theme.background === bg.id
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className={`h-16 rounded-md mb-2 overflow-hidden relative ${bg.preview}`} />
                  <p className="text-sm font-medium">{bg.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Font */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Type className="w-4 h-4" />
              Font Family
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {fonts.map((font) => (
                <button
                  key={font.id}
                  onClick={() => setTheme({ ...theme, font: font.id })}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    theme.font === font.id
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className={`text-lg mb-1 ${font.class}`}>Aa Bb Cc</p>
                  <p className="text-sm text-muted-foreground">{font.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Layout */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Layout className="w-4 h-4" />
              Layout Style
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {layouts.map((layout) => (
                <button
                  key={layout.id}
                  onClick={() => setTheme({ ...theme, layout: layout.id })}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    theme.layout === layout.id
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="font-medium mb-1">{layout.name}</p>
                  <p className="text-xs text-muted-foreground">{layout.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Accent Color */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Accent Color</Label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {accentColors.map((color) => (
                <button
                  key={color.id}
                  onClick={() => setTheme({ ...theme, accentColor: color.id })}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    theme.accentColor === color.id
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div
                    className="h-12 rounded-md mb-2"
                    style={{ backgroundColor: color.color }}
                  />
                  <p className="text-xs font-medium text-center">{color.name}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex gap-3">
          <Button variant="outline" onClick={handleCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1">
            Save Theme
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};
