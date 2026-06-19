import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FloatingNav } from "@/components/FloatingNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ShoppingBag, Zap, Sparkles, Wrench, Ticket, Wallet, Send } from "lucide-react";
import { BtaxSendDialog } from "@/components/btax/BtaxSendDialog";
import { BtaxTokenomicsPanel } from "@/components/btax/BtaxTokenomicsPanel";
import { PurchaseReceiptDialog, type ReceiptData } from "@/components/btax/PurchaseReceiptDialog";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Item {
  id: string; slug: string; name: string; description: string | null;
  category: "boost" | "cosmetic" | "service" | "card";
  btax_price: number; image_url: string | null; payload: any;
  stock: number | null; per_user_limit: number | null; sort_order: number;
}

const CATEGORIES = [
  { key: "boost",    label: "Boosts",   icon: Zap,       tint: "text-amber-400" },
  { key: "cosmetic", label: "Cosmetics", icon: Sparkles, tint: "text-purple-400" },
  { key: "service",  label: "Services",  icon: Wrench,   tint: "text-sky-400" },
  { key: "card",     label: "Cards",     icon: Ticket,   tint: "text-emerald-400" },
] as const;

export default function Marketplace() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [cat, setCat] = useState<string>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);
    const [iRes, wRes] = await Promise.all([
      (supabase as any).from("marketplace_items").select("*").eq("is_active", true).order("category").order("sort_order"),
      user ? supabase.from("wallets").select("btax_balance").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    setItems((iRes.data || []) as Item[]);
    setBalance(Number((wRes as any).data?.btax_balance ?? 0));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const buy = async (item: Item) => {
    if (balance < item.btax_price) { toast.error("Not enough BTAX"); return; }
    setBusy(item.id);
    const { error } = await (supabase as any).rpc("marketplace_purchase", { p_item_id: item.id });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Purchased ${item.name}`);
    load();
  };

  const filtered = cat === "all" ? items : items.filter(i => i.category === cat);

  return (
    <div className="min-h-screen bg-background">
      <FloatingNav />
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-16 sm:py-24">
        <div className="flex items-end justify-between gap-2 mb-4 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground flex items-center gap-1.5">
              <ShoppingBag className="w-3 h-3" /> BTAX Marketplace
            </p>
            <h1 className="text-xl sm:text-2xl font-bold">Spend your BTAX</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-xs">
              <Wallet className="w-3.5 h-3.5 text-primary" />
              <span className="font-mono font-bold">{balance.toLocaleString()}</span>
              <span className="text-muted-foreground">BTAX</span>
            </div>
            <Button size="sm" onClick={() => setSendOpen(true)} className="h-8 text-xs">
              <Send className="w-3.5 h-3.5 mr-1" /> Send
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            onClick={() => setCat("all")}
            className={`shrink-0 h-8 px-3 rounded-full text-[11px] font-semibold border transition-colors ${cat === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card/60 border-border text-muted-foreground hover:text-foreground"}`}
          >All</button>
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => setCat(c.key)}
              className={`shrink-0 h-8 px-3 rounded-full text-[11px] font-semibold border transition-colors flex items-center gap-1.5 ${cat === c.key ? "bg-primary text-primary-foreground border-primary" : "bg-card/60 border-border text-muted-foreground hover:text-foreground"}`}
            >
              <c.icon className={cn("w-3 h-3", cat === c.key ? "" : c.tint)} /> {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed py-12 text-center text-xs text-muted-foreground">No items in this category yet.</Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((item, i) => {
              const meta = CATEGORIES.find(c => c.key === item.category)!;
              const Icon = meta.icon;
              const canAfford = balance >= item.btax_price;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className="p-3 h-full flex flex-col gap-2 border-border hover:border-primary/40 transition-colors">
                    <div className="aspect-square rounded-lg bg-gradient-to-br from-muted/50 to-muted/20 flex items-center justify-center overflow-hidden relative">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <Icon className={cn("w-10 h-10", meta.tint)} />
                      )}
                      <Badge variant="outline" className="absolute top-1.5 left-1.5 text-[8px] capitalize bg-background/80 backdrop-blur-sm">{item.category}</Badge>
                      {item.stock !== null && item.stock <= 5 && (
                        <Badge variant="destructive" className="absolute top-1.5 right-1.5 text-[8px]">
                          {item.stock === 0 ? "Sold out" : `${item.stock} left`}
                        </Badge>
                      )}
                    </div>
                    <div className="flex-1 min-h-0">
                      <p className="text-xs font-semibold truncate">{item.name}</p>
                      {item.description && <p className="text-[10px] text-muted-foreground line-clamp-2">{item.description}</p>}
                    </div>
                    <div className="flex items-center justify-between gap-1.5">
                      <span className={cn("text-xs font-mono font-bold", canAfford ? "text-foreground" : "text-destructive")}>
                        {item.btax_price} <span className="text-[9px] text-muted-foreground">BTAX</span>
                      </span>
                      <Button
                        size="sm"
                        className="h-7 text-[10px] px-2.5"
                        disabled={busy === item.id || !canAfford || item.stock === 0}
                        onClick={() => buy(item)}
                      >
                        {busy === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Buy"}
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      <BtaxSendDialog open={sendOpen} onOpenChange={setSendOpen} onSent={load} />
    </div>
  );
}
