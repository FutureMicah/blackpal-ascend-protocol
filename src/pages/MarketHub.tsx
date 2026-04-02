import { useState } from "react";
import { FloatingNav } from "@/components/FloatingNav";
import { TradingViewWidget } from "@/components/TradingViewWidget";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  BarChart3, Activity, Globe, TrendingUp, Calendar, Newspaper,
  Grid3X3, Eye, Filter, Flame
} from "lucide-react";

const tabs = [
  { id: "overview", label: "Overview", icon: Eye },
  { id: "charts", label: "Charts", icon: BarChart3 },
  { id: "watchlist", label: "Watchlist", icon: Activity },
  { id: "crossrates", label: "Cross Rates", icon: Grid3X3 },
  { id: "heatmaps", label: "Heatmaps", icon: Flame },
  { id: "screener", label: "Screener", icon: Filter },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "news", label: "News", icon: Newspaper },
];

export default function MarketHub() {
  const [activeSymbol, setActiveSymbol] = useState("FX:EURUSD");

  return (
    <div className="min-h-screen bg-background">
      <FloatingNav />
      
      {/* Ticker Tape */}
      <div className="fixed top-0 left-0 right-0 z-40 h-10 bg-card/90 backdrop-blur-xl border-b border-border">
        <TradingViewWidget widgetType="ticker" height={46} theme="dark" />
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Market Hub</h1>
          <p className="text-muted-foreground text-sm mt-1">Live markets, charts, screeners, and analysis tools</p>
        </motion.div>

        <Tabs defaultValue="overview">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            {tabs.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-1.5 text-xs">
                <tab.icon className="w-3.5 h-3.5" /> {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-xl border border-border overflow-hidden bg-card/30">
                <TradingViewWidget widgetType="symbolOverview" height={500} theme="dark" />
              </div>
              <div className="rounded-xl border border-border overflow-hidden bg-card/30">
                <TradingViewWidget widgetType="watchlist" height={500} theme="dark" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border overflow-hidden bg-card/30">
                <h3 className="text-sm font-semibold p-3 border-b border-border text-muted-foreground uppercase tracking-wider">Forex Heatmap</h3>
                <TradingViewWidget widgetType="forexHeatmap" height={400} theme="dark" />
              </div>
              <div className="rounded-xl border border-border overflow-hidden bg-card/30">
                <h3 className="text-sm font-semibold p-3 border-b border-border text-muted-foreground uppercase tracking-wider">Crypto Heatmap</h3>
                <TradingViewWidget widgetType="cryptoHeatmap" height={400} theme="dark" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="charts">
            <div className="rounded-xl border border-border overflow-hidden bg-card/30">
              <TradingViewWidget widgetType="chart" symbol={activeSymbol} height={650} theme="dark" />
            </div>
            <div className="flex gap-2 mt-4 flex-wrap">
              {["FX:EURUSD", "FX:GBPUSD", "FX:USDJPY", "BITSTAMP:BTCUSD", "TVC:GOLD", "FOREXCOM:NSXUSD", "FOREXCOM:DJI", "BITSTAMP:ETHUSD"].map(sym => (
                <button key={sym} onClick={() => setActiveSymbol(sym)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeSymbol === sym ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                  }`}>
                  {sym.replace("FX:", "").replace("BITSTAMP:", "").replace("TVC:", "").replace("FOREXCOM:", "")}
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="watchlist">
            <div className="rounded-xl border border-border overflow-hidden bg-card/30">
              <TradingViewWidget widgetType="watchlist" height={600} theme="dark" />
            </div>
          </TabsContent>

          <TabsContent value="crossrates">
            <div className="rounded-xl border border-border overflow-hidden bg-card/30">
              <TradingViewWidget widgetType="crossrates" height={550} theme="dark" />
            </div>
          </TabsContent>

          <TabsContent value="heatmaps" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border overflow-hidden bg-card/30">
                <h3 className="text-sm font-semibold p-3 border-b border-border text-muted-foreground uppercase tracking-wider">Forex Heat Map</h3>
                <TradingViewWidget widgetType="forexHeatmap" height={450} theme="dark" />
              </div>
              <div className="rounded-xl border border-border overflow-hidden bg-card/30">
                <h3 className="text-sm font-semibold p-3 border-b border-border text-muted-foreground uppercase tracking-wider">Crypto Heat Map</h3>
                <TradingViewWidget widgetType="cryptoHeatmap" height={450} theme="dark" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border overflow-hidden bg-card/30">
                <h3 className="text-sm font-semibold p-3 border-b border-border text-muted-foreground uppercase tracking-wider">Stock Heat Map</h3>
                <TradingViewWidget widgetType="stockHeatmap" height={450} theme="dark" />
              </div>
              <div className="rounded-xl border border-border overflow-hidden bg-card/30">
                <h3 className="text-sm font-semibold p-3 border-b border-border text-muted-foreground uppercase tracking-wider">ETF Heat Map</h3>
                <TradingViewWidget widgetType="etfHeatmap" height={450} theme="dark" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="screener">
            <div className="rounded-xl border border-border overflow-hidden bg-card/30">
              <TradingViewWidget widgetType="screener" height={600} theme="dark" />
            </div>
          </TabsContent>

          <TabsContent value="calendar">
            <div className="rounded-xl border border-border overflow-hidden bg-card/30">
              <TradingViewWidget widgetType="calendar" height={600} theme="dark" />
            </div>
          </TabsContent>

          <TabsContent value="news">
            <div className="rounded-xl border border-border overflow-hidden bg-card/30">
              <TradingViewWidget widgetType="news" height={600} theme="dark" />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
