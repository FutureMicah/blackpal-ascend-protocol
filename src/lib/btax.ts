// BTAX is the platform-wide virtual currency.
// Default conversion: 1 BTAX = ₦100 (matches academy_settings.btax_to_naira_rate).
// Source of truth = academy_settings.btax_to_naira_rate. Cache locally for instant UI math.
import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_BTAX_TO_NAIRA = 100;

let cached: number | null = null;

export async function getBtaxToNairaRate(): Promise<number> {
  if (cached != null) return cached;
  try {
    const { data } = await supabase
      .from("academy_settings")
      .select("btax_to_naira_rate")
      .limit(1)
      .maybeSingle();
    cached = Number(data?.btax_to_naira_rate ?? DEFAULT_BTAX_TO_NAIRA) || DEFAULT_BTAX_TO_NAIRA;
  } catch {
    cached = DEFAULT_BTAX_TO_NAIRA;
  }
  return cached;
}

export function nairaToBtax(naira: number, rate: number = DEFAULT_BTAX_TO_NAIRA) {
  if (!rate || rate <= 0) return 0;
  return Math.round((Number(naira) / rate) * 100) / 100;
}

export function btaxToNaira(btax: number, rate: number = DEFAULT_BTAX_TO_NAIRA) {
  return Math.round(Number(btax) * rate * 100) / 100;
}

export function formatBtax(amount: number) {
  return `${Number(amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} BTAX`;
}

export function formatNaira(amount: number) {
  return `₦${Number(amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
