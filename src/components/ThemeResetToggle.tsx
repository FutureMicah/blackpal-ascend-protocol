import { useEffect, useState } from "react";
import { Palette, RotateCcw } from "lucide-react";

const STORAGE_KEY = "blackpal-theme-reset";

/**
 * Floating bottom-left chip that lets the user instantly collapse all
 * per-page rebrand skins back to the canonical purple BLACKPAL look.
 * Persisted to localStorage so the choice survives reloads.
 */
export const ThemeResetToggle = () => {
  const [reset, setReset] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const v = localStorage.getItem(STORAGE_KEY) === "1";
    setReset(v);
    document.body.classList.toggle("theme-reset-purple", v);
  }, []);

  const toggle = () => {
    const next = !reset;
    setReset(next);
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    document.body.classList.toggle("theme-reset-purple", next);
  };

  return (
    <div className="fixed bottom-20 left-3 z-[60] flex items-center gap-2 no-rebrand">
      {open && (
        <button
          onClick={toggle}
          className="rounded-full bg-black/70 backdrop-blur border border-primary/40 px-3 py-2 text-[11px] font-medium text-white shadow-[0_0_20px_hsl(258_90%_60%/0.4)] hover:bg-primary/20"
        >
          {reset ? "Restore page skins" : "Reset all to purple"}
        </button>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="h-9 w-9 rounded-full bg-black/70 backdrop-blur border border-primary/40 grid place-items-center text-white shadow-[0_0_18px_hsl(258_90%_60%/0.45)] hover:bg-primary/20"
        aria-label="Theme reset"
        title="Theme reset"
      >
        {reset ? <RotateCcw className="h-4 w-4" /> : <Palette className="h-4 w-4" />}
      </button>
    </div>
  );
};

export default ThemeResetToggle;
