import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type EnergyMode = "pulse" | "silent";

interface Ctx {
  mode: EnergyMode;
  silent: boolean;
  setMode: (m: EnergyMode) => Promise<void>;
  toggle: () => Promise<void>;
}

const EnergyModeContext = createContext<Ctx>({
  mode: "pulse",
  silent: false,
  setMode: async () => {},
  toggle: async () => {},
});

const STORAGE_KEY = "blackpal:energy-mode";

function applyToDom(mode: EnergyMode) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.energy = mode;
  document.documentElement.style.setProperty(
    "--energy-anim-scale",
    mode === "silent" ? "0" : "1"
  );
  window.dispatchEvent(new CustomEvent("energy-mode-change", { detail: mode }));
}

export const EnergyModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<EnergyMode>(() => {
    if (typeof window === "undefined") return "pulse";
    return (localStorage.getItem(STORAGE_KEY) as EnergyMode) || "pulse";
  });

  // Apply DOM attribute immediately
  useEffect(() => {
    applyToDom(mode);
  }, [mode]);

  // Load authoritative value from profile on auth change
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("energy_mode")
        .eq("id", auth.user.id)
        .maybeSingle();
      const remote = (data as any)?.energy_mode as EnergyMode | undefined;
      if (!cancelled && remote && remote !== mode) {
        localStorage.setItem(STORAGE_KEY, remote);
        setModeState(remote);
      }
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s?.user) load();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setMode = useCallback(async (m: EnergyMode) => {
    setModeState(m);
    localStorage.setItem(STORAGE_KEY, m);
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      await supabase
        .from("profiles")
        .update({ energy_mode: m } as any)
        .eq("id", auth.user.id);
    }
  }, []);

  const toggle = useCallback(
    () => setMode(mode === "pulse" ? "silent" : "pulse"),
    [mode, setMode]
  );

  return (
    <EnergyModeContext.Provider value={{ mode, silent: mode === "silent", setMode, toggle }}>
      {children}
    </EnergyModeContext.Provider>
  );
};

export const useEnergyMode = () => useContext(EnergyModeContext);
