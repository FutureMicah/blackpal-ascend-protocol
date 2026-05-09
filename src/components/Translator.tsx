import { useEffect, useRef, useState } from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Lightweight on-page translator using Google Translate's free element widget.
 * No backend, no key. Works as a popover next to the page.
 */
declare global {
  interface Window {
    google?: any;
    googleTranslateElementInit?: () => void;
  }
}

let scriptInjected = false;

export const Translator = () => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    if (scriptInjected) {
      // Re-render the widget into our container if needed
      try {
        if (window.google?.translate?.TranslateElement && containerRef.current && !containerRef.current.hasChildNodes()) {
          new window.google.translate.TranslateElement(
            { pageLanguage: "en", autoDisplay: false },
            containerRef.current
          );
        }
      } catch {}
      return;
    }
    scriptInjected = true;
    window.googleTranslateElementInit = () => {
      try {
        if (containerRef.current) {
          new window.google!.translate.TranslateElement(
            { pageLanguage: "en", autoDisplay: false },
            containerRef.current
          );
        }
      } catch {}
    };
    const s = document.createElement("script");
    s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.async = true;
    document.body.appendChild(s);
  }, [open]);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 px-2.5 rounded-full border-primary/30 text-[11px]"
        onClick={() => setOpen((v) => !v)}
        aria-label="Translate page"
      >
        <Languages className="w-3.5 h-3.5" />
        <span>Translate</span>
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 z-[1000] rounded-xl border border-border bg-card shadow-2xl p-3 min-w-[220px]">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            Pick a language
          </div>
          <div ref={containerRef} id="google_translate_element" />
          <p className="text-[10px] text-muted-foreground mt-2">
            Translation by Google. Some technical terms stay in English.
          </p>
        </div>
      )}
    </div>
  );
};
