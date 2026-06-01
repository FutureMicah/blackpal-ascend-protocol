import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Maps theme.background id -> { backgroundCSS, accent override (optional), font, body class }
// Applies the user's saved profile theme to <html> so it themes the WHOLE app,
// not just the public profile page. Listens to live preview events too.
type Theme = {
  background?: string | null;
  font?: string | null;
  layout?: string | null;
  accentColor?: string | null;
  customPatternUrl?: string | null;
};

const FONT_STACK: Record<string, string> = {
  inter: "'Inter Tight', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  playfair: "'Playfair Display', Georgia, serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
  raleway: "Raleway, -apple-system, BlinkMacSystemFont, sans-serif",
};

// HSL accent presets (hue saturation lightness — matches index.css convention)
const ACCENT_HSL: Record<string, string> = {
  purple: "280 100% 70%",
  blue:   "217 91% 60%",
  green:  "142 71% 45%",
  orange: "25 95% 53%",
  pink:   "330 81% 60%",
  cyan:   "189 85% 43%",
  amber:  "38 92% 50%",
  earth:  "28 65% 45%",
};

// Background gradients applied to the document body
const BG_GRADIENTS: Record<string, string> = {
  default: "",
  dark: "linear-gradient(180deg, #0a0a0f 0%, #000000 100%)",
  "heritage-frost": "linear-gradient(160deg, #e0f0ff 0%, #ffffff 50%, #fff3d6 100%)",
  "liquid-glass": "linear-gradient(160deg, #c9e4ff 0%, #ffffff 50%, #d8dee9 100%)",
  "royal-blue": "radial-gradient(circle at 20% 10%, hsl(220 80% 22%), transparent 60%), linear-gradient(160deg, hsl(220 60% 8%), hsl(215 70% 14%))",
  "royal-purple": "radial-gradient(circle at 0% 0%, hsl(280 70% 20%), transparent 60%), linear-gradient(160deg, hsl(270 50% 8%), hsl(280 60% 14%))",
  emerald: "radial-gradient(circle at 0% 0%, hsl(160 60% 18%), transparent 60%), linear-gradient(160deg, hsl(160 40% 7%), hsl(150 50% 12%))",
  "royal-gold": "radial-gradient(circle at 0% 0%, hsl(38 60% 18%), transparent 60%), linear-gradient(160deg, hsl(30 40% 7%), hsl(35 50% 12%))",
  rose: "radial-gradient(circle at 0% 0%, hsl(340 60% 20%), transparent 60%), linear-gradient(160deg, hsl(345 40% 8%), hsl(335 50% 14%))",
  purple: "linear-gradient(135deg, #2a1257 0%, #1a1450 100%)",
  ocean: "linear-gradient(135deg, #0a2540 0%, #0e3a4d 100%)",
  sunset: "linear-gradient(135deg, #4a1d10 0%, #6b1e10 100%)",
  forest: "linear-gradient(135deg, #0e2a18 0%, #08291f 100%)",
  // African aesthetic presets (per user request — matches uploaded references)
  "afro-savanna": "radial-gradient(circle at 50% 100%, #ffb04a 0%, #f06a1f 25%, #1a0a05 80%)",
  "afro-tribal": "linear-gradient(160deg, #1a0f08 0%, #3a1f0c 50%, #5c2e10 100%)",
  "afro-clay": "linear-gradient(160deg, #f5e9d4 0%, #e8c79a 50%, #b97840 100%)",
  "afro-ankara": "linear-gradient(135deg, #0a2818 0%, #c47a2b 50%, #1a0a05 100%)",
  "afro-adinkra": "radial-gradient(circle at 20% 0%, #2a1208 0%, transparent 60%), linear-gradient(160deg, #120804 0%, #2a1408 50%, #4a2410 100%)",
  "afro-kente": "linear-gradient(135deg, #0a1f12 0%, #1a3c1f 40%, #3a1808 100%)",
  "afro-petroglyph": "linear-gradient(160deg, #f3e6cf 0%, #e8c79a 55%, #b97840 100%)",
};

const AFRO_BACKGROUNDS = new Set(["afro-savanna", "afro-tribal", "afro-clay", "afro-ankara", "afro-adinkra", "afro-kente", "afro-petroglyph"]);
// Map each preset to its motif variant class
const AFRO_VARIANT_CLASS: Record<string, string> = {
  "afro-adinkra": "theme-afro-adinkra",
  "afro-kente": "theme-afro-kente",
  "afro-petroglyph": "theme-afro-petroglyph",
};

function applyTheme(t: Theme | null) {
  const html = document.documentElement;
  const body = document.body;

  let appliedBg = "";
  let appliedFont = "";
  let appliedAccent: string | null = null;

  if (!t || !t.background) {
    body.style.background = "";
    body.style.fontFamily = "";
    html.style.removeProperty("--primary");
    html.style.removeProperty("--ring");
    html.style.removeProperty("--accent");
    html.classList.remove("theme-afro", "theme-afro-adinkra", "theme-afro-kente", "theme-afro-petroglyph");
  } else {
    const bg = BG_GRADIENTS[t.background] ?? "";
    body.style.background = bg;
    body.style.backgroundAttachment = bg ? "fixed" : "";
    appliedBg = bg;

    const font = t.font ? FONT_STACK[t.font] : null;
    body.style.fontFamily = font || "";
    appliedFont = font || "";

    if (t.accentColor && ACCENT_HSL[t.accentColor]) {
      html.style.setProperty("--primary", ACCENT_HSL[t.accentColor]);
      html.style.setProperty("--ring", ACCENT_HSL[t.accentColor]);
      html.style.setProperty("--accent", ACCENT_HSL[t.accentColor]);
      html.style.setProperty("--icon-color", ACCENT_HSL[t.accentColor]);
      appliedAccent = ACCENT_HSL[t.accentColor];
    } else {
      html.style.removeProperty("--primary");
      html.style.removeProperty("--ring");
      html.style.removeProperty("--accent");
      html.style.removeProperty("--icon-color");
    }

    const isAfro = AFRO_BACKGROUNDS.has(t.background);
    html.classList.toggle("theme-afro", isAfro);
    // Remove any prior variant class, then add the one for this preset (if any)
    html.classList.remove("theme-afro-adinkra", "theme-afro-kente", "theme-afro-petroglyph");
    const variant = AFRO_VARIANT_CLASS[t.background];
    if (variant) html.classList.add(variant);
  }

  // Expose current state for diagnostics + dispatch event
  const state = {
    theme: t || null,
    background: appliedBg,
    font: appliedFont,
    accent: appliedAccent,
    appliedAt: new Date().toISOString(),
  };
  (window as any).__BLACKPAL_THEME__ = state;
  window.dispatchEvent(new CustomEvent("blackpal:theme-applied", { detail: state }));
}

export const GlobalThemeProvider = () => {
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { applyTheme(null); return; }
      const { data } = await supabase
        .from("profiles")
        .select("theme_background, theme_font, theme_layout, theme_accent_color")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled || !data) return;
      applyTheme({
        background: data.theme_background,
        font: data.theme_font,
        layout: data.theme_layout,
        accentColor: data.theme_accent_color,
      });
    };

    load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => {
        void load();
      }, 0);
    });

    // Live preview from ProfileThemeCustomizer
    const onPreview = (e: Event) => {
      const detail = (e as CustomEvent<Theme | null>).detail;
      if (detail) {
        applyTheme(detail);
      } else {
        load(); // revert to saved theme
      }
    };
    window.addEventListener("blackpal:theme-preview", onPreview);

    // Listen for our own save broadcast
    const onSaved = () => load();
    window.addEventListener("blackpal:theme-saved", onSaved);

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      window.removeEventListener("blackpal:theme-preview", onPreview);
      window.removeEventListener("blackpal:theme-saved", onSaved);
    };
  }, []);

  return null;
};
