import { motion } from "framer-motion";
import { FloatingGlassPills } from "@/components/FloatingGlassPills";
import { useState } from "react";
import { Copy, Check, Code2, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const GlobeEmbed = () => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const iframeCode = `<iframe 
  src="https://blackpal-ascend-protocol.lovable.app/globe" 
  width="800" 
  height="600" 
  style="border:none;background:transparent;"
  allowtransparency="true">
</iframe>`;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied!", description: `${label} copied to clipboard` });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Full-screen pills hero — no text */}
      <div className="relative min-h-screen">
        <FloatingGlassPills className="w-full h-screen" />
      </div>

      {/* Embed Code Section */}
      <div className="container max-w-3xl mx-auto px-4 py-24 space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 text-primary mb-4">
            <Globe2 className="w-5 h-5" />
            <span className="text-sm tracking-widest uppercase font-mono">Add to Your Site</span>
          </div>
          <h2 className="text-3xl font-bold mb-4">Embed the Animation</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Add this cinematic 3D glass animation to any website with a single line of code.
          </p>
        </motion.div>

        {/* iFrame Embed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-primary" />
              <h3 className="font-semibold">iframe Embed</h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(iframeCode, "iframe code")}
              className="gap-2"
            >
              {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              Copy
            </Button>
          </div>
          <pre className="bg-background/60 rounded-xl p-4 text-xs text-primary/80 font-mono overflow-x-auto border border-border/40">
            {iframeCode}
          </pre>
        </motion.div>

        {/* Live Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card p-6 space-y-4"
        >
          <h3 className="font-semibold flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-primary" />
            Live Preview
          </h3>
          <div className="rounded-xl overflow-hidden border border-border/40 bg-background/40">
            <div className="h-[400px]">
              <FloatingGlassPills />
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Fully transparent background — adapts to any site color scheme
          </p>
        </motion.div>

        {/* Customization options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card p-6 space-y-4"
        >
          <h3 className="font-semibold">Customization Options</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Size", desc: "Adjust width/height freely" },
              { label: "Background", desc: "Transparent — works on any bg" },
              { label: "Animated", desc: "Physics-based glass motion" },
            ].map((opt) => (
              <div key={opt.label} className="rounded-xl border border-border/40 bg-background/30 p-4">
                <p className="text-sm font-semibold text-primary mb-1">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default GlobeEmbed;
