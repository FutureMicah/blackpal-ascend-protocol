import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Receipt, ShoppingBag } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { formatBtax } from "@/lib/btax";

export interface ReceiptData {
  item: string;
  category: string;
  cost: number;
  timestamp: string;
  balanceBefore: number;
  balanceAfter: number;
  txRef?: string;
}

export function PurchaseReceiptDialog({
  open, onOpenChange, receipt,
}: { open: boolean; onOpenChange: (v: boolean) => void; receipt: ReceiptData | null }) {
  if (!receipt) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Receipt className="w-4 h-4 text-primary" /> Purchase Receipt
          </DialogTitle>
        </DialogHeader>
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3">
          <div className="flex flex-col items-center gap-1 py-2">
            <div className="relative">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-emerald-500/40"
                initial={{ scale: 0.6, opacity: 1 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">Purchase confirmed</p>
          </div>

          <div className="rounded-lg border border-dashed border-border bg-card/40 p-3 space-y-1.5 text-xs">
            <Row label="Item">
              <span className="font-semibold flex items-center gap-1"><ShoppingBag className="w-3 h-3 text-muted-foreground" />{receipt.item}</span>
            </Row>
            <Row label="Category"><span className="capitalize">{receipt.category}</span></Row>
            <Row label="Cost"><span className="font-mono text-destructive">-{formatBtax(receipt.cost)}</span></Row>
            <Row label="When"><span className="font-mono text-[10px]">{format(new Date(receipt.timestamp), "PP p")}</span></Row>
            {receipt.txRef && <Row label="Ref"><span className="font-mono text-[10px] truncate max-w-[160px]">{receipt.txRef.slice(0, 12)}…</span></Row>}
          </div>

          <div className="rounded-lg bg-muted/30 p-3 text-xs space-y-1">
            <Row label="Balance before"><span className="font-mono">{formatBtax(receipt.balanceBefore)}</span></Row>
            <Row label="Balance after"><span className="font-mono font-bold text-primary">{formatBtax(receipt.balanceAfter)}</span></Row>
          </div>

          <Button className="w-full h-8 text-xs" onClick={() => onOpenChange(false)}>Done</Button>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
