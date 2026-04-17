// Forex Tools Hub — one page that houses all trader utilities.
import { FloatingNav } from "@/components/FloatingNav";
import { GlassIcon } from "@/components/GlassIcon";
import { Wrench } from "lucide-react";
import { TraderToolkit } from "@/components/forex/TraderToolkit";
import { CurrencyStrengthMeter } from "@/components/forex/CurrencyStrengthMeter";
import { CorrelationMatrix } from "@/components/forex/CorrelationMatrix";
import { SessionClock } from "@/components/forex/SessionClock";
import { SentimentIndex } from "@/components/forex/SentimentIndex";
import { RiskLockout } from "@/components/forex/RiskLockout";
import { EconomicCalendar } from "@/components/forex/EconomicCalendar";
import { Watchlist } from "@/components/forex/Watchlist";

const ForexTools = () => {
  return (
    <div className="min-h-screen bg-background">
      <FloatingNav />
      <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-16 pb-20">
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <GlassIcon icon={Wrench} size="sm" tint="gold" />
            <h1 className="text-lg sm:text-2xl font-bold">Forex Tools</h1>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            Every pro tool a forex trader needs — in one place
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <TraderToolkit />
          <CurrencyStrengthMeter />
          <SessionClock />
          <SentimentIndex />
          <RiskLockout />
          <Watchlist />
          <div className="lg:col-span-2">
            <CorrelationMatrix />
          </div>
          <div className="lg:col-span-2">
            <EconomicCalendar />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForexTools;
