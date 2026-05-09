import { useEffect, useRef, useState } from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

declare global {
  interface Window {
    google?: any;
    googleTranslateElementInit?: () => void;
  }
}

const STORAGE_ENABLED = "translator_enabled";
const STORAGE_LANG = "translator_lang";

let scriptInjected = false;

const clearGoogleCookies = () => {
  // Force Google Translate back to source language
  document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" + window.location.hostname;
};

interface Props {
  variant?: "inline" | "compact";
}

export const Translator = ({ variant = "compact" }: Props) => {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_ENABLED) !== "false"; } catch { return true; }
  });
  const [lang, setLang] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_LANG) || "en"; } catch { return "en"; }
  });
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Persist + react to enable/disable
  useEffect(() => {
    try { localStorage.setItem(STORAGE_ENABLED, String(enabled)); } catch {}
    if (!enabled) {
      clearGoogleCookies();
      setLang("en");
      try { localStorage.setItem(STORAGE_LANG, "en"); } catch {}
      // Reload to fully clear an active translation
      if (document.querySelector(".goog-te-banner-frame")) {
        window.location.reload();
      }
    }
  }, [enabled]);

  // Watch the Google select for language changes
  useEffect(() => {
    const handler = () => {
      const sel = document.querySelector<HTMLSelectElement>(".goog-te-combo");
      if (sel?.value) {
        setLang(sel.value);
        try { localStorage.setItem(STORAGE_LANG, sel.value); } catch {}
      }
    };
    document.addEventListener("change", handler, true);
    return () => document.removeEventListener("change", handler, true);
  }, []);

  // Mount Google widget
  useEffect(() => {
    if (!open || !enabled) return;
    if (scriptInjected) {
      try {
        if (window.google?.translate?.TranslateElement && containerRef.current && !containerRef.current.hasChildNodes()) {
          new window.google.translate.TranslateElement({ pageLanguage: "en", autoDisplay: false }, containerRef.current);
        }
      } catch {}
      return;
    }
    scriptInjected = true;
    window.googleTranslateElementInit = () => {
      try {
        if (containerRef.current) {
          new window.google!.translate.TranslateElement({ pageLanguage: "en", autoDisplay: false }, containerRef.current);
        }
      } catch {}
    };
    const s = document.createElement("script");
    s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.async = true;
    document.body.appendChild(s);
  }, [open, enabled]);

  const langCode = (lang || "en").slice(0, 2).toUpperCase();

  return (
    <div className={variant === "inline" ? "w-full" : "relative"}>
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 px-2.5 rounded-full border-primary/30 text-[11px]"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Translate page (current ${langCode})`}
        data-testid="translator-trigger"
      >
        <Languages className="w-3.5 h-3.5" />
        <span>Translate</span>
        <span
          className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-semibold text-[9px] tracking-wider"
          data-testid="translator-lang-chip"
        >
          {langCode}
        </span>
      </Button>
      {open && (
        <div
          className={
            variant === "inline"
              ? "mt-2 rounded-xl border border-border bg-card shadow-2xl p-3"
              : "absolute right-0 mt-2 z-[1000] rounded-xl border border-border bg-card shadow-2xl p-3 min-w-[240px]"
          }
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Translator
            </span>
            <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Switch
                checked={enabled}
                onCheckedChange={setEnabled}
                aria-label="Enable or disable translator"
                data-testid="translator-toggle"
              />
              <span>{enabled ? "On" : "Off"}</span>
            </label>
          </div>
          {enabled ? (
            <>
              <div ref={containerRef} id="google_translate_element" />
              <p className="text-[10px] text-muted-foreground mt-2">
                Translation by Google. Some technical words stay in English.
              </p>
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Translator is off. Turn it on to pick a language.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
