import { useState, useRef, useEffect, useMemo } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Download, X, Crown, Shield, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useThemePreview, mergeTheme } from "@/hooks/use-theme-preview";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import html2canvas from "html2canvas";
import heritageFrostBg from "@/assets/theme-heritage-frost.jpg";
import liquidGlassBg from "@/assets/theme-liquid-glass.jpg";

// TEMP_MARKER_RESTORE — full file follows in next commits if truncated
export function NFTProfileCard({ userId, onClose }: { userId: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 text-white p-6">
      <div className="text-center space-y-3">
        <p className="text-sm text-white/70">Collectible card is updating…</p>
        <button type="button" onClick={onClose} className="underline text-sm">Close</button>
      </div>
    </div>
  );
}
