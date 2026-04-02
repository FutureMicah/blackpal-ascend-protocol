import { useEffect, useRef, memo } from "react";

interface TradingViewWidgetProps {
  widgetType: "chart" | "ticker" | "heatmap" | "screener" | "crossrates" | "calendar" | "miniChart" | "symbolOverview" | "symbolInfo" | "etfHeatmap" | "stockHeatmap" | "cryptoHeatmap" | "forexHeatmap" | "news" | "watchlist";
  symbol?: string;
  width?: string;
  height?: number;
  theme?: "dark" | "light";
}

const widgetScripts: Record<string, string> = {
  chart: "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js",
  ticker: "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js",
  heatmap: "https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js",
  screener: "https://s3.tradingview.com/external-embedding/embed-widget-screener.js",
  crossrates: "https://s3.tradingview.com/external-embedding/embed-widget-forex-cross-rates.js",
  calendar: "https://s3.tradingview.com/external-embedding/embed-widget-events.js",
  miniChart: "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js",
  symbolOverview: "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js",
  symbolInfo: "https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js",
  etfHeatmap: "https://s3.tradingview.com/external-embedding/embed-widget-etf-heatmap.js",
  stockHeatmap: "https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js",
  cryptoHeatmap: "https://s3.tradingview.com/external-embedding/embed-widget-crypto-coins-heatmap.js",
  forexHeatmap: "https://s3.tradingview.com/external-embedding/embed-widget-forex-heat-map.js",
  news: "https://s3.tradingview.com/external-embedding/embed-widget-timeline.js",
  watchlist: "https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js",
};

function getConfig(type: string, symbol: string, theme: string, height: number) {
  const base = { colorTheme: theme, isTransparent: true, locale: "en", autosize: true };
  
  switch (type) {
    case "chart":
      return JSON.stringify({ ...base, symbol, interval: "15", style: "1", timezone: "Etc/UTC", allow_symbol_change: true, hide_side_toolbar: false, details: true, hotlist: true, calendar: true, studies: ["RSI@tv-basicstudies", "MASimple@tv-basicstudies"], width: "100%", height });
    case "ticker":
      return JSON.stringify({ symbols: [
        { proName: "FX:EURUSD", title: "EUR/USD" }, { proName: "FX:GBPUSD", title: "GBP/USD" },
        { proName: "FX:USDJPY", title: "USD/JPY" }, { proName: "BITSTAMP:BTCUSD", title: "BTC/USD" },
        { proName: "BITSTAMP:ETHUSD", title: "ETH/USD" }, { proName: "TVC:GOLD", title: "Gold" },
        { proName: "FOREXCOM:NSXUSD", title: "NAS100" }, { proName: "FOREXCOM:DJI", title: "US30" },
      ], showSymbolLogo: true, ...base, displayMode: "adaptive" });
    case "crossrates":
      return JSON.stringify({ ...base, currencies: ["EUR","USD","GBP","JPY","AUD","CAD","NZD","CHF"], width: "100%", height });
    case "calendar":
      return JSON.stringify({ ...base, width: "100%", height, importanceFilter: "-1,0,1" });
    case "screener":
      return JSON.stringify({ ...base, width: "100%", height, defaultColumn: "overview", defaultScreen: "general", market: "forex", showToolbar: true });
    case "heatmap":
    case "stockHeatmap":
      return JSON.stringify({ ...base, exchanges: [], dataSource: "SPX500", grouping: "sector", blockSize: "market_cap_basic", blockColor: "change", hasTopBar: true, width: "100%", height });
    case "cryptoHeatmap":
      return JSON.stringify({ ...base, dataSource: "Crypto", blockSize: "market_cap_calc", blockColor: "change", hasTopBar: true, width: "100%", height });
    case "forexHeatmap":
      return JSON.stringify({ ...base, currencies: ["EUR","USD","GBP","JPY","AUD","CAD","NZD","CHF"], width: "100%", height });
    case "etfHeatmap":
      return JSON.stringify({ ...base, dataSource: "AllUSEtf", blockSize: "aum_basic", blockColor: "change", grouping: "asset_class", hasTopBar: true, width: "100%", height });
    case "miniChart":
      return JSON.stringify({ ...base, symbol, dateRange: "1D", width: "100%", height, noTimeScale: false, chartOnly: false });
    case "symbolOverview":
      return JSON.stringify({ ...base, symbols: [
        ["FX:EURUSD|1D"], ["FX:GBPUSD|1D"], ["FX:USDJPY|1D"], ["BITSTAMP:BTCUSD|1D"], ["TVC:GOLD|1D"],
      ], chartOnly: false, width: "100%", height, showVolume: false, showMA: true, hideDateRanges: false, hideMarketStatus: false, scalePosition: "right", scaleMode: "Normal", fontFamily: "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif" });
    case "symbolInfo":
      return JSON.stringify({ ...base, symbol, width: "100%", height: 180 });
    case "news":
      return JSON.stringify({ ...base, feedMode: "all_symbols", width: "100%", height });
    case "watchlist":
      return JSON.stringify({ ...base, tabs: [
        { title: "Forex", symbols: [
          { s: "FX:EURUSD" }, { s: "FX:GBPUSD" }, { s: "FX:USDJPY" }, { s: "FX:AUDUSD" }, { s: "FX:USDCAD" }, { s: "FX:EURGBP" }, { s: "FX:NZDUSD" },
        ]},
        { title: "Crypto", symbols: [
          { s: "BITSTAMP:BTCUSD" }, { s: "BITSTAMP:ETHUSD" }, { s: "BINANCE:SOLUSDT" }, { s: "BINANCE:XRPUSDT" },
        ]},
        { title: "Indices", symbols: [
          { s: "FOREXCOM:DJI" }, { s: "FOREXCOM:NSXUSD" }, { s: "TVC:SPX" }, { s: "TVC:UKX" },
        ]},
        { title: "Commodities", symbols: [
          { s: "TVC:GOLD" }, { s: "TVC:SILVER" }, { s: "TVC:USOIL" },
        ]},
      ], showSymbolLogo: true, width: "100%", height, showFloatingTooltip: true });
    default:
      return JSON.stringify(base);
  }
}

function TradingViewWidgetComponent({ widgetType, symbol = "FX:EURUSD", width = "100%", height = 500, theme = "dark" }: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear previous
    container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container";
    wrapper.style.width = width;
    wrapper.style.height = `${height}px`;

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.width = "100%";
    widgetDiv.style.height = "100%";
    wrapper.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = widgetScripts[widgetType] || widgetScripts.chart;
    script.async = true;
    script.innerHTML = getConfig(widgetType, symbol, theme, height);
    wrapper.appendChild(script);

    container.appendChild(wrapper);

    return () => {
      if (container) container.innerHTML = "";
    };
  }, [widgetType, symbol, theme, height, width]);

  return <div ref={containerRef} style={{ width, height: `${height}px` }} />;
}

export const TradingViewWidget = memo(TradingViewWidgetComponent);
