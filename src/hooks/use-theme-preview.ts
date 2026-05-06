import { useEffect, useState } from "react";
import type { ProfileTheme } from "@/components/ProfileThemeCustomizer";

/**
 * Subscribes to the global `blackpal:theme-preview` event emitted by the
 * customizer. Returns whichever theme is currently being previewed (or null
 * when nothing is being previewed — i.e. modal closed/saved/cancelled).
 *
 * On save/cancel the customizer dispatches `null` which immediately reverts
 * every consumer back to the persisted theme without a page refresh.
 */
export function useThemePreview(): ProfileTheme | null {
  const [preview, setPreview] = useState<ProfileTheme | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ProfileTheme | null>).detail;
      setPreview(detail ?? null);
    };
    window.addEventListener("blackpal:theme-preview", handler);
    return () => window.removeEventListener("blackpal:theme-preview", handler);
  }, []);

  return preview;
}

/** Merge a saved theme with the in-flight preview (preview wins per field). */
export function mergeTheme<T extends Partial<ProfileTheme>>(
  saved: T,
  preview: ProfileTheme | null
): ProfileTheme {
  return {
    background: preview?.background ?? saved.background ?? "default",
    font: preview?.font ?? saved.font ?? "inter",
    layout: preview?.layout ?? saved.layout ?? "standard",
    accentColor: preview?.accentColor ?? saved.accentColor ?? "purple",
  };
}
